"use client";

import { motion } from "framer-motion";

export default function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mx-auto max-w-2xl text-center"
    >
      <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.05)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--accent-rgb))]">
        <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-rgb))] animate-pulse" />
        {eyebrow}
      </span>
      <h2 className="mt-4 bg-gradient-to-r from-white via-[rgb(var(--accent2-rgb))] to-white bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
        {title}
      </h2>
      {description && <p className="mt-4 text-slate-400">{description}</p>}
    </motion.div>
  );
}

