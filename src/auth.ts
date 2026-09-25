import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
import bcrypt from "bcryptjs";
import { loadAdminUsers } from "@/lib/admin-users";
import { authConfig } from "@/auth.config";
import { getClientIp } from "@/lib/client-ip";
import { isRateLimited, recordFailedAttempt, clearAttempts } from "@/lib/rate-limit";
import { decryptTotpSecret, verifyTotpToken } from "@/lib/totp";
import { consumeChallenge } from "@/lib/webauthn-challenges";
import { findCredentialById, updateCredentialCounter } from "@/lib/webauthn-store";
import { verifyAuthentication } from "@/lib/webauthn";
import { verifyEmailOtp } from "@/lib/email-otp";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";

// Valid bcrypt hash of an arbitrary value, never a real credential — used so
// bcrypt.compare always runs (even for an unknown email), keeping lookup
// time roughly constant instead of leaking which emails exist.
const DUMMY_HASH = "$2b$10$6RsZIH4Bivlsji2DmOXleuXvgG4boAFdvwWFBAR.i5pkffcNRRYpO";

// Custom CredentialsSignin subclasses: the `code` becomes `?code=...` on the
// error-page redirect path, but more importantly (since login/actions.ts
// calls signIn() directly as a Server Action, not via that redirect) it's
// preserved on the thrown error object itself — see next-auth's raw-mode
// handling in @auth/core, which rethrows AuthErrors verbatim when called
// this way. login/actions.ts reads `err.code` to decide what to show.
class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}
class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}
class TotpRequiredError extends CredentialsSignin {
  code = "totp_required";
}
class InvalidTotpError extends CredentialsSignin {
  code = "invalid_totp";
}
class WebauthnFailedError extends CredentialsSignin {
  code = "webauthn_failed";
}
class InvalidEmailOtpError extends CredentialsSignin {
  code = "invalid_email_otp";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "Authenticator code", type: "text" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email;
        const password = credentials?.password;
        const code = credentials?.code;
        // A disabled <input> is excluded from FormData on submit, and
        // NextAuth's internal serialization then coerces the missing value
        // into the literal string "null" — which passes a bare `typeof ===
        // "string"` check. Reject that (and any other non-email-shaped
        // string) explicitly so a UI bug can never masquerade as a lookup
        // against a real account, and so it never pollutes the rate-limit
        // store with junk "email:null" keys.
        if (
          typeof email !== "string" ||
          typeof password !== "string" ||
          password.length === 0 ||
          !email.includes("@")
        ) {
          return null;
        }

        const normalizedEmail = email.toLowerCase();
        const ip = getClientIp(request.headers) ?? "unknown";
        const emailKey = `email:${normalizedEmail}`;
        const ipKey = `ip:${ip}`;

        // Checked before touching bcrypt/DB — a locked-out caller shouldn't
        // even get a password-verification timing signal.
        if ((await isRateLimited(emailKey)) || (await isRateLimited(ipKey))) {
          throw new RateLimitedError();
        }

