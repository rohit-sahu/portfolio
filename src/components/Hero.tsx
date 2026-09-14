"use client";

import { useState, useRef, MouseEvent } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { Profile, Stat } from "@/data/resume";
import { DownloadIcon, GithubIcon, LinkedinIcon, MailIcon } from "@/components/icons/Icons";
import RotatingRole from "@/components/RotatingRole";
import CartoonRobot from "@/components/CartoonRobot";
import OrbitSparkles from "@/components/OrbitSparkles";
import WaveBubble from "@/components/WaveBubble";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 * i, duration: 0.6, ease: "easeOut" as const },
  }),
};

function TiltPortrait({
  imageFailed,
  setImageFailed,
  profile,
}: {
  imageFailed: boolean;
  setImageFailed: (v: boolean) => void;
  profile: Profile;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [12, -12]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), { stiffness: 200, damping: 20 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      style={{ perspective: 800 }}
      className="relative mx-auto flex h-72 w-72 items-center justify-center sm:h-96 sm:w-96"
    >
      <motion.div style={{ rotateX, rotateY }} className="absolute inset-0">
        <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent-rgb))" />
              <stop offset="50%" stopColor="rgb(var(--accent2-rgb))" />
              <stop offset="100%" stopColor="rgb(var(--accent3-rgb))" />
            </linearGradient>
          </defs>
          <circle
            cx="200"
            cy="200"
            r="172"
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth="2"
            strokeDasharray="10 10"
            className="origin-center animate-[spin_30s_linear_infinite]"
          />
          <circle cx="200" cy="200" r="150" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex h-56 w-56 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-[rgba(var(--accent-rgb),0.1)] via-slate-900/80 to-[rgba(var(--accent3-rgb),0.1)] shadow-[0_0_60px_-10px_rgba(var(--accent-rgb),0.5)] backdrop-blur sm:h-72 sm:w-72">
            {imageFailed ? (
              <span className="bg-gradient-to-br from-[rgb(var(--accent-rgb))] via-[rgb(var(--accent2-rgb))] to-[rgb(var(--accent3-rgb))] bg-clip-text font-mono text-6xl font-bold text-transparent sm:text-7xl">
                RK
              </span>
            ) : (
              <Image
                key={profile.photoUrl}
                // External links (e.g. Google Drive) are proxied through our
                // own cached copy — browsers never hotlink the source
                // directly (avoids CORS/ORB blocks and the source's own rate
                // limits). Query string busts the cache when the link changes.
                src={
                  profile.photoUrl?.startsWith("http")
                    ? `/api/profile-photo?src=${encodeURIComponent(profile.photoUrl)}`
                    : profile.photoUrl || "/profile.jpg"
                }
                alt={`${profile.name} — ${profile.role}`}
                fill
                priority
                sizes="(min-width: 640px) 18rem, 14rem"
                className="object-cover"
                onError={() => setImageFailed(true)}
              />
            )}
          </div>
        </div>
      </motion.div>

      {["Java 21", "Spring Boot", "Kafka", "AWS EKS"].map((tag, i) => {
        const positions = ["left-0 top-4", "right-0 top-16", "right-2 bottom-24", "right-0 bottom-4"];
        return (
          <motion.span
            key={tag}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.15 }}
            className={`animate-soft-float absolute ${positions[i]} rounded-full border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-lg backdrop-blur`}
            style={{ animationDelay: `${i * 0.5}s` }}
          >
            {tag}
          </motion.span>
        );
      })}

      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 1.1, type: "spring", stiffness: 200, damping: 16 }}
        className="pointer-events-none absolute -bottom-2 -left-6 h-20 w-20 sm:-bottom-3 sm:-left-8 sm:h-24 sm:w-24"
      >
        <CartoonRobot />
      </motion.div>

      <OrbitSparkles />
      <WaveBubble />
    </motion.div>
  );
}

export default function Hero({ profile, stats }: { profile: Profile; stats: Stat[] }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section id="top" className="relative flex min-h-screen items-center pt-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0}
            className="mb-4 inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.05)] px-4 py-1.5 text-[10px] font-medium uppercase tracking-wide text-[rgb(var(--accent-rgb))] sm:text-xs sm:tracking-widest"
          >
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[rgb(var(--accent-rgb))]" />
            <span className="sm:hidden">Open to new opportunities</span>
            <span className="hidden sm:inline">Available for lead engineering roles</span>
          </motion.p>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Hi, I&apos;m {profile.name.split(" ")[0]} —
            <br />
            <RotatingRole />
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300"
          >
            {profile.tagline}
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={3}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <motion.a
              href="#contact"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              className="rounded-full bg-gradient-to-r from-[rgb(var(--accent-rgb))] to-[rgb(var(--accent3-rgb))] px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_30px_-6px_rgba(var(--accent-rgb),0.9)] transition"
            >
              Get in touch
            </motion.a>
            <motion.a
              href={profile.resumeUrl}
              // Browsers ignore `download` for cross-origin URLs (e.g. a
              // Google Drive link) — open those in a new tab instead so the
              // click doesn't just navigate the current page away.
              download={profile.resumeUrl?.startsWith("http") ? undefined : true}
              target={profile.resumeUrl?.startsWith("http") ? "_blank" : undefined}
              rel={profile.resumeUrl?.startsWith("http") ? "noreferrer" : undefined}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-[rgba(var(--accent-rgb),0.5)] hover:text-[rgb(var(--accent-rgb))]"
            >
              <DownloadIcon className="h-4 w-4" />
              Download Resume
            </motion.a>

            <div className="ml-1 flex items-center gap-3">
              {[
                { icon: GithubIcon, href: profile.github, label: "GitHub" },
                { icon: LinkedinIcon, href: profile.linkedin, label: "LinkedIn" },
                { icon: MailIcon, href: `mailto:${profile.email}`, label: "Email" },
              ].map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  whileHover={{ scale: 1.15, rotate: 8 }}
                  className="rounded-full border border-white/10 p-2.5 text-slate-300 transition hover:border-[rgba(var(--accent-rgb),0.6)] hover:text-[rgb(var(--accent-rgb))]"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          <motion.dl
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={4}
            className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-4"
          >
            {stats.map((s) => (
              <motion.div
                key={s.label}
                whileHover={{ y: -4 }}
                className="rounded-xl border border-transparent px-1 py-1 transition hover:border-white/5 hover:bg-white/[0.03]"
              >
                <dt className="sr-only">{s.label}</dt>
                <dd className="bg-gradient-to-r from-[rgb(var(--accent-rgb))] via-[rgb(var(--accent2-rgb))] to-[rgb(var(--accent3-rgb))] bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
                  {s.value}
                </dd>
                <p className="mt-1 text-xs text-slate-400">{s.label}</p>
              </motion.div>
            ))}
          </motion.dl>
        </div>

        <TiltPortrait imageFailed={imageFailed} setImageFailed={setImageFailed} profile={profile} />
      </div>
    </section>
  );
}
