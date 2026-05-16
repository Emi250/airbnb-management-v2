"use client";

import { Menu, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { BrandLogo } from "@/components/brand-logo";

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
        <BrandLogo size="sm" />
        <span className="text-sm font-semibold">Refugio del Corazón</span>
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
