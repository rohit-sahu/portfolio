# Rohit Kumar — Portfolio

A single-page portfolio built with Next.js 16 (App Router), TypeScript, Tailwind CSS, and Framer Motion, showcasing Rohit Kumar's resume as an elite, animated web experience with custom hand-drawn SVG icons. Content is stored in MongoDB and editable through a password-protected `/admin` dashboard, instead of being hardcoded.

See [DOCS.md](./DOCS.md) for which doc to read for what (running locally, deploying, choosing a host, etc).

## Sections
- **Hero** — animated intro, key stats, resume download, social links
- **About** — professional summary & core engineering pillars
- **Skills** — grouped tech stack with custom SVG icons
- **Experience** — timeline of all roles from the resume
- **Education** — academic history
- **Contact** — email/phone/social contact cards
- **Admin** (`/admin`) — edit every section above; protected by Auth.js, admins stored in `secrets/admin-users.json`

## Getting started
```bash
npm install
cp .env.example .env.local   # then fill in MONGODB_URI; see "Environment variables" below
npx auth secret              # generates AUTH_SECRET, copy it into .env.local
npm run admin:create         # create your first /admin login
npm run dev                  # http://localhost:3000
npm run build && npm run start   # production
```

See **[RUNNING.md](./RUNNING.md)** for every way to run this app (local dev, Docker) and full secrets setup. TLS/reverse proxy/Cloudflare Tunnel are managed in a separate infra repo — this repo only runs the app container.

The original resume (`Rohit_Resume.pdf`) is served from `/public` and downloadable via the "Resume" button.

## Environment variables

```bash
cp .env.example .env.local
```

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical production URL, used for OG/Twitter cards, `sitemap.xml`, `robots.txt` | `https://rohitkumar.skytech.in` |
| `MONGODB_URI` | Connection string for the resume content database (e.g. MongoDB Atlas free tier) | — required |
| `MONGODB_DB` | Database name | `portfolio` |
| `AUTH_SECRET` | Auth.js session signing secret — generate with `npx auth secret` | — required |
| `ADMIN_USERS_FILE` | Override path to the admin roster JSON file | `secrets/admin-users.json` |
| `ADMIN_SECRETS_KEY` | Base64 32-byte AES-256-GCM key encrypting/decrypting each admin's TOTP secret. Required only if 2FA is enabled for any account | — required for 2FA |
| `ADMIN_TOTP_ISSUER` | Label shown in authenticator apps next to the 6-digit code | `Portfolio Admin` |
| `ADMIN_IP_ALLOWLIST` | Comma-separated IPs/CIDR ranges permitted to reach `/admin/*` (relies on your reverse proxy setting X-Forwarded-For honestly) | unset (disabled) |
| `WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGIN` | Override the passkey Relying Party ID/origin. Auto-derived from `NEXT_PUBLIC_SITE_URL` — only set if that derivation would be wrong (e.g. non-standard port behind a proxy) | derived |
| `WEBAUTHN_RP_NAME` | Display name shown in the OS passkey picker | `ADMIN_TOTP_ISSUER`, then `Portfolio Admin` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | SMTP credentials used to send email OTP login codes | — required only for email-code login |

Admin accounts are **not** an env var — they live in `secrets/admin-users.json` (git-ignored), created/updated via `npm run admin:create` (never stores a plaintext password, only a bcrypt hash; TOTP secrets, if enabled, are stored AES-256-GCM-encrypted, never in plaintext).

### Additional /admin protections

- **Rate limiting**: 5 failed login attempts (per email or per IP) within 15 minutes locks that key out for 15 minutes. Tracked in MongoDB (`login_rate_limits` collection, TTL-indexed) so it survives restarts; fails open (never locks everyone out) if MongoDB is briefly unavailable.
- **Optional 2FA (TOTP)**: enable per-admin via `npm run admin:create` — works with Google Authenticator, Authy, 1Password, Bitwarden, or any standard RFC 6238 app. The secret is AES-256-GCM-encrypted at rest using `ADMIN_SECRETS_KEY` (kept in your env file, never alongside `admin-users.json`).
- **Optional IP allowlist**: set `ADMIN_IP_ALLOWLIST` to restrict `/admin/*` to specific networks, enforced in edge middleware before any auth check runs.
- **Passkeys (WebAuthn)**: register one from the signed-in admin's **Security** page (`/admin/security`) — no env setup required. Supports biometrics (Face ID/Touch ID/Windows Hello), security keys, and cross-device sign-in (the browser shows a QR code to scan with a phone that has a passkey for this site). Credentials are stored in MongoDB (`admin_webauthn_credentials`), never in `secrets/admin-users.json`, since that file is a read-only Docker secret mount in production.
- **Email OTP login**: an alternative, passwordless "email code" sign-in option on the login page — requires `SMTP_HOST` to be configured; codes are single-use, expire in 10 minutes, and are stored only as a SHA-256 hash (`email_otp_codes` collection, TTL-indexed).

## Pre-deploy checklist
```bash
npm run lint        # ESLint
npm run type-check  # tsc --noEmit
npm run build       # production build (also runs type-checking)
```

## Deployment

See **[PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)** for a single step-by-step checklist from a fresh server to a live site. See **[RUNNING.md](./RUNNING.md)** for every run scenario (local dev, Docker), and **[DEPLOYMENT.md](./DEPLOYMENT.md)** for Vercel/plain-Node alternatives.

Quick reference:

| Option | Best for | Command |
|---|---|---|
| Docker (`./deploy.sh`) | Self-hosted VPS, app container only — TLS/reverse proxy handled by a separate infra repo, see [RUNNING.md](./RUNNING.md) | `./deploy.sh https://your-domain.com` |
| Vercel | Fastest, zero-config, auto HTTPS/CDN — `/admin` needs extra setup, see [DEPLOYMENT.md](./DEPLOYMENT.md) | Import repo at [vercel.com/new](https://vercel.com/new) |
| Plain Node | Bare VPS without Docker | `npm ci && npm run build && npm run start` |

## Production hardening included
- Security response headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) set in `next.config.ts`.
- `robots.ts` and `sitemap.ts` (App Router metadata routes) for search engines.
- Dynamic Open Graph image (`opengraph-image.tsx`) generated with `next/og`.
- Web app manifest (`manifest.ts`).
- `output: "standalone"` for minimal, portable server bundles.
- `poweredByHeader` disabled, response compression enabled.

