import { LoginForm } from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground font-mono text-lg font-bold">
            AB
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">Gestión Airbnb</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Capilla del Monte · Plataforma interna
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
