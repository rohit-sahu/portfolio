"use client";

import type { ReactNode } from "react";

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export function SaveBar({
  isPending,
  message,
  onSave,
}: {
  isPending: boolean;
  message: { type: "success" | "error"; text: string } | null;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="button"
        onClick={onSave}
        disabled={isPending}
        className="rounded-lg bg-[rgb(var(--accent-rgb))] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
      {message && (
        <span className={`text-sm ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
          {message.text}
        </span>
      )}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-[rgb(var(--accent-rgb))]";
export const labelClass = "block text-xs font-medium uppercase tracking-wide text-slate-400";
export const removeButtonClass =
  "rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-400 transition hover:border-red-400/50 hover:text-red-400";
export const addButtonClass =
  "rounded-lg border border-dashed border-white/20 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[rgba(var(--accent-rgb),0.5)] hover:text-[rgb(var(--accent-rgb))]";
