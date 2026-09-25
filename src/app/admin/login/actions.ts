"use server";

import { signIn } from "@/auth";
import { AuthError, CredentialsSignin } from "next-auth";
import { buildAuthenticationOptions } from "@/lib/webauthn";
import { storeChallenge } from "@/lib/webauthn-challenges";
import { requestEmailOtp as sendEmailOtp, isEmailConfigured } from "@/lib/email-otp";
import { isRateLimited, recordFailedAttempt } from "@/lib/rate-limit";

export type LoginState = { error?: string; requireTotp?: boolean } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      code: formData.get("code"),
      redirectTo: "/admin",
    });
  } catch (err) {
    if (err instanceof CredentialsSignin) {
      switch (err.code) {
        case "totp_required":
          return { requireTotp: true };
        case "invalid_totp":
          return { error: "Invalid authenticator code", requireTotp: true };
        case "rate_limited":
          return { error: "Too many attempts. Please try again in a few minutes." };
        default:
          return { error: "Invalid email or password" };
      }
    }
    if (err instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw err;
  }
}

// Step 1 of passkey login: mint a fresh challenge (usernameless — no email
// needed) and hand it back with a one-time nonce the browser will echo back
// in step 2. Public/unauthenticated on purpose — this is how you sign IN.
export async function getPasskeyLoginOptions() {
  const options = await buildAuthenticationOptions();
  const nonce = await storeChallenge({ challenge: options.challenge, purpose: "authentication" });
  return { options, nonce };
}

export type PasskeyLoginState = { error?: string } | undefined;

// Step 2: the browser has already completed the on-device/cross-device
// WebAuthn ceremony (see LoginPage's onPasskeySignIn) — this just verifies
// the signed assertion and starts the session.
export async function completePasskeyLogin(nonce: string, assertionJson: string): Promise<PasskeyLoginState> {
  try {
    await signIn("webauthn", { nonce, assertion: assertionJson, redirectTo: "/admin" });
  } catch (err) {
    if (err instanceof CredentialsSignin) {
      if (err.code === "rate_limited") {
        return { error: "Too many attempts. Please try again in a few minutes." };
      }
      return { error: "That passkey wasn't recognized or the request expired. Please try again." };
    }
    if (err instanceof AuthError) {
      return { error: "Passkey sign-in failed. Please try again." };
    }
    throw err;
  }
}

export type EmailOtpRequestState = { sent?: boolean; error?: string } | undefined;

// Rate-limited by email address only (not by IP — this is the "sending" side,
// which must stay cheap to call from an unauthenticated form, unlike the
// verify side below which also checks IP).
export async function requestEmailOtpLogin(email: string): Promise<EmailOtpRequestState> {
  if (typeof email !== "string" || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }
  const normalizedEmail = email.toLowerCase();
  const key = `email-otp-send:${normalizedEmail}`;
  if (await isRateLimited(key)) {
    return { error: "Too many codes requested. Please try again in a few minutes." };
  }
  try {
    await sendEmailOtp(normalizedEmail);
  } catch (err) {
    console.error("Failed to send email OTP:", err);
    await recordFailedAttempt(key);
    return {
      error: isEmailConfigured()
        ? "Couldn't send the code. Please try again shortly."
        : "Email sign-in isn't configured on this server yet.",
    };
  }
  // Always return a generic "sent" response — never confirm/deny whether the
  // address belongs to an admin account.
  return { sent: true };
}

export type EmailOtpLoginState = { error?: string } | undefined;

export async function completeEmailOtpLogin(email: string, code: string): Promise<EmailOtpLoginState> {
  try {
    await signIn("email-otp", { email, code, redirectTo: "/admin" });
  } catch (err) {
    if (err instanceof CredentialsSignin) {
      if (err.code === "rate_limited") {
        return { error: "Too many attempts. Please try again in a few minutes." };
      }
      return { error: "Invalid or expired code." };
    }
    if (err instanceof AuthError) {
      return { error: "Sign-in failed. Please try again." };
    }
    throw err;
  }
}
