"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
type ThemeContextValue = { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("theme")) as Theme | null;
    const initial = stored ?? defaultTheme;
    setThemeState(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, [defaultTheme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("theme", t);
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
