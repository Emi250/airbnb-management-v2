import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <p className="text-sm font-mono uppercase text-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl font-semibold">Página no encontrada</h1>
        <p className="mt-2 text-muted-foreground">El recurso solicitado no existe o fue movido.</p>
        <Button asChild className="mt-6">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </main>
  );
}
