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
import { formatCurrency, formatDateShort } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { Users } from "lucide-react";

export default async function GuestsPage() {
  const supabase = await createClient();
  const [guestsR, resR] = await Promise.all([
    supabase.from("guests").select("*").order("name"),
    supabase.from("reservations").select("guest_id, total_amount_ars, status, check_in"),
  ]);
  const guests = guestsR.data ?? [];
  const res = resR.data ?? [];

  const stats = new Map<
    string,
    { count: number; total: number; lastStay: string | null }
  >();
  for (const r of res) {
    if (!r.guest_id || r.status === "cancelled") continue;
    const cur = stats.get(r.guest_id) ?? { count: 0, total: 0, lastStay: null };
    cur.count += 1;
    cur.total += Number(r.total_amount_ars);
    if (!cur.lastStay || r.check_in > cur.lastStay) cur.lastStay = r.check_in;
    stats.set(r.guest_id, cur);
  }

  return (
    <div>
      <PageHeader title="Huéspedes" description={`${guests.length} huéspedes registrados`} />
      {guests.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="Sin huéspedes registrados"
          description="Los huéspedes se crean al cargar reservas."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>País</TableHead>
              <TableHead className="text-right">Reservas</TableHead>
              <TableHead className="text-right">Total gastado</TableHead>
              <TableHead>Última estadía</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guests.map((g) => {
              const s = stats.get(g.id) ?? { count: 0, total: 0, lastStay: null };
              return (
                <TableRow key={g.id}>
                  <TableCell>
                    <Link href={`/guests/${g.id}`} className="font-medium hover:underline">
                      {g.name}
                    </Link>
                  </TableCell>
                  <TableCell>{g.phone ?? "—"}</TableCell>
                  <TableCell>{g.email ?? "—"}</TableCell>
                  <TableCell>{g.country ?? "—"}</TableCell>
                  <TableCell className="numeric text-right">{s.count}</TableCell>
                  <TableCell className="numeric text-right">{formatCurrency(s.total)}</TableCell>
                  <TableCell>{s.lastStay ? formatDateShort(s.lastStay) : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
