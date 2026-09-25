# Admin Login Security — Architecture & Flow

This document explains, end-to-end, how `/admin/*` authentication works in this
app: IP allowlisting, rate limiting, password + TOTP (2FA), WebAuthn passkeys,
passwordless email-code sign-in, every MongoDB collection involved, and the
exact validation order for each request. It reflects the actual code as of
this writing — see the file list at the end for where to look if behavior
ever needs to change.

---

## 1. High-level layers

Every request to `/admin/*` passes through up to four independent security
layers, in this order:

```
Browser request to /admin/*
        │
        ▼
┌───────────────────────────────┐
│ 1. Edge middleware            │  src/proxy.ts (runs on Edge runtime)
│    - IP allowlist gate        │  src/lib/ip-allowlist.ts
│    - Session redirect logic   │
└───────────────────────────────┘
        │ (passed)
        ▼
┌───────────────────────────────┐
│ 2. Auth.js (NextAuth) session │  src/auth.ts / src/auth.config.ts
│    - JWT session cookie check │
└───────────────────────────────┘
        │ (not logged in → /admin/login)
        ▼
┌───────────────────────────────┐
│ 3. Credentials providers      │  src/auth.ts
│    a) password + TOTP         │
│    b) WebAuthn passkey        │
│    c) email one-time code     │
│    each gated by rate limits  │  src/lib/rate-limit.ts
└───────────────────────────────┘
        │ (verified)
        ▼
┌───────────────────────────────┐
│ 4. Session established (JWT)  │
│    → redirect to /admin       │
└───────────────────────────────┘
```

Layers 1 and 2 apply to **every** `/admin/*` page, including the login page
itself (for the IP allowlist) or excluding it (for the session redirect,
obviously). Layer 3 only runs on a real sign-in attempt (`POST` via a Server
Action calling `signIn(...)`).

---

## 2. Layer 1 — Edge middleware: IP allowlist + route protection

**File:** `src/proxy.ts` (registered as the Next.js middleware, `matcher:
["/admin/:path*"]`)

- Runs on the **Edge runtime** — no Node.js APIs, no bcrypt, no filesystem.
  This is why it's built from `authConfig` (`src/auth.config.ts`, providers:
  `[]`) rather than the full `auth.ts` — keeping Node-only code (bcrypt, `fs`)
  out of the Edge bundle entirely.
- **Step A — IP allowlist** (only active if `ADMIN_IP_ALLOWLIST` is set):
  1. Parse the client IP from `CF-Connecting-IP` → `X-Forwarded-For`
     (left-most entry) → `X-Real-IP`, in that priority order
     (`src/lib/client-ip.ts`).
  2. Parse `ADMIN_IP_ALLOWLIST` (comma-separated exact IPs and/or CIDR
     ranges, IPv4 and IPv6) via `src/lib/ip-allowlist.ts`.
  3. If the IP doesn't match any entry (or couldn't be parsed at all — fails
     **closed**), the middleware returns `403 Forbidden` immediately. No
     further logic runs.
  4. If `ADMIN_IP_ALLOWLIST` is empty/unset, this entire step is skipped —
     opt-in only.
- **Step B — session-aware routing** (only reached if Step A passed):
  - `/admin/login` while already logged in → redirect to `/admin`.
  - `/admin/login` while logged out → let it through (renders the login
    page).
  - Any other `/admin/*` path while logged out → redirect to `/admin/login`.
  - Any other `/admin/*` path while logged in → let it through.

> ⚠️ The IP allowlist trusts `X-Forwarded-For`/`CF-Connecting-IP` **only**
> because `docker-compose.yml` binds the app to `127.0.0.1`, forcing all
> traffic through a reverse proxy (nginx/Caddy/Cloudflare Tunnel) that this
> deployment controls and that overwrites (not appends to) those headers.
> Exposing the app directly to the internet without such a proxy would make
> this check trivially bypassable (client-controlled headers).

---

## 3. Layer 2 — Auth.js session

**Files:** `src/auth.config.ts` (shared edge-safe config), `src/auth.ts`
(full config with providers, Node runtime only)

- `session: { strategy: "jwt" }` — no server-side session store; the signed
  JWT cookie itself is the source of truth for "who is logged in."
- `pages.signIn: "/admin/login"` — where Auth.js redirects unauthenticated
  requests (also what `src/proxy.ts` redirects to directly).

