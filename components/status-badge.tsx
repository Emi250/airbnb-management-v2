import { Badge } from "@/components/ui/badge";
import type { ReservationStatus } from "@/types/supabase";

const LABEL: Record<ReservationStatus, string> = {
  confirmed: "Confirmada",
  pending: "Pendiente",
  cancelled: "Cancelada",
  completed: "Completada",
};

const VARIANT: Record<ReservationStatus, "default" | "warning" | "destructive" | "success" | "secondary"> = {
  confirmed: "success",
  pending: "warning",
  cancelled: "destructive",
  completed: "secondary",
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}

export function PaidBadge({ paid, total }: { paid: number; total: number }) {
  if (paid >= total && total > 0) return <Badge variant="success">Pagada</Badge>;
  if (paid === 0) return <Badge variant="destructive">Impaga</Badge>;
  return <Badge variant="warning">Parcial</Badge>;
}
