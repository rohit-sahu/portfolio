"use client";

import { motion } from "framer-motion";
import { colorThemes, useTheme } from "@/context/ThemeContext";

export function SunMoonIcon({ mode }: { mode: "dark" | "light" }) {
  return (
    <motion.svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      initial={false}
      animate={{ rotate: mode === "dark" ? 0 : 180 }}
      transition={{ type: "spring", stiffness: 200, damping: 16 }}
    >
      {mode === "dark" ? (
        <motion.g
          key="moon"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <path
            d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </motion.g>
      ) : (
        <motion.g
          key="sun"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </motion.g>
      )}
    </motion.svg>
  );
}

/** Shared color-theme swatches + dark/light toggle, reused by the desktop
 * floating switcher and the mobile nav menu so controls never overlap content. */
export default function ThemeControls({ compact = false }: { compact?: boolean }) {
  const { colorTheme, mode, setColorTheme, toggleMode } = useTheme();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Color Theme
      </p>
      <div className="flex items-center gap-2.5">
        {colorThemes.map((t) => (
          <motion.button
            key={t.id}
            type="button"
            aria-label={t.label}
            onClick={() => setColorTheme(t.id)}
            whileHover={{ scale: 1.15, y: -2 }}
            whileTap={{ scale: 0.9 }}
            className={`relative rounded-full border-2 transition ${compact ? "h-7 w-7" : "h-8 w-8"} ${
              colorTheme === t.id ? "border-white" : "border-transparent"
            }`}
            style={{
              background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]}, ${t.swatch[2]})`,
            }}
            title={t.label}
          >
            {colorTheme === t.id && (
              <motion.span
                layoutId={compact ? "theme-check-mobile" : "theme-check"}
                className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white"
              />
            )}
          </motion.button>
        ))}
      </div>

      <div className="mt-1 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          {mode === "dark" ? "Dark Mode" : "Light Mode"}
        </p>
        <motion.button
          type="button"
          onClick={toggleMode}
          whileTap={{ scale: 0.9 }}
          aria-label="Toggle dark / light mode"
          className="bg-accent-grad flex h-7 w-7 items-center justify-center rounded-full text-slate-950 shadow-accent"
        >
          <SunMoonIcon mode={mode} />
        </motion.button>
      </div>
    </div>
  );
}
