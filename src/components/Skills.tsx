"use client";

import { motion } from "framer-motion";
import SectionHeading from "@/components/SectionHeading";
import type { SkillGroup } from "@/data/resume";
import { skillIconMap } from "@/components/icons/Icons";

const accents = [
  "from-[rgba(var(--accent-rgb),0.2)] to-[rgba(var(--accent-rgb),0.05)] text-[rgb(var(--accent-rgb))] hover:shadow-[0_0_30px_-10px_rgba(var(--accent-rgb),0.7)]",
  "from-[rgba(var(--accent2-rgb),0.2)] to-[rgba(var(--accent2-rgb),0.05)] text-[rgb(var(--accent2-rgb))] hover:shadow-[0_0_30px_-10px_rgba(var(--accent2-rgb),0.7)]",
  "from-[rgba(var(--accent3-rgb),0.2)] to-[rgba(var(--accent3-rgb),0.05)] text-[rgb(var(--accent3-rgb))] hover:shadow-[0_0_30px_-10px_rgba(var(--accent3-rgb),0.7)]",
  "from-[rgba(var(--accent4-rgb),0.2)] to-[rgba(var(--accent4-rgb),0.05)] text-[rgb(var(--accent4-rgb))] hover:shadow-[0_0_30px_-10px_rgba(var(--accent4-rgb),0.7)]",
];

export default function Skills({ skillGroups }: { skillGroups: SkillGroup[] }) {
  return (
    <section id="skills" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Skills & Expertise"
          title="A full-stack, cloud-native toolkit"
          description="From secure backend architectures to polished front-end experiences, here's the technology I use to ship reliable software."
        />

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {skillGroups.map((group, i) => {
            const Icon = skillIconMap[group.icon];
            const accent = accents[i % accents.length];
            return (
              <motion.div
                key={group.category}
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`shimmer-hover rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20 ${accent}`}
              >
                <div className="mb-4 flex items-center gap-3">
                  <motion.span
                    whileHover={{ rotate: 12, scale: 1.15 }}
                    className={`rounded-lg bg-gradient-to-br p-2 ${accent}`}
                  >
                    {Icon && <Icon className="h-5 w-5" />}
                  </motion.span>
                  <h3 className="font-semibold text-white">{group.category}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 transition hover:border-white/30 hover:bg-white/10"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