---

## 4. Layer 3 — Sign-in providers (the actual credential checks)

All three providers live in `src/auth.ts`, each as a separate NextAuth
`Credentials` provider so their logic (and failure modes) never interfere
with each other. Every provider throws a **custom `CredentialsSignin`
subclass** with a distinct `.code`, which `src/app/admin/login/actions.ts`
reads back to decide exactly what the UI should show (e.g. "show the code
field" vs. "show an error").

| Provider id      | Purpose                              | Custom error codes                                                   |
|------------------|---------------------------------------|------------------------------------------------------------------------|
| `credentials`    | Email + password (+ optional TOTP)    | `rate_limited`, `invalid_credentials`, `totp_required`, `invalid_totp` |
| `webauthn`       | Passkey (biometric / security key)    | `rate_limited`, `webauthn_failed`                                     |
| `email-otp`      | 6-digit code emailed on demand        | `rate_limited`, `invalid_email_otp`                                   |

### 4a. Password + TOTP provider (`authorize` in the default `Credentials`)

Step-by-step, exactly as coded:

1. **Input shape validation** — rejects unless `email` is a string
   containing `"@"`, and `password` is a non-empty string. This guards
   against a NextAuth quirk: a form field missing from `FormData` (e.g. a
   `disabled` `<input>`, or one not yet rendered) is coerced by NextAuth's
   internal serialization into the **literal string `"null"`**, which would
   otherwise pass a naive `typeof === "string"` check. (See §7, "Lessons
   learned," for the two real bugs this caused and fixed.)
2. **Rate-limit check** (before touching bcrypt or the DB at all — a
   locked-out caller gets no password-timing signal whatsoever):
   - `isRateLimited("email:<address>")`
   - `isRateLimited("ip:<client ip>")`
   - If either is true → throw `RateLimitedError` (`code: "rate_limited"`).
3. **Look up the account** — `loadAdminUsers()` reads
   `secrets/admin-users.json` (path overridable via `ADMIN_USERS_FILE`,
   pointed at a Docker secret mount in production) fresh on every call.
4. **Password check** — `bcrypt.compare(password, user?.passwordHash ??
   DUMMY_HASH)`. The dummy hash is compared even for an unknown email so response
   timing can't reveal which emails have admin accounts.
   - On mismatch (or unknown user): record a failed attempt against **both**
     the email and IP keys, throw `InvalidCredentialsError`
     (`code: "invalid_credentials"`).
5. **TOTP check** (only if `user.totpSecret` is set for this account):
   - If `code` isn't exactly 6 digits (`/^\d{6}$/`) — including the first
     submission, where the code field doesn't exist in the DOM yet — throw
     `TotpRequiredError` (`code: "totp_required"`) **without** recording a
     failed attempt (the user hasn't had a chance to enter a code yet).
   - Otherwise decrypt the stored secret (`decryptTotpSecret`, AES-256-GCM,
     key = `ADMIN_SECRETS_KEY`) and verify with `verifyTotpToken` (RFC 6238,
     SHA-1, 6 digits, 30s step, ±1 step drift tolerance, timing-safe
     comparison).
   - On a decrypt failure (misconfigured `ADMIN_SECRETS_KEY` or corrupted
     data) or a wrong code: record a failed attempt against both keys,
     throw `InvalidTotpError` (`code: "invalid_totp"`).
6. **Success** — clear both rate-limit counters, return `{ id, email, name
   }` (all set to the user's email).

### 4b. WebAuthn (passkey) provider (`id: "webauthn"`)

Two-step flow, driven by `src/app/admin/login/actions.ts`:

1. **`getPasskeyLoginOptions()`** (public, unauthenticated Server Action):
   - Builds usernameless authentication options (`buildAuthenticationOptions`
     in `src/lib/webauthn.ts` — no `allowCredentials`, so the browser offers
     any discoverable passkey for this site, including via QR-code/hybrid
     cross-device).
   - Stores the freshly generated challenge in Mongo
     (`storeChallenge({ challenge, purpose: "authentication" })`, **no**
     `email` — see §5) and returns `{ options, nonce }` to the browser.
2. Browser calls `navigator.credentials.get(...)` (via
   `@simplewebauthn/browser`'s `startAuthentication`), user approves with
   Face ID/Touch ID/Windows Hello/security key/phone.
3. **`completePasskeyLogin(nonce, assertionJson)`** calls
   `signIn("webauthn", { nonce, assertion, redirectTo: "/admin" })`, which
   runs this provider's `authorize`:
   1. Validate `nonce`/`assertion` are both strings.
   2. Rate-limit check on `webauthn-ip:<ip>` (before consuming the
      challenge or querying credentials).
   3. `consumeChallenge(nonce, "authentication")` — **one-time use**: this
      does a `findOneAndDelete`, so a captured/replayed nonce can never be
      redeemed twice. Missing/expired → record failed attempt, throw
      `WebauthnFailedError`.
   4. Parse the assertion JSON; extract `assertion.id` (the credential ID
      the browser picked) and look it up via `findCredentialById` in Mongo
      (this is how the app learns **which admin** is signing in — the
      credential ID uniquely maps to one `email`).
   5. Rate-limit check on `email:<that admin's email>` too (defense in
      depth once the identity is known).
   6. `verifyAuthentication(assertion, challenge, credential)` — verifies
      the signature against the stored public key, origin, and RP ID.
   7. On any failure: record failed attempts on both IP and email keys,
      throw `WebauthnFailedError` (`code: "webauthn_failed"`).
   8. On success: persist the new signature counter (replay-attack
      detection for future logins), clear both rate-limit counters, return
      the session identity.

### 4c. Email one-time-code provider (`id: "email-otp"`)

Two-step flow, also in `src/app/admin/login/actions.ts`:

1. **`requestEmailOtpLogin(email)`**:
   - Validates the email shape, rate-limits on `email-otp-send:<email>`
     (send-side limiting is deliberately separate/cheaper than the
     verify-side limiting below, since it must be safely callable from an
     unauthenticated form).
   - Calls `requestEmailOtp(email)` (`src/lib/email-otp.ts`): generates a
     random 6-digit code, stores its **SHA-256 hash** (not the code itself)
     with a 10-minute TTL, overwriting any previous code for that address,
     and emails it via `sendEmail`.
   - Always returns a generic `{ sent: true }` (or a generic failure) —
     never reveals whether the address actually belongs to an admin.
2. **`completeEmailOtpLogin(email, code)`** calls `signIn("email-otp", {
   email, code, redirectTo: "/admin" })`, running this provider's
   `authorize`:
   1. Validate shape, rate-limit on both `email-otp:<email>` and
      `ip:<ip>`.
   2. Look up the account, and **always** call `verifyEmailOtp` (even for
      an unknown email, against a code that can never match) — same
      timing-safety rationale as the bcrypt dummy-hash comparison above.
   3. `verifyEmailOtp` checks the code's SHA-256 hash with a timing-safe
      comparison, enforces a 5-attempt cap (deleting the code outright if
      exceeded), and is one-time-use (deletes on success).
   4. On any failure: record failed attempts, throw `InvalidEmailOtpError`.
   5. On success: clear rate-limit counters, return the session identity.

---

## 5. MongoDB collections

All collections live in the same database (`getDb()` in `src/lib/mongodb.ts`,
connection string `MONGODB_URI`). None of these are pre-created migrations —
each module lazily creates its own index on first use (see §7's note on why
that's now non-fatal if it fails).

| Collection                     | Managed by                     | Purpose                                                                 | Key fields                                                        | TTL / cleanup |
|---------------------------------|---------------------------------|--------------------------------------------------------------------------|---------------------------------------------------------------------|----------------|
| `login_rate_limits`             | `src/lib/rate-limit.ts`         | Failed-attempt counters, keyed generically (`email:...`, `ip:...`, `webauthn-ip:...`, `email-otp:...`, `email-otp-send:...`) | `_id` (the key string), `count`, `expiresAt`                        | TTL index on `expiresAt` (`expireAfterSeconds: 0`) |
| `email_otp_codes`               | `src/lib/email-otp.ts`          | Pending email sign-in codes                                              | `_id` (normalized email), `codeHash` (SHA-256), `attempts`, `expiresAt` | TTL index on `expiresAt` |
| `webauthn_challenges`           | `src/lib/webauthn-challenges.ts`| Short-lived one-time WebAuthn challenges (both registration & login)     | `_id` (random nonce), `challenge`, `purpose` (`"registration"` \| `"authentication"`), `email?` (registration only), `expiresAt` | TTL index on `expiresAt`; also explicitly one-time-use via `findOneAndDelete` regardless of TTL timing |
| `admin_webauthn_credentials`    | `src/lib/webauthn-store.ts`     | Registered passkeys                                                      | `_id` (base64url credential ID), `email`, `publicKey`, `counter`, `transports`, `deviceType`, `backedUp`, `name`, `createdAt` | No TTL (permanent until the admin deletes it) — non-unique index on `email` for lookup speed |

Notes:
- `webauthn_challenges.email` is **only set for registration** challenges
  (ties the challenge to the specific admin who's enrolling a new passkey).
  Authentication (login) challenges are usernameless by design, so `email`
  is correctly `null`/absent there — **this is expected, not a bug.**
- Every `login_rate_limits` key is generic on purpose: one collection
  covers per-account and per-IP throttling across all three providers, just
  with different key prefixes.
- None of these collections use rate-limit-relevant data as the actual admin
  roster — that (`email` + `passwordHash` + optional `totpSecret`) lives in
  `secrets/admin-users.json` on disk (see §6), **not** MongoDB. Only
  passkeys and OTP/rate-limit bookkeeping live in Mongo.

---

## 6. The admin roster file (`secrets/admin-users.json`)

**File:** `src/lib/admin-users.ts` reads this at
`ADMIN_USERS_FILE` (defaults to `secrets/admin-users.json`, and to a Docker
secret mount `/run/secrets/admin_users` in production per
`docker-compose.yml`).

```json
[
  {
    "email": "admin@example.com",
    "passwordHash": "$2b$10$...",      // bcrypt
    "totpSecret": "v1.<iv>.<tag>.<ciphertext>"  // AES-256-GCM, optional
  }
]
```

- `passwordHash` — bcrypt (never plaintext).
- `totpSecret` — **optional**; when present, 2FA is enabled for that
  account. It is the AES-256-GCM-encrypted form of the real base32 TOTP
  seed, encrypted/decrypted with `ADMIN_SECRETS_KEY` (`src/lib/totp.ts`).
  The raw base32 secret is never written to disk.
- Managed via the `npm run admin:create` CLI (interactive; sets password,
  optionally enrolls TOTP via QR code) — not editable through the web UI
  (passkeys are the only auth factor the web UI itself can add/remove, via
  `/admin/security`, precisely because this file is a **read-only** mount
  in production).

---

## 7. Key defensive patterns used throughout (and bugs they came from)

These aren't hypothetical — every one of these was a real, previously-shipped
bug found and fixed during hardening of this flow:

1. **Never trust a bare `typeof x === "string"` check for a value read from
   `formData.get(...)`.** When a Server Action calls
   `signIn("credentials", { email: formData.get("email"), ... })` and that
   field is missing from the submitted `FormData` (because the `<input>`
   had the `disabled` attribute — excluded from submission entirely — or
   simply wasn't rendered yet in a multi-step form), NextAuth's internal
   request serialization coerces the resulting `null` into the **literal
   string `"null"`** (4 characters), which passes a naive `typeof ===
   "string"` check. **Fix:** validate the expected *shape* instead —
   `email.includes("@")`, `password.length > 0`, `/^\d{6}$/.test(code)`.
   This is why `page.tsx` uses `readOnly` (which still submits the value)
   instead of `disabled` on the email/password fields during the 2FA step,
   and why both the initial and TOTP guards in `auth.ts` check shape, not
   just type.
2. **Rate limiting fails OPEN, not closed.** Every function in
   `rate-limit.ts` swallows MongoDB errors and returns `false`/no-op rather
   than throwing — a database outage must never lock every admin out.
3. **Index creation is best-effort, never a hard dependency.** All four
   `ensureIndexes()` functions (`rate-limit.ts`, `email-otp.ts`,
   `webauthn-challenges.ts`, `webauthn-store.ts`) catch and log
   `createIndex` failures (e.g. an Atlas database user whose role lacks the
   `createIndex` privilege) instead of rethrowing. A missing index only
   degrades to unindexed queries and no automatic TTL cleanup — it must
   never turn into a hard failure of the feature itself (this was a real
   bug: it made passkey registration crash with a misleading "cancelled"
   message before the browser dialog ever opened).
4. **Constant-time comparisons + dummy work to avoid timing/enumeration
   leaks:** the bcrypt `DUMMY_HASH` comparison for unknown emails, the
   always-called `verifyEmailOtp` even for unknown emails, and
   `crypto.timingSafeEqual` for both the TOTP code and the email-OTP hash
   comparison.
5. **One-time-use everywhere it matters:** WebAuthn challenges
   (`findOneAndDelete`) and email OTP codes (`deleteOne` on success) can
   never be replayed even before their TTL expires.
6. **WebAuthn RP ID/origin must match the browser's actual origin exactly**
   (`getRpId()`/`getExpectedOrigin()` in `webauthn.ts`, derived from
   `NEXT_PUBLIC_SITE_URL` unless overridden by `WEBAUTHN_RP_ID`/
   `WEBAUTHN_ORIGIN`) — IP addresses like `127.0.0.1` can never satisfy
   this against a real domain name; use `localhost` for local testing.

---

## 8. Environment variables involved

| Variable                | Used by                          | Purpose |
|--------------------------|-----------------------------------|---------|
| `ADMIN_IP_ALLOWLIST`     | `src/proxy.ts`                    | Comma-separated IP/CIDR allowlist for all of `/admin/*`. Empty/unset = disabled. |
| `ADMIN_USERS_FILE`       | `src/lib/admin-users.ts`          | Path to the admin roster JSON (defaults to `secrets/admin-users.json`). |
| `ADMIN_SECRETS_KEY`      | `src/lib/totp.ts`                 | 32-byte (base64) AES-256-GCM key encrypting/decrypting stored TOTP secrets. Auto-generated by `create-env.mjs`. |
| `ADMIN_TOTP_ISSUER`      | `src/lib/totp.ts` (via CLI), `webauthn.ts` (`getRpName` fallback) | Issuer name shown in authenticator apps / as the passkey RP name. |
| `MONGODB_URI`            | `src/lib/mongodb.ts`              | Backing store for rate limits, email OTP codes, WebAuthn challenges & credentials. |
| `NEXT_PUBLIC_SITE_URL`   | `src/lib/webauthn.ts` (`siteUrl`) | Default source for the WebAuthn RP ID/origin (build-time inlined). |
| `WEBAUTHN_RP_ID`         | `src/lib/webauthn.ts`             | Overrides the derived RP ID (e.g. `localhost` for local testing). |
| `WEBAUTHN_ORIGIN`        | `src/lib/webauthn.ts`             | Overrides the derived expected origin. |
| `WEBAUTHN_RP_NAME`       | `src/lib/webauthn.ts`             | Overrides the passkey "Relying Party" display name. |

---

## 9. File map

| File | Role |
|---|---|
| `src/proxy.ts` | Edge middleware: IP allowlist + session-based routing |
| `src/lib/ip-allowlist.ts` | IPv4/IPv6/CIDR matcher (edge-safe, no Node builtins) |
| `src/lib/client-ip.ts` | Extracts client IP from proxy headers |
| `src/auth.config.ts` | Edge-safe shared Auth.js config (no providers) |
| `src/auth.ts` | Full Auth.js config: all three `Credentials` providers |
| `src/lib/rate-limit.ts` | Generic Mongo-backed failed-attempt tracker |
| `src/lib/admin-users.ts` | Loads `secrets/admin-users.json` |
| `src/lib/totp.ts` | RFC 4226/6238 HOTP/TOTP + AES-256-GCM secret encryption |
| `src/lib/webauthn.ts` | `@simplewebauthn/server` wrapper (RP config, options, verification) |
| `src/lib/webauthn-challenges.ts` | Mongo-backed one-time WebAuthn challenge store |
| `src/lib/webauthn-store.ts` | Mongo-backed passkey credential store |
| `src/lib/email-otp.ts` | Mongo-backed email one-time-code store + verification |
| `src/app/admin/login/page.tsx` | Login UI (password/TOTP form, passkey button, email-code form) |
| `src/app/admin/login/actions.ts` | Server Actions gluing the UI to `signIn(...)` for all three providers |
| `src/app/admin/security/SecurityClient.tsx` | Passkey management UI (add/remove) |
| `src/app/admin/security/actions.ts` | Server Actions for passkey registration/removal |
