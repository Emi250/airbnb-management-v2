import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-10 md:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-32" />
      </div>
    </main>
  );
}
