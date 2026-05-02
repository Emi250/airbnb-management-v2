"use client";

import { Menu, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-secondary"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground font-mono text-xs font-bold">
          AB
        </div>
        <span className="text-sm font-semibold">Gestión Airbnb</span>
      </div>
      <button
        type="button"
        onClick={toggle}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-secondary"
        aria-label="Cambiar tema"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </header>
  );
}
