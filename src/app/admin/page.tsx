import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getResumeData } from "@/lib/resume-data";
import ProfileEditor from "./sections/ProfileEditor";
import SummaryEditor from "./sections/SummaryEditor";
import StatsEditor from "./sections/StatsEditor";
import SkillGroupsEditor from "./sections/SkillGroupsEditor";
import ExperienceEditor from "./sections/ExperienceEditor";
import EducationEditor from "./sections/EducationEditor";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const data = await getResumeData();

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Resume Admin</h1>
            <p className="text-sm text-slate-400">Signed in as {session.user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/security"
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5"
            >
              Security
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/admin/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <ProfileEditor initialProfile={data.profile} />
        <SummaryEditor initialSummary={data.summary} />
        <StatsEditor initialStats={data.stats} />
        <SkillGroupsEditor initialSkillGroups={data.skillGroups} />
        <ExperienceEditor initialExperiences={data.experiences} />
        <EducationEditor initialEducation={data.education} />
      </div>
    </div>
  );
}
