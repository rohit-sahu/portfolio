"use client";

import { motion } from "framer-motion";

type Sparkle = {
  className: string;
  size: number;
  delay: number;
  duration: number;
};

const sparkles: Sparkle[] = [
  { className: "top-2 left-8 sm:top-1 sm:left-10", size: 18, delay: 0, duration: 2.6 },
  { className: "top-1/2 -left-3 sm:-left-4", size: 14, delay: 0.6, duration: 3.2 },
  { className: "bottom-10 right-6 sm:bottom-14 sm:right-8", size: 16, delay: 1.1, duration: 2.8 },
];

function StarShape({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 1.5c.7 4.2 2 6.8 4.5 8.4 2.5 1.6 5.1 1.9 6.5 2.1-1.4.2-4 .5-6.5 2.1-2.5 1.6-3.8 4.2-4.5 8.4-.7-4.2-2-6.8-4.5-8.4C5 14.5 2.4 14.2 1 14c1.4-.2 4-.5 6.5-2.1C10 10.3 11.3 7.7 12 1.5Z"
        fill="url(#sparkle-grad)"
      />
      <defs>
        <linearGradient id="sparkle-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--accent-rgb))" />
          <stop offset="100%" stopColor="rgb(var(--accent3-rgb))" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Playful twinkling cartoon sparkles orbiting the hero portrait. */
export default function OrbitSparkles() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {sparkles.map((s, i) => (
        <motion.div
          key={i}
          className={`absolute ${s.className}`}
          initial={{ opacity: 0, scale: 0.4, rotate: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.4, 1, 1, 0.4],
            rotate: [0, 90, 180],
            y: [0, -6, 0],
          }}
          transition={{
            duration: s.duration,
            delay: 1.4 + s.delay,
            repeat: Infinity,
            repeatDelay: 0.8,
            ease: "easeInOut",
          }}
        >
          <StarShape size={s.size} />
        </motion.div>
      ))}
    </div>
  );
}
