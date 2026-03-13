"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ThemeCtxType = { isDark: boolean; toggle: () => void };
const ThemeCtx = createContext<ThemeCtxType>({ isDark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Sync with class already applied by the anti-flash script in layout
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
      return next;
    });
  }

  return <ThemeCtx.Provider value={{ isDark, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
