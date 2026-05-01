import { createClient } from "@/lib/supabase/server";
import { format, addDays, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Phone, MessageCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(auth)/login/actions";
import { whatsAppLink, telLink } from "@/lib/format";

export default async function AgendaPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("caretaker_agenda")
    .select("*")
    .order("check_in");

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const in7 = addDays(today, 7);

  const list = rows ?? [];
  const checkInsToday = list.filter((r) => isSameDay(parseISO(r.check_in), today));
  const checkOutsToday = list.filter((r) => isSameDay(parseISO(r.check_out), today));
  const checkInsTomorrow = list.filter((r) => isSameDay(parseISO(r.check_in), tomorrow));
  const checkOutsTomorrow = list.filter((r) => isSameDay(parseISO(r.check_out), tomorrow));
  const upcoming7 = list.filter(
    (r) =>
      parseISO(r.check_in) > tomorrow &&
      parseISO(r.check_in) <= in7
  );

  const ownerPhone = "+5491100000000"; // placeholder — caretaker only sees a "Llamar a Emilio" button
  const ownerTel = telLink(ownerPhone) ?? "tel:+5491100000000";

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-10 md:py-10">
      <header className="mx-auto max-w-3xl mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-base text-muted-foreground capitalize">
            {format(today, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">Agenda</h1>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut className="h-4 w-4" />
            Salir
          </Button>
        </form>
      </header>

      <div className="mx-auto max-w-3xl space-y-10">
        <Section title="HOY">
          <Subsection label="Llegadas">
            {checkInsToday.length === 0 ? (
              <Empty text="Sin llegadas hoy" />
            ) : (
              checkInsToday.map((r) => <BigCard key={r.id} row={r} kind="checkin" />)
            )}
          </Subsection>
          <Subsection label="Salidas">
            {checkOutsToday.length === 0 ? (
              <Empty text="Sin salidas hoy" />
            ) : (
              checkOutsToday.map((r) => <BigCard key={r.id} row={r} kind="checkout" />)
            )}
          </Subsection>
        </Section>

        <Section title="MAÑANA">
          <Subsection label="Llegadas">
            {checkInsTomorrow.length === 0 ? (
              <Empty text="Sin llegadas mañana" />
            ) : (
              checkInsTomorrow.map((r) => <BigCard key={r.id} row={r} kind="checkin" />)
            )}
          </Subsection>
          <Subsection label="Salidas">
            {checkOutsTomorrow.length === 0 ? (
              <Empty text="Sin salidas mañana" />
            ) : (
              checkOutsTomorrow.map((r) => <BigCard key={r.id} row={r} kind="checkout" />)
            )}
          </Subsection>
        </Section>

        <Section title="PRÓXIMOS 7 DÍAS">
          {upcoming7.length === 0 ? (
            <Empty text="Sin reservas próximas" />
          ) : (
            <ul className="space-y-3">
              {upcoming7.map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl border-2 border-border bg-card p-5 text-lg"
                  style={{ borderLeftColor: r.property_color ?? "#A47148", borderLeftWidth: 8 }}
                >
                  <p className="font-semibold capitalize">
                    {format(parseISO(r.check_in), "EEEE d 'de' MMM", { locale: es })}
                  </p>
                  <p className="mt-1 text-base">
                    {r.guest_name ?? "Sin nombre"} · {r.property_name}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="mt-12">
          <a
            href={ownerTel}
            className="flex items-center justify-center gap-3 rounded-2xl bg-primary py-5 text-xl font-semibold text-primary-foreground shadow-md"
          >
            <Phone className="h-6 w-6" />
            Llamar a Emilio
          </a>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Subsection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-base font-semibold text-muted-foreground">{label}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-border px-5 py-4 text-base text-muted-foreground">{text}</p>;
}

type Row = {
  id: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  notes: string | null;
  property_name: string;
  property_address: string | null;
  property_color: string | null;
  guest_name: string | null;
  guest_phone: string | null;
};

function BigCard({ row, kind }: { row: Row; kind: "checkin" | "checkout" }) {
  const wa = whatsAppLink(row.guest_phone);
  const tel = telLink(row.guest_phone);
  return (
    <article
      className="rounded-2xl border-2 border-border bg-card p-6 shadow-sm"
      style={{ borderLeftColor: row.property_color ?? "#A47148", borderLeftWidth: 10 }}
    >
      <p className="text-sm font-semibold uppercase text-muted-foreground">
        {kind === "checkin" ? "Llegada" : "Salida"}
      </p>
      <h3 className="mt-2 text-2xl font-bold leading-tight">{row.guest_name ?? "Sin nombre"}</h3>
      <p className="mt-1 text-lg">{row.property_name}</p>
      {row.property_address && (
        <p className="mt-1 text-base text-muted-foreground">{row.property_address}</p>
      )}
      <p className="mt-3 text-base">
        {row.num_guests} {row.num_guests === 1 ? "huésped" : "huéspedes"}
      </p>
      {row.notes && (
        <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-base">{row.notes}</p>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        {tel && (
          <a
            href={tel}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-border px-5 py-3 text-base font-semibold"
          >
            <Phone className="h-5 w-5" />
            Llamar
          </a>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-base font-semibold text-white"
          >
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </a>
        )}
      </div>
    </article>
  );
}