        const users = await loadAdminUsers();
        const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);

        const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !passwordMatches) {
          await recordFailedAttempt(emailKey);
          await recordFailedAttempt(ipKey);
          throw new InvalidCredentialsError();
        }

        if (user.totpSecret) {
          // Checks the actual 6-digit shape, not just "is a non-empty
          // string" — the code <input> doesn't exist in the DOM yet on the
          // very first submission (it only renders after this branch first
          // responds with requireTotp), so formData.get("code") comes back
          // null. NextAuth's internal request serialization then coerces
          // that missing value into the literal string "null" (4 chars,
          // non-empty), which would otherwise slip past a bare
          // length-=== 0 check and get treated as a genuine wrong code on
          // an attempt where the user never even saw the code field yet.
          if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
            // Correct password, but this account has 2FA enabled and no code
            // was submitted yet — don't count this as a failed attempt, the
            // login form will re-render with a code field and resubmit.
            throw new TotpRequiredError();
          }

          let secretPlain: string;
          try {
            secretPlain = decryptTotpSecret(user.totpSecret);
          } catch (err) {
            // Misconfigured ADMIN_SECRETS_KEY or corrupted stored secret —
            // fail closed rather than silently skipping the 2FA check.
            console.error(`Failed to decrypt TOTP secret for ${normalizedEmail}:`, err);
            throw new InvalidTotpError();
          }

          if (!verifyTotpToken(secretPlain, code)) {
            await recordFailedAttempt(emailKey);
            await recordFailedAttempt(ipKey);
            throw new InvalidTotpError();
          }
        }

        await clearAttempts(emailKey);
        await clearAttempts(ipKey);
        return { id: user.email, email: user.email, name: user.email };
      },
    }),

    // Passkey ("Sign in with passkey") login — separate provider so the
    // password+TOTP flow above is completely untouched. The `nonce` +
    // `assertion` pair comes from the two-step client flow in
    // src/app/admin/login/actions.ts (get options -> browser ceremony ->
    // verify). No email is submitted up front: the credential ID inside the
    // signed assertion (chosen by the browser from any discoverable passkey,
    // including one just used via the QR-code/hybrid cross-device flow) is
    // what identifies which admin is signing in.
    Credentials({
      id: "webauthn",
      name: "Passkey",
      credentials: { nonce: { type: "text" }, assertion: { type: "text" } },
      async authorize(credentials, request) {
        const nonce = credentials?.nonce;
        const assertionRaw = credentials?.assertion;
        if (typeof nonce !== "string" || typeof assertionRaw !== "string") return null;

        const ip = getClientIp(request.headers) ?? "unknown";
        const ipKey = `webauthn-ip:${ip}`;
        if (await isRateLimited(ipKey)) throw new RateLimitedError();

        const challengeDoc = await consumeChallenge(nonce, "authentication");
        if (!challengeDoc) {
          await recordFailedAttempt(ipKey);
          throw new WebauthnFailedError();
        }

        let assertion: AuthenticationResponseJSON;
        try {
          assertion = JSON.parse(assertionRaw);
        } catch {
          await recordFailedAttempt(ipKey);
          throw new WebauthnFailedError();
        }

        const credentialId = assertion?.id;
        const credential = typeof credentialId === "string" ? await findCredentialById(credentialId) : null;
        if (!credential) {
          await recordFailedAttempt(ipKey);
          throw new WebauthnFailedError();
        }

        const emailKey = `email:${credential.email}`;
        if (await isRateLimited(emailKey)) throw new RateLimitedError();

        let verification;
        try {
          verification = await verifyAuthentication(assertion, challengeDoc.challenge, credential);
        } catch (err) {
          console.error("WebAuthn authentication verification threw:", err);
          verification = undefined;
        }

        if (!verification?.verified) {
          await recordFailedAttempt(ipKey);
          await recordFailedAttempt(emailKey);
          throw new WebauthnFailedError();
        }

        await updateCredentialCounter(credential.id, verification.authenticationInfo.newCounter);
        await clearAttempts(ipKey);
        await clearAttempts(emailKey);
        return { id: credential.email, email: credential.email, name: credential.email };
      },
    }),

    // Passwordless "email code" login — a separate factor from password+TOTP
    // above, gated purely by access to the admin's inbox. The code itself is
    // generated/emailed by requestEmailOtp() (see
    // src/app/admin/login/actions.ts), this only verifies it.
    Credentials({
      id: "email-otp",
      name: "Email code",
      credentials: { email: { type: "email" }, code: { type: "text" } },
      async authorize(credentials, request) {
        const email = credentials?.email;
        const code = credentials?.code;
        if (typeof email !== "string" || typeof code !== "string" || !email.includes("@")) {
          return null;
        }

        const normalizedEmail = email.toLowerCase();
        const ip = getClientIp(request.headers) ?? "unknown";
        const emailKey = `email-otp:${normalizedEmail}`;
        const ipKey = `ip:${ip}`;
        if ((await isRateLimited(emailKey)) || (await isRateLimited(ipKey))) {
          throw new RateLimitedError();
        }

        const users = await loadAdminUsers();
        const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);

        // Always run verifyEmailOtp (even for an unknown email, against a
        // code that can never match) so response timing doesn't reveal
        // which addresses have admin accounts — same rationale as the
        // DUMMY_HASH bcrypt.compare above.
        const ok = await verifyEmailOtp(normalizedEmail, code);
        if (!user || !ok) {
          await recordFailedAttempt(emailKey);
          await recordFailedAttempt(ipKey);
          throw new InvalidEmailOtpError();
        }

        await clearAttempts(emailKey);
        await clearAttempts(ipKey);
        return { id: user.email, email: user.email, name: user.email };
      },
    }),
  ],
});
