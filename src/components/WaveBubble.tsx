"use client";

import { motion } from "framer-motion";

/** A cute cartoon speech-bubble that waves hello above the hero portrait. */
export default function WaveBubble() {
  return (
    <motion.div
      className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 sm:-top-6"
      initial={{ opacity: 0, y: 10, scale: 0.6 }}
      animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -6], scale: [0.6, 1, 1, 0.85] }}
      transition={{
        duration: 2.4,
        times: [0, 0.2, 0.8, 1],
        delay: 1.6,
        repeat: Infinity,
        repeatDelay: 4.5,
        ease: "easeInOut",
      }}
    >
      <div className="relative flex items-center gap-1 rounded-2xl rounded-bl-sm border border-white/10 bg-slate-900/90 px-3 py-1.5 shadow-lg backdrop-blur">
        <span className="animate-mascot-wave inline-block origin-[70%_70%] text-base leading-none">
          👋
        </span>
        <span className="text-xs font-medium text-slate-200">Hi there!</span>
      </div>
    </motion.div>
  );
}
