import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateShort, whatsAppLink } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";

export default async function GuestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [gR, resR] = await Promise.all([
    supabase.from("guests").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("reservations")
      .select(`*, property:properties(name,color_hex)`)
      .eq("guest_id", id)
      .order("check_in", { ascending: false }),
  ]);
  const g = gR.data;
  if (!g) notFound();
  const res = resR.data ?? [];

  const total = res
    .filter((r) => r.status !== "cancelled")
    .reduce((acc, r) => acc + Number(r.total_amount_ars), 0);
  const wa = whatsAppLink(g.phone);

  return (
    <div>
      <PageHeader title={g.name} description={g.country ?? ""} />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Reservas</p>
            <p className="numeric mt-1.5 text-lg font-semibold">
              {res.filter((r) => r.status !== "cancelled").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Total gastado</p>
            <p className="numeric mt-1.5 text-lg font-semibold">{formatCurrency(total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs uppercase text-muted-foreground">Contacto</p>
            <p className="text-sm">{g.phone ?? "—"}</p>
            <p className="text-sm text-muted-foreground">{g.email ?? "—"}</p>
            {wa && (
              <Button asChild size="sm" variant="outline">
                <a href={wa} target="_blank" rel="noreferrer">
                  Abrir WhatsApp
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Propiedad</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Check-out</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {res.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <Link href={`/reservations/${r.id}`} className="hover:underline">
                  {r.property?.name}
                </Link>
              </TableCell>
              <TableCell>{formatDateShort(r.check_in)}</TableCell>
              <TableCell>{formatDateShort(r.check_out)}</TableCell>
              <TableCell className="numeric text-right">
                {formatCurrency(r.total_amount_ars)}
              </TableCell>
              <TableCell>
                <StatusBadge status={r.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
