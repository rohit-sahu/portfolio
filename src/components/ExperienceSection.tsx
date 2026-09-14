"use client";

import { motion } from "framer-motion";
import SectionHeading from "@/components/SectionHeading";
import type { Experience } from "@/data/resume";
import { BriefcaseIcon, MapPinIcon } from "@/components/icons/Icons";

export default function ExperienceSection({ experiences }: { experiences: Experience[] }) {
  return (
    <section id="experience" className="relative py-28">
      <div className="mx-auto max-w-4xl px-6">
        <SectionHeading
          eyebrow="Career Journey"
          title="Professional Experience"
          description="9 years of building and leading engineering efforts across identity security, fintech, retail, and proptech."
        />

        <div className="relative mt-16">
          <motion.div
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute left-[19px] top-0 h-full w-px origin-top bg-gradient-to-b from-[rgb(var(--accent-rgb))] via-[rgba(var(--accent2-rgb),0.6)] to-transparent sm:left-[27px]"
          />

          <div className="space-y-10">
            {experiences.map((exp, i) => (
              <motion.div
                key={exp.company + exp.period}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: Math.min(i, 4) * 0.08 }}
                className="relative pl-12 sm:pl-20"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18, delay: Math.min(i, 4) * 0.08 }}
                  whileHover={{ scale: 1.15, rotate: 8 }}
                  className="absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(var(--accent-rgb),0.4)] bg-slate-900 text-[rgb(var(--accent-rgb))] shadow-[0_0_20px_-4px_rgba(var(--accent-rgb),0.7)] sm:h-14 sm:w-14"
                >
                  <BriefcaseIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </motion.span>

                <motion.div
                  whileHover={{ y: -4 }}
                  className="shimmer-hover rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-[rgba(var(--accent-rgb),0.3)] hover:bg-white/[0.05]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-white">{exp.title}</h3>
                    <span className="rounded-full border border-[rgba(var(--accent3-rgb),0.3)] bg-[rgba(var(--accent3-rgb),0.05)] px-3 py-1 text-xs font-medium text-[rgb(var(--accent3-rgb))]">
                      {exp.period}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
                    <span className="font-medium text-slate-200">{exp.company}</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPinIcon className="h-3.5 w-3.5" /> {exp.location}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {exp.points.map((pt, idx) => (
                      <li key={idx} className="flex gap-2 text-sm leading-relaxed text-slate-300">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gradient-to-r from-[rgb(var(--accent-rgb))] to-[rgb(var(--accent3-rgb))]" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
