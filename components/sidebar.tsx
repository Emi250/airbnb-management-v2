"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  ListChecks,
  Building2,
  Users,
  Receipt,
  FileText,
  Settings,
  LogOut,
  Sun,
  Moon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(auth)/login/actions";
import { useTheme } from "@/components/theme-provider";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendario", icon: Calendar },
  { href: "/reservations", label: "Reservas", icon: ListChecks },
  { href: "/properties", label: "Propiedades", icon: Building2 },
  { href: "/guests", label: "Huéspedes", icon: Users },
  { href: "/expenses", label: "Gastos", icon: Receipt },
  { href: "/reports", label: "Reportes", icon: FileText },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function Sidebar({
  displayName,
  mobileOpen,
  onMobileClose,
}: {
  displayName: string;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground font-mono text-sm font-bold">
              AB
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Gestión Airbnb</p>
              <p className="text-xs text-muted-foreground">Capilla del Monte</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onMobileClose}
            className="md:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onMobileClose}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "border-l-2 border-primary bg-secondary text-foreground font-semibold"
                    : "border-l-2 border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-primary")} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3 space-y-2">
          <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground">Sesión</p>
              <p className="truncate font-medium">{displayName}</p>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-secondary"
              aria-label="Cambiar tema"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>
    </>
  );
}
