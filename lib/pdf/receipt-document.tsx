import {
  Document,
  Font,
  Image as PdfImage,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ReceiptData, ReceiptKind } from "./receipt-data";

// Helvetica parte palabras a mitad si no se desactiva la silabación, y en
// español queda feo ("trans-ferencia").
Font.registerHyphenationCallback((word) => [word]);

// Tokens de app/globals.css convertidos de OKLCH a sRGB: react-pdf no entiende
// oklch().
const C = {
  primary: "#137875",
  ink: "#201c17",
  muted: "#68625b",
  border: "#e0ded8",
  surface: "#f4f1ed",
  paper: "#fcfaf6",
};

const MARCA = "El Refugio del Corazón";
const WEB = "www.refugiodelcorazon.com.ar";
const URL_BASE = `https://${WEB}`;

const s = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingHorizontal: 56,
    // Deja lugar al pie fijo de tres líneas.
    paddingBottom: 92,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
    color: C.ink,
    backgroundColor: C.paper,
    textAlign: "center",
  },

  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  logo: { width: 54, height: 54, borderRadius: 27 },
  brandBlock: { flexGrow: 1, textAlign: "left" },
  brand: { fontFamily: "Helvetica-Bold", fontSize: 17, color: C.primary },
  tagline: {
    fontSize: 7,
    letterSpacing: 1.2,
    color: C.muted,
    marginTop: 3,
  },
  rule: {
    borderBottomWidth: 1.5,
    borderBottomColor: C.primary,
    marginTop: 14,
  },

  titleBlock: { marginTop: 26 },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    letterSpacing: 2,
    color: C.primary,
  },
  meta: { fontSize: 8.5, color: C.muted, marginTop: 5 },

  lead: { marginTop: 30, color: C.muted },
  guestName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: C.ink,
    marginTop: 8,
    marginBottom: 2,
  },
  guestContact: { fontSize: 8.5, color: C.muted, marginBottom: 8 },
  body: { marginTop: 2, paddingHorizontal: 16 },

  amounts: {
    flexDirection: "row",
    marginTop: 28,
    backgroundColor: C.surface,
    borderRadius: 8,
    paddingVertical: 16,
  },
  amountCell: { flexGrow: 1, flexBasis: 0, paddingHorizontal: 8 },
  amountDivider: { borderLeftWidth: 0.5, borderLeftColor: C.border },
  amountLabel: { fontSize: 7, letterSpacing: 1.1, color: C.muted },
  amountValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    color: C.ink,
    marginTop: 6,
  },
  amountValueStrong: { color: C.primary },
  currencyNote: { fontSize: 8, color: C.muted, marginTop: 10 },

  section: { marginTop: 24 },
  sectionTitle: {
    fontSize: 7.5,
    letterSpacing: 1.4,
    color: C.primary,
    fontFamily: "Helvetica-Bold",
  },
  sectionBody: { marginTop: 7, paddingHorizontal: 16, color: C.muted },
  strong: { fontFamily: "Helvetica-Bold", color: C.ink },
  link: {
    color: C.primary,
    fontFamily: "Helvetica-Bold",
    textDecoration: "underline",
  },

  footer: {
    position: "absolute",
    bottom: 36,
    left: 56,
    right: 56,
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 10,
    fontSize: 8,
    color: C.muted,
  },
});

const LEAD: Record<ReceiptKind, string> = {
  sena: "Se deja constancia de la recepción de la seña abonada por",
  "pago-total": "Se deja constancia de la recepción del pago total abonado por",
  reserva: "Se deja constancia de la reserva registrada a nombre de",
};

function Amount({
  label,
  value,
  strong,
  divider,
}: {
  label: string;
  value: string;
  strong?: boolean;
  divider?: boolean;
}) {
  return (
    <View style={[s.amountCell, ...(divider ? [s.amountDivider] : [])]}>
      <Text style={s.amountLabel}>{label}</Text>
      <Text style={[s.amountValue, ...(strong ? [s.amountValueStrong] : [])]}>
        {value}
      </Text>
    </View>
  );
}

