"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DownloadIcon } from "@/components/icons/Icons";
import ThemeControls from "@/components/ThemeControls";

const links = [
  { href: "#about", label: "About", id: "about" },
  { href: "#skills", label: "Skills", id: "skills" },
  { href: "#experience", label: "Experience", id: "experience" },
  { href: "#education", label: "Education", id: "education" },
  { href: "#contact", label: "Contact", id: "contact" },
];

export default function Navbar({ resumeUrl }: { resumeUrl: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");
  const isExternal = resumeUrl?.startsWith("http") ?? false;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = links
      .map((l) => document.getElementById(l.id))
      .filter((el): el is HTMLElement => Boolean(el));

    const updateActive = () => {
      const referenceLine = 160; // px from top of viewport
      let current = "";
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= referenceLine) {
          current = section.id;
        }
      }
      setActive(current);
    };

    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    return () => {
      window.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, []);

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-slate-950/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top" className="group font-mono text-lg font-semibold tracking-tight text-white">
          Rohit
          <span className="bg-gradient-to-r from-[rgb(var(--accent-rgb))] to-[rgb(var(--accent3-rgb))] bg-clip-text text-transparent transition group-hover:animate-pulse">
            .
          </span>
          Kumar
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <li key={l.href} className="relative">
              <a
                href={l.href}
                className={`text-sm font-medium transition-colors ${
                  active === l.id ? "text-white" : "text-slate-300 hover:text-[rgb(var(--accent-rgb))]"
                }`}
              >
                {l.label}
              </a>
              {active === l.id && (
                <motion.span
                  layoutId="nav-underline"
                  className="absolute -bottom-1.5 left-0 h-[2px] w-full rounded-full bg-gradient-to-r from-[rgb(var(--accent-rgb))] to-[rgb(var(--accent3-rgb))]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </li>
          ))}
        </ul>

        <a
          href={resumeUrl}
          download={isExternal ? undefined : true}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noreferrer" : undefined}
          className="hidden items-center gap-2 rounded-full bg-gradient-to-r from-[rgb(var(--accent-rgb))] to-[rgb(var(--accent3-rgb))] px-5 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_25px_-6px_rgba(var(--accent-rgb),0.8)] transition hover:scale-105 hover:shadow-[0_0_35px_-4px_rgba(var(--accent3-rgb),0.9)] md:inline-flex"
        >
          <DownloadIcon className="h-4 w-4" />
          Resume
        </a>

        <button
          aria-label="Toggle menu"
          className="text-slate-200 md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="max-h-[calc(100dvh-64px)] overflow-y-auto border-t border-white/10 bg-slate-950/95 px-6 py-4 md:hidden"
        >
          <ul className="flex flex-col gap-4">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block text-sm font-medium text-slate-300 hover:text-[rgb(var(--accent-rgb))]"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href={resumeUrl}
                download={isExternal ? undefined : true}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noreferrer" : undefined}
                className="inline-block rounded-full bg-gradient-to-r from-[rgb(var(--accent-rgb))] to-[rgb(var(--accent3-rgb))] px-5 py-2 text-sm font-semibold text-slate-950"
              >
                Resume
              </a>
            </li>
          </ul>

          <div className="mt-5 border-t border-white/10 pt-5 sm:hidden">
            <ThemeControls compact />
          </div>
        </motion.div>
      )}
    </header>
  );
}
