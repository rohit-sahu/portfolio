"use client";

import { motion } from "framer-motion";
import SectionHeading from "@/components/SectionHeading";
import type { Profile } from "@/data/resume";
import CartoonRobot from "@/components/CartoonRobot";
import {
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  GithubIcon,
  LinkedinIcon,
  ExternalArrowIcon,
} from "@/components/icons/Icons";

export default function Contact({ profile }: { profile: Profile }) {
  const contactCards = [
    { icon: MailIcon, label: "Email", value: profile.email, href: `mailto:${profile.email}` },
    { icon: PhoneIcon, label: "Phone", value: profile.phone, href: `tel:${profile.phone.replace(/\s/g, "")}` },
    { icon: MapPinIcon, label: "Location", value: profile.location, href: undefined },
    { icon: GithubIcon, label: "GitHub", value: "rohit-sahu", href: profile.github },
    { icon: LinkedinIcon, label: "LinkedIn", value: "rohit-sahu", href: profile.linkedin },
  ];

  return (
    <section id="contact" className="relative py-28">
      <div className="mx-auto max-w-4xl px-6">
        <SectionHeading
          eyebrow="Get In Touch"
          title="Let's build something great together"
          description="Open to lead engineering opportunities, consulting, and interesting technical challenges."
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {contactCards.map((c, i) => {
            const Content = (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="shimmer-hover flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[rgba(var(--accent-rgb),0.4)] hover:bg-white/[0.06]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[rgba(var(--accent-rgb),0.2)] to-[rgba(var(--accent3-rgb),0.1)] text-[rgb(var(--accent-rgb))]">
                  <c.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{c.label}</p>
                  <p className="truncate font-medium text-white">{c.value}</p>
                </div>
                {c.href && (
                  <ExternalArrowIcon className="ml-auto h-4 w-4 shrink-0 text-slate-500" />
                )}
              </motion.div>
            );
            return c.href ? (
              <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                {Content}
              </a>
            ) : (
              <div key={c.label}>{Content}</div>
            );
          })}
        </motion.div>

        <div className="mt-14 flex flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-6">
          <motion.a
            href={`mailto:${profile.email}`}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[rgb(var(--accent-rgb))] to-[rgb(var(--accent3-rgb))] px-8 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_0_30px_-6px_rgba(var(--accent-rgb),0.9)] transition"
          >
            <MailIcon className="h-4 w-4" />
            Say Hello
          </motion.a>

          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 16 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 16 }}
            className="hidden h-20 w-20 shrink-0 sm:block"
          >
            <CartoonRobot flip />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
