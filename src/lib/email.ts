import "server-only";
import nodemailer from "nodemailer";

// Optional SMTP-backed mailer used for email OTP login codes. Entirely
// opt-in: if SMTP_HOST isn't set, sendEmail() throws in production (so a
// misconfigured deployment fails loudly instead of pretending to work) and
// falls back to logging the message to the server console in development
// (convenient for local testing without a real mail account).
let cachedTransport: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransport() {
  if (cachedTransport) return cachedTransport;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host) return null;
  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
  return cachedTransport;
}

export function isEmailConfigured(): boolean {
  return !!process.env.SMTP_HOST;
}

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    if (process.env.NODE_ENV === "production") {
      // Never silently "succeed" in production without actually sending —
      // that would let a login code disappear with no way for the admin to
      // receive it, and no signal to the operator that SMTP needs setup.
      throw new Error("Email OTP requested but SMTP_HOST is not configured");
    }
    console.warn(
      `[dev only] SMTP not configured — email to ${to} not sent. Subject: "${subject}"\n${text}`
    );
    return;
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@localhost";
  await transport.sendMail({ from, to, subject, text });
}
