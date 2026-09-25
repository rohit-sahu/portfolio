"use client";

import { useState, useTransition } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import {
  getPasskeyRegistrationOptions,
  completePasskeyRegistration,
  deleteMyPasskey,
  type PasskeySummary,
} from "./actions";

export default function SecurityClient({ initialPasskeys }: { initialPasskeys: PasskeySummary[] }) {
  const [passkeys, setPasskeys] = useState(initialPasskeys);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onAddPasskey = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      // Fetching the registration options is a server call (talks to Mongo
      // for the challenge, etc.) — kept in its own try/catch so a
      // server-side failure (e.g. a database error) is reported with its
      // real message instead of being lumped in with genuine
      // browser/WebAuthn ceremony failures below, which previously showed
      // an identical, misleading "cancelled" message for both cases.
      let options: Awaited<ReturnType<typeof getPasskeyRegistrationOptions>>["options"];
      let nonce: string;
      try {
        ({ options, nonce } = await getPasskeyRegistrationOptions());
      } catch (err) {
        console.error("Failed to get passkey registration options:", err);
        const reason = err instanceof Error ? err.message : String(err);
        setError(`Couldn't start passkey setup: ${reason}`);
        return;
      }

      try {
        // Same navigator.credentials.create() call whether the user chooses
        // "this device" (Face ID/Touch ID/Windows Hello) or scans the
        // browser-generated QR code to enroll a passkey stored on their
        // phone instead — the browser/OS decides which UI to show.
        const attestation = await startRegistration(options);
        const result = await completePasskeyRegistration(
          nonce,
          JSON.stringify(attestation),
          label || "Passkey"
        );
        if (result?.error) {
          setError(result.error);
          return;
        }
        setMessage("Passkey added.");
        setLabel("");
        setPasskeys((prev) => [
          ...prev,
          {
            id: attestation.id,
            name: label || "Passkey",
            deviceType: "multiDevice",
            createdAt: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        console.error(err);
        const name = err instanceof Error ? err.name : undefined;
        setError(
          name
            ? `Passkey setup was cancelled or isn't available on this device/browser. (${name})`
            : "Passkey setup was cancelled or isn't available on this device/browser."
        );
      }
    });
  };

  const onDelete = (id: string) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await deleteMyPasskey(id);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
    });
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg font-semibold text-white">Passkeys</h2>
      <p className="mt-1 text-sm text-slate-400">
        Sign in with Face ID, Touch ID, Windows Hello, a security key, or scan a QR code to use a
        passkey stored on your phone instead of a password.
      </p>

      <ul className="mt-5 space-y-2">
        {passkeys.length === 0 && <li className="text-sm text-slate-500">No passkeys registered yet.</li>}
        {passkeys.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
          >
            <div>
              <p className="text-white">{p.name}</p>
              <p className="text-xs text-slate-500">
                Added {new Date(p.createdAt).toLocaleDateString()} ·{" "}
                {p.deviceType === "multiDevice" ? "Synced (phone/cloud)" : "This device only"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onDelete(p.id)}
              disabled={pending}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-400 transition hover:border-red-400/50 hover:text-red-400"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex gap-2">
        <input
          type="text"
          placeholder="Label (e.g. iPhone, Laptop)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-[rgb(var(--accent-rgb))]"
        />
        <button
          type="button"
          onClick={onAddPasskey}
          disabled={pending}
          className="rounded-lg bg-[rgb(var(--accent-rgb))] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Working…" : "Add a passkey"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {message && <p className="mt-3 text-sm text-emerald-400">{message}</p>}
    </section>
  );
}
