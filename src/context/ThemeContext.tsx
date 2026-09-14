"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

export type ColorTheme = "aurora" | "ocean" | "sunset" | "emerald" | "royal";
export type Mode = "dark" | "light";

export const colorThemes: { id: ColorTheme; label: string; swatch: string[] }[] = [
  { id: "aurora", label: "Aurora", swatch: ["#d946ef", "#a855f7", "#22d3ee"] },
  { id: "ocean", label: "Ocean", swatch: ["#0ea5e9", "#06b6d4", "#2dd4bf"] },
  { id: "sunset", label: "Sunset", swatch: ["#f97316", "#f43f5e", "#fbbf24"] },
  { id: "emerald", label: "Emerald", swatch: ["#10b981", "#14b8a6", "#a3e635"] },
  { id: "royal", label: "Royal", swatch: ["#6366f1", "#a855f7", "#ec4899"] },
];

type ThemeContextValue = {
  colorTheme: ColorTheme;
  mode: Mode;
  setColorTheme: (t: ColorTheme) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY_THEME = "portfolio-color-theme";
const STORAGE_KEY_MODE = "portfolio-mode";

function readStored<T extends string>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return (window.localStorage.getItem(key) as T | null) ?? fallback;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() =>
    readStored(STORAGE_KEY_THEME, "aurora")
  );
  const [mode, setModeState] = useState<Mode>(() => readStored(STORAGE_KEY_MODE, "dark"));

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", colorTheme);
  }, [colorTheme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
  }, [mode]);

  const setColorTheme = useCallback((t: ColorTheme) => {
    setColorThemeState(t);
    window.localStorage.setItem(STORAGE_KEY_THEME, t);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem(STORAGE_KEY_MODE, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ colorTheme, mode, setColorTheme, toggleMode }),
    [colorTheme, mode, setColorTheme, toggleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
