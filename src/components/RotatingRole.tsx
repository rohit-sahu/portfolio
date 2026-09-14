"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const roles = [
  "Lead Software Engineer",
  "Java & Spring Boot Architect",
  "Cloud-Native Systems Builder",
  "Zero-Trust Security Advocate",
];

export default function RotatingRole() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % roles.length);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="block min-h-[1.15em] leading-tight sm:min-h-[1.1em]">
      <AnimatePresence mode="wait">
        <motion.span
          key={roles[index]}
          initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -14, filter: "blur(4px)" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="inline-block"
        >
          {/* Gradient bg-clip-text must live on its own element — Safari/WebKit
              breaks background-clip:text rendering (text turns invisible) when
              a `filter` animation runs on the very same element. */}
          <span className="bg-gradient-to-r from-[rgb(var(--accent-rgb))] via-[rgb(var(--accent2-rgb))] to-[rgb(var(--accent3-rgb))] bg-clip-text text-transparent">
            {roles[index]}
          </span>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
