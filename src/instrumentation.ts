export async function register() {
  // MongoDB driver is Node-only; instrumentation also runs under the edge
  // runtime (e.g. for proxy.ts), where this import must not happen.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureResumeSeeded } = await import("@/lib/resume-data");
    try {
      await ensureResumeSeeded();
    } catch (err) {
      console.error("Failed to seed resume data at startup:", err);
    }
  }
}
