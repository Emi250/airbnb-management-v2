import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center text-center">
          <BrandLogo size="lg" />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">
            Refugio del Corazón
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Capilla del Monte · Gestión de reservas
          </p>
        </div>
        <LoginFormBoundary searchParams={searchParams} />
      </div>
    </main>
  );
}

async function LoginFormBoundary({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const initialError =
    params.error === "no_role"
      ? "Tu usuario no tiene un rol asignado. Contactá al administrador."
      : null;
  return <LoginForm initialError={initialError} />;
}
