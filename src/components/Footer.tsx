import type { Profile } from "@/data/resume";
import { GithubIcon, LinkedinIcon, MailIcon } from "@/components/icons/Icons";

export default function Footer({ profile }: { profile: Profile }) {
  return (
    <footer className="relative border-t border-white/10 py-10 pb-20 sm:pb-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} {profile.name}. Crafted with Next.js & Tailwind CSS.
        </p>
        <div className="flex items-center gap-4">
          <a href={profile.github} target="_blank" rel="noreferrer" className="text-slate-400 transition hover:scale-110 hover:text-[rgb(var(--accent-rgb))]" aria-label="GitHub">
            <GithubIcon className="h-5 w-5" />
          </a>
          <a href={profile.linkedin} target="_blank" rel="noreferrer" className="text-slate-400 transition hover:scale-110 hover:text-[rgb(var(--accent2-rgb))]" aria-label="LinkedIn">
            <LinkedinIcon className="h-5 w-5" />
          </a>
          <a href={`mailto:${profile.email}`} className="text-slate-400 transition hover:scale-110 hover:text-[rgb(var(--accent3-rgb))]" aria-label="Email">
            <MailIcon className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
