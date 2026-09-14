"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "./actions";

// Shared save-state helper for the admin section editors: wraps a Server
// Action call in a transition and surfaces success/error feedback.
export function useSectionSave<T>(action: (data: T) => Promise<ActionResult>) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function save(data: T) {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await action(data);
        if (result.success) {
          setMessage({ type: "success", text: "Saved" });
        } else {
          setMessage({ type: "error", text: result.error });
        }
      } catch {
        setMessage({ type: "error", text: "Something went wrong. Please try again." });
      }
    });
  }

  return { save, isPending, message };
}
