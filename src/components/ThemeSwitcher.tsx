"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ThemeControls from "@/components/ThemeControls";

/**
 * Floating theme picker FAB. Shown on all screen sizes, but only after the
 * user scrolls past the Hero (mirrors ScrollToTop's pattern) so it can never
 * overlap the Hero's stats/content on initial mobile load. The same controls
 * are also duplicated in the Navbar's mobile menu for instant access before
 * any scrolling.
 */
export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3">
      <AnimatePresence>
        {open && show && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="order-2 rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-xl"
          >
            <ThemeControls />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {show && (
          <motion.button
            type="button"
            onClick={() => setOpen((v) => !v)}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            whileHover={{ scale: 1.08, rotate: open ? 0 : 12 }}
            whileTap={{ scale: 0.92 }}
            aria-label="Open theme settings"
            className="bg-accent-grad shadow-accent order-1 flex h-11 w-11 items-center justify-center rounded-full text-slate-950 sm:h-12 sm:w-12"
          >
            <motion.svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{ rotate: open ? 45 : 0 }}
            >
              <circle cx="12" cy="12" r="3.2" />
              <path d="M12 3v2.4M12 18.6V21M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M3 12h2.4M18.6 12H21M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
            </motion.svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