function Amounts({ data }: { data: ReceiptData }) {
  if (data.kind === "reserva") {
    return (
      <View style={s.amounts}>
        <Amount label="VALOR TOTAL" value={data.importes.total} />
        <Amount
          label="SALDO A ABONAR"
          value={data.importes.saldo}
          strong
          divider
        />
      </View>
    );
  }
  return (
    <View style={s.amounts}>
      <Amount
        label={data.kind === "pago-total" ? "TOTAL ABONADO" : "SEÑA RECIBIDA"}
        value={data.importes.sena}
      />
      <Amount label="VALOR TOTAL" value={data.importes.total} divider />
      <Amount
        label="SALDO PENDIENTE"
        value={data.importes.saldo}
        strong
        divider
      />
    </View>
  );
}

function PaymentTerms({ data }: { data: ReceiptData }) {
  if (data.kind === "pago-total") {
    return (
      <Text style={s.sectionBody}>
        La reserva se encuentra abonada en su totalidad. No queda saldo
        pendiente al momento del ingreso.
      </Text>
    );
  }
  const monto = data.kind === "sena" ? data.importes.saldo : data.importes.total;
  const encabezado =
    data.kind === "sena" ? "El saldo restante de" : "El total de";
  return (
    <Text style={s.sectionBody}>
      {encabezado} <Text style={s.strong}>{monto}</Text> podrá abonarse en
      efectivo o por transferencia bancaria al momento de la llegada.
    </Text>
  );
}

export function ReceiptDocument({
  data,
  logo,
}: {
  data: ReceiptData;
  logo: Buffer | null;
}) {
  return (
    <Document
      title={`${data.titulo} ${data.numero}`}
      author={MARCA}
      subject={`Reserva de ${data.huesped.nombre}`}
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {logo ? <PdfImage src={{ data: logo, format: "jpg" }} style={s.logo} /> : null}
          <View style={s.brandBlock}>
            <Text style={s.brand}>{MARCA}</Text>
            <Text style={s.tagline}>
              ALQUILER TEMPORARIO · CAPILLA DEL MONTE, CÓRDOBA
            </Text>
          </View>
        </View>
        <View style={s.rule} />

        <View style={s.titleBlock}>
          <Text style={s.title}>{data.titulo.toUpperCase()}</Text>
          <Text style={s.meta}>
            N° {data.numero} · Emitido el {data.emitido}
          </Text>
        </View>

        <Text style={s.lead}>{LEAD[data.kind]}</Text>
        <Text style={s.guestName}>{data.huesped.nombre}</Text>
        {data.huesped.contacto ? (
          <Text style={s.guestContact}>{data.huesped.contacto}</Text>
        ) : null}
        <Text style={s.body}>
          correspondiente a la reserva del{" "}
          <Text style={s.strong}>{data.alojamiento}</Text> en {MARCA}, para la
          estadía comprendida {data.estadia.rango} ({data.estadia.detalle}).
        </Text>

        <Amounts data={data} />
        <Text style={s.currencyNote}>
          Importes expresados en pesos argentinos (ARS).
        </Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>CONDICIONES DE PAGO</Text>
          <PaymentTerms data={data} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>SERVICIOS INCLUIDOS</Text>
          <Text style={s.sectionBody}>
            Los servicios brindados son los establecidos en el sitio web{" "}
            <Link style={s.link} src={`${URL_BASE}/servicios/`}>
              {`${WEB}/servicios/`}
            </Link>
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>INFORMACIÓN DE LA ESTADÍA</Text>
          <Text style={s.sectionBody}>
            Check-in: a partir de las 14:00 hs. · Check-out: hasta las 10:00 hs.
            {"\n"}
            Las condiciones de cancelación se encuentran disponibles en{" "}
            <Link style={s.link} src={`${URL_BASE}/faq/`}>
              {`${WEB}/faq/`}
            </Link>
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text>Río Negro 64 · Capilla del Monte · Córdoba</Text>
          <Text>{MARCA} · Tu refugio en las sierras de Córdoba</Text>
          <Link style={s.link} src={URL_BASE}>
            {WEB}
          </Link>
        </View>
      </Page>
    </Document>
  );
}
