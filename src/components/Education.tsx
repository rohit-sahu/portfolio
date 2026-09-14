"use client";

import { motion } from "framer-motion";
import SectionHeading from "@/components/SectionHeading";
import type { EducationItem } from "@/data/resume";
import { GraduationCapIcon } from "@/components/icons/Icons";

const accents = [
  "text-[rgb(var(--accent-rgb))] shadow-[0_0_25px_-8px_rgba(var(--accent-rgb),0.7)]",
  "text-[rgb(var(--accent2-rgb))] shadow-[0_0_25px_-8px_rgba(var(--accent2-rgb),0.7)]",
  "text-[rgb(var(--accent3-rgb))] shadow-[0_0_25px_-8px_rgba(var(--accent3-rgb),0.7)]",
];

export default function Education({ education }: { education: EducationItem[] }) {
  return (
    <section id="education" className="relative py-28">
      <div className="mx-auto max-w-4xl px-6">
        <SectionHeading eyebrow="Academics" title="Education" />

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {education.map((ed, i) => (
            <motion.div
              key={ed.year}
              initial={{ opacity: 0, y: 24, rotate: i % 2 === 0 ? -2 : 2 }}
              whileInView={{ opacity: 1, y: 0, rotate: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              whileHover={{ y: -8, scale: 1.03 }}
              className="shimmer-hover rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center transition hover:border-white/20"
            >
              <motion.span
                whileHover={{ rotate: 12, scale: 1.15 }}
                className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 ${accents[i % accents.length]}`}
              >
                <GraduationCapIcon className="h-6 w-6" />
              </motion.span>
              <p className="text-sm font-semibold bg-gradient-to-r from-[rgb(var(--accent-rgb))] to-[rgb(var(--accent3-rgb))] bg-clip-text text-transparent">
                {ed.year}
              </p>
              <h3 className="mt-2 font-semibold text-white">{ed.degree}</h3>
              <p className="mt-1 text-sm text-slate-400">{ed.school}</p>
              <p className="mt-3 text-xs font-medium text-slate-500">Marks: {ed.marks}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
