"use client";

import { motion } from "framer-motion";
import SectionHeading from "@/components/SectionHeading";
import { ShieldIcon, StreamIcon, CloudIcon, NetworkIcon } from "@/components/icons/Icons";

const pillars = [
  { icon: ShieldIcon, label: "Zero-Trust Security", desc: "mTLS, OAuth 2.0, X.509 certs", grad: "from-[rgba(var(--accent-rgb),0.2)] to-[rgba(var(--accent-rgb),0.05)] text-[rgb(var(--accent-rgb))]" },
  { icon: StreamIcon, label: "Event-Driven Systems", desc: "Apache Kafka, Kafka Streams", grad: "from-[rgba(var(--accent2-rgb),0.2)] to-[rgba(var(--accent2-rgb),0.05)] text-[rgb(var(--accent2-rgb))]" },
  { icon: CloudIcon, label: "Cloud-Native DevOps", desc: "AWS EKS, Docker, Kubernetes", grad: "from-[rgba(var(--accent3-rgb),0.2)] to-[rgba(var(--accent3-rgb),0.05)] text-[rgb(var(--accent3-rgb))]" },
  { icon: NetworkIcon, label: "Microservices Architecture", desc: "REST, GraphQL, MVC", grad: "from-[rgba(var(--accent4-rgb),0.2)] to-[rgba(var(--accent4-rgb),0.05)] text-[rgb(var(--accent4-rgb))]" },
];

export default function About({ summary }: { summary: string[] }) {
  return (
    <section id="about" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="About Me"
          title="Engineering resilient systems at scale"
        />

        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="space-y-5 text-slate-300"
          >
            {summary.map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="leading-relaxed"
              >
                {line}
              </motion.p>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {pillars.map((p, i) => (
              <motion.div
                key={p.label}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="shimmer-hover group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                <div className={`mb-3 inline-flex rounded-xl bg-gradient-to-br p-2.5 transition group-hover:scale-110 ${p.grad}`}>
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-white">{p.label}</h3>
                <p className="mt-1 text-sm text-slate-400">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
