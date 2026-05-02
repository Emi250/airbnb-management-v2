"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";

export function AdminShell({
  displayName,
  children,
}: {
  displayName: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        displayName={displayName}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1">
          <div className="px-4 py-6 md:px-8 md:py-8 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
