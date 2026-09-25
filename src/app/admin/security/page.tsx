import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listMyPasskeys } from "./actions";
import SecurityClient from "./SecurityClient";

export default async function SecurityPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const passkeys = await listMyPasskeys();

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Security</h1>
            <p className="text-sm text-slate-400">Manage passkeys for {session.user?.email}</p>
          </div>
          <Link
            href="/admin"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5"
          >
            Back to admin
          </Link>
        </header>

        <SecurityClient initialPasskeys={passkeys} />
      </div>
    </div>
  );
}
