"use client";

import { useActionState, useState, useTransition } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import {
  login,
  getPasskeyLoginOptions,
  completePasskeyLogin,
  requestEmailOtpLogin,
  completeEmailOtpLogin,
} from "./actions";

type Mode = "password" | "email-otp";

function PasskeyButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        const { options, nonce } = await getPasskeyLoginOptions();
        // Browser-native: triggers Face ID/Touch ID/Windows Hello for a
        // passkey on THIS device, or (automatically, no extra code needed
        // here) a QR code the user can scan with their phone to sign in via
        // a passkey stored there instead.
        const assertion = await startAuthentication(options);
        const result = await completePasskeyLogin(nonce, JSON.stringify(assertion));
        if (result?.error) setError(result.error);
      } catch (err) {
        // User cancelled, no passkey available, etc. — not worth alarming
        // wording for what's usually just "closed the prompt".
        console.error(err);
        setError("Passkey sign-in was cancelled or isn't available on this device.");
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="w-full rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/5 disabled:opacity-50"
      >
        {pending ? "Waiting for passkey…" : "Sign in with a passkey"}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}

function EmailOtpForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSendCode = () => {
    setError(null);
    startTransition(async () => {
      const result = await requestEmailOtpLogin(email);
      if (result?.error) setError(result.error);
      else setSent(true);
    });
  };

  const onVerify = () => {
    setError(null);
    startTransition(async () => {
      const result = await completeEmailOtpLogin(email, code);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="otp-email" className="block text-sm text-slate-400">
          Email
        </label>
        <input
          id="otp-email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={sent}
          className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-[rgb(var(--accent-rgb))] disabled:opacity-60"
        />
      </div>

      {sent && (
        <div>
          <label htmlFor="otp-code" className="block text-sm text-slate-400">
            6-digit code
          </label>
          <input
            id="otp-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-[rgb(var(--accent-rgb))]"
          />
          <p className="mt-1 text-xs text-slate-500">Check your email — the code expires in 10 minutes.</p>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={sent ? onVerify : onSendCode}
        disabled={pending || (sent ? code.length !== 6 : !email.includes("@"))}
        className="w-full rounded-lg bg-white px-3 py-2 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:opacity-50"
      >
        {pending ? "Please wait…" : sent ? "Verify code" : "Send code"}
      </button>
    </div>
  );
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);
  // Controlled so email/password survive the extra round-trip when the
  // server asks for a 2FA code — each submit is a fresh POST, so without
  // this the second submission (code only) would arrive with the email and
  // password fields empty.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("password");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Admin Login</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to edit resume content.</p>
        </div>

        <PasskeyButton />

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="h-px flex-1 bg-white/10" />
          or
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="flex gap-4 text-xs">
          <button
            type="button"
            onClick={() => setMode("password")}
            className={mode === "password" ? "font-semibold text-white" : "text-slate-400 hover:text-white"}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setMode("email-otp")}
            className={mode === "email-otp" ? "font-semibold text-white" : "text-slate-400 hover:text-white"}
          >
            Email code
          </button>
        </div>

        {mode === "email-otp" ? (
          <EmailOtpForm />
        ) : (
          <form action={formAction} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm text-slate-400">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                // readOnly (not disabled): a disabled field is excluded from
                // FormData entirely on submit, so the code-verification POST
                // would arrive with no email at all — NextAuth then coerces
                // the missing value into the literal string "null", which
                // passes the `typeof === "string"` check in auth.ts and
                // fails the login against a bogus "null" identity instead of
                // the real one. readOnly keeps the value in the submission
                // while still preventing edits during the 2FA step.
                readOnly={state?.requireTotp}
                aria-readonly={state?.requireTotp}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-[rgb(var(--accent-rgb))] read-only:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-slate-400">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                readOnly={state?.requireTotp}
                aria-readonly={state?.requireTotp}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-[rgb(var(--accent-rgb))] read-only:opacity-60"
              />
            </div>

            {state?.requireTotp && (
              <div>
                <label htmlFor="code" className="block text-sm text-slate-400">
                  Authenticator code
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-[rgb(var(--accent-rgb))]"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>
            )}

            {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-white px-3 py-2 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:opacity-50"
            >
              {pending ? "Signing in…" : state?.requireTotp ? "Verify code" : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
