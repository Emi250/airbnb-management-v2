"use client";

import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-sm font-mono uppercase text-muted-foreground">Error</p>
        <h1 className="mt-2 text-2xl font-semibold">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted-foreground break-words">
          {error.message || "Se produjo un error inesperado."}
        </p>
        <Button onClick={reset} className="mt-6">
          Reintentar
        </Button>
      </div>
    </main>
  );
}
