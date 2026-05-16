# Diseño: Rediseño completo — Refugio del Corazón

> Rediseño integral de la app de gestión de alquileres temporarios. Re-marca a
> "Refugio del Corazón", nueva paleta y tipografía, reconstrucción del calendario,
> y rediseño de layout/jerarquía de todas las páginas del panel. Sin cambios de
> lógica de negocio ni funciones nuevas.

- **Fecha:** 2026-05-16
- **Stack:** Next.js 15, React 19, Tailwind v4 (beta), shadcn/Radix, Recharts, FullCalendar (instalado, no se usa), date-fns (`es`), framer-motion, Supabase.
- **Enfoque elegido:** re-skin in-place basado en tokens + rediseño de layout por página. Sin reconstruir el sistema de componentes desde cero. Sin cambios de esquema de base de datos.

## Problema

La app funciona pero su imagen es genérica y fría (índigo estilo plantilla SaaS),
y la marca actual ("Gestión Airbnb · Capilla del Monte") no refleja la identidad
del alojamiento. El calendario —la herramienta diaria de la madre del dueño, que
recibe a los huéspedes— está hoy resuelto como una tabla agrupada por propiedad,
poco legible en celular. Varias páginas del panel acumulan controles y datos sin
jerarquía clara.

## Solución

Una identidad coherente y cálida ("Refugio del Corazón"), un sistema de color y
tipografía nuevo, un calendario reconstruido como lista por día —legible y claro
en celular— y un rediseño de layout de cada página del panel para reducir ruido
y mejorar la jerarquía. La funcionalidad y los datos no cambian.

## Principios de diseño

1. **Calma sobre densidad.** Jerarquía tipográfica y espacio en blanco hacen el
   trabajo; el color es escaso y con intención.
2. **El calendario es para la madre.** Legibilidad total en celular, objetivos
   táctiles grandes, distinción de departamento imposible de confundir.
3. **El color fuerte se reserva para los departamentos y las señales de estado.**
   La marca (teal) no compite con ellos.
4. **Rediseñar sin inventar.** Se mejora layout y jerarquía; no se agregan
   funciones nuevas (única excepción: filtro por departamento en el calendario).

---

## Sección 1 — Marca e identidad

- **Nombre:** "Refugio del Corazón" reemplaza "Gestión Airbnb / Capilla del Monte"
  en sidebar, login, `<title>` de la pestaña, notificaciones de Telegram y PDFs.
  El sublabel "Capilla del Monte" se conserva como ubicación.
- **Logo:** se usa la imagen dorada provista tal cual (no hay versión transparente).
  Se muestra **recortada en círculo**: grande en el login sobre fondo crema, y en
  tamaño chico en el encabezado del sidebar. El recorte circular conserva el fondo
  crema interno del archivo — aceptable. El logo dorado convive con el chrome teal
  porque se le da aire propio (recuadro/círculo crema), no se coloca pegado al teal.
- **Departamentos:** se mantienen los nombres actuales "Airbnb 1" … "Airbnb 4".
- **Voz:** español rioplatense, calmo, sin signos de exclamación, sin emojis.
- **Modo claro y oscuro:** ambos se mantienen, configurables con interruptor
  (el componente `theme-provider` y el toggle del sidebar ya existen). El modo
  claro es el primario.

## Sección 2 — Sistema de color y tipografía

Se reescriben los tokens OKLCH en `app/globals.css` (`:root` y `.dark`) en su
lugar — no es un archivo nuevo. La base neutra pasa de gris azulado frío
(hue ~270) a **neutro cálido** (hue ~85–90).

**Color de marca (acento):** teal profundo. Claro ≈ `oklch(0.52 0.085 192)`
(referencia `#0f7d77`); oscuro elevado ≈ `oklch(0.72 0.10 192)`. Reemplaza el
índigo en `--primary`, `--accent`, `--ring`.

**Base neutra cálida:**
- Claro: `--background` crema cálido (`#f6f4f0` aprox.), `--card` blanco,
  `--foreground` carbón cálido, `--border`/`--muted`/`--secondary` grises cálidos.
- Oscuro: `--background` oscuro cálido (no azulado), `--card` un paso más claro.

**Colores de departamento** (campo `properties.color_hex`, usados en el calendario
y en gráficos). Se actualizan los 4 valores almacenados a:
- Airbnb 1 — terracota `#c06d4a`
- Airbnb 2 — azul `#3f6ea5`
- Airbnb 3 — verde `#5a8f4e`
- Airbnb 4 — ciruela `#9c5f86`

La actualización se hace sobre los datos (UPDATE de los 4 registros, vía la
página de Propiedades/Ajustes que ya edita `color_hex`, o un script SQL). No es
un cambio de esquema.

**Colores semánticos:** `--success` (cobrado, verde), `--warning` (pendiente,
ámbar), `--destructive` (cancelado, rojo), `--info` (azul). Se rearmonizan con la
base cálida manteniendo contraste WCAG AA en ambos modos.

**Tipografía:** se reemplaza **Inter por Geist** como sans (vía `next/font`,
actualizando `app/layout.tsx` y la variable `--font-sans` en `globals.css`). Para
números se mantiene **JetBrains Mono** (ya instalada y en uso) con cifras
tabulares — la clase `.numeric` y `td.numeric` siguen vigentes. Títulos compactos: peso y color para la jerarquía, no tamaños
exagerados.

## Sección 3 — Calendario (pantalla clave)

Se reconstruye `app/(admin)/calendar/calendar-view.tsx`. Deja de agrupar por
propiedad; pasa a **lista agrupada por día de llegada (check-in)**.

**Modelo de agrupación:** una entrada por reserva, agrupada bajo el día de su
check-in. No se duplican entradas para la salida. Los días sin llegadas no se
renderizan (la lista queda corta).

**Anatomía de cada entrada:**
- Distinción de departamento: borde izquierdo grueso en el color del depto +
  etiqueta sólida con el nombre del depto en ese color.
- Nombre del huésped (prominente).
- Fechas check-in → check-out.
- Cantidad de noches.
- Cantidad de huéspedes.
- Celular, con acciones Llamar (`tel:`) y WhatsApp (`whatsAppLink`).
- **No se muestran montos de plata** — el calendario es una guía operativa limpia;
  la información financiera vive en Reservas y Dashboard.

**Encabezados de día:** fecha en español; el día de hoy se marca con acento teal
("HOY"); los días próximos muestran contexto ("en 2 días"). Las llegadas de hoy
llevan un marcador "Llega hoy".

**Barra de filtros (calma, minimalista):** buscar huésped/teléfono, selector de
mes, **filtro por departamento (nuevo)**, filtro de estado, toggle "mostrar
pasadas". Se conserva el comportamiento de URL params actual.

**Responsive:** la lista es idéntica en todos los tamaños. En celular las
tarjetas se agrandan, el texto sube de tamaño y los botones Llamar/WhatsApp
ocupan todo el ancho con objetivos táctiles ≥44px.

## Sección 4 — Navegación, login y aplicación del sistema

- **Sidebar (`components/sidebar.tsx`):** reemplaza el monograma "AB" por el logo
  circular + "Refugio del Corazón". Estado activo con acento teal. Toggle de tema
  y cerrar sesión se mantienen.
- **Login (`app/(auth)/login/`):** logo circular grande sobre fondo crema, marca,
  campos de correo/contraseña, botón teal.
- **Telegram y PDFs:** el nombre "Refugio del Corazón" reemplaza la marca anterior
  en `lib/notifications/*` y los componentes de `@react-pdf/renderer`.
- **Agenda del cuidador (`app/(caretaker)/agenda/`):** se re-pinta con el sistema
  nuevo; se mantiene como pantalla de respaldo (la madre usa el Calendario).
- Todas las páginas adoptan los mismos tokens, Geist, radios y bordes
  consistentes; etiquetas de estado siempre con color **y** texto.

## Sección 5 — Responsive y accesibilidad

**Responsive:** breakpoints estándar — móvil `<768px`, tablet `768–1280px`,
desktop `≥1280px`. Sidebar fijo en desktop, cajón deslizable en móvil (ya existe).
Tablas → tarjetas apiladas en móvil (patrón ya presente). Contenedores con ancho
máximo y centrados; sin scroll horizontal.

**Accesibilidad:** contraste WCAG 2.1 AA en texto y etiquetas en ambos modos; el
color nunca es la única señal (etiquetas de depto con nombre, estados con texto);
objetivos táctiles ≥44px; anillos de foco visibles desde `--ring`; se respeta
`prefers-reduced-motion` (ya implementado en `globals.css`).

## Sección 6 — Rediseño de layout del Dashboard y páginas restantes

Rediseño de **layout y jerarquía**, sin funciones nuevas.

**Dashboard** (`app/(admin)/dashboard/`):
- Un número héroe (Ingresos del mes vs. objetivo) en grande, con chip de
  on-track y delta MoM como contexto secundario.
- 3 KPIs de apoyo más chicos (Beneficio neto, Ocupación, Saldo pendiente) en vez
  de 4 tarjetas de igual peso.
- Un solo gráfico: ingresos de 12 meses, mes actual destacado, con línea objetivo.
- "Análisis por departamento" como lista limpia (color + ocupación + monto), en
  reemplazo del donut. Se reutilizan los componentes existentes (`hero-kpi`,
  `secondary-kpi`, `kpi-target-popover`, `on-track-badge`, charts) restilados.

**Reservas** (`app/(admin)/reservations/`): panel de filtros colapsable (no 6
filas en celular); tabla reordenada por prioridad de tarea (depto, huésped,
fechas, estado de pago); tarjetas en móvil; botón Exportar visible.

**Gastos** (`app/(admin)/expenses/`): KPI del mes arriba; donut y grilla de
categorías equilibrados; la checklist de gastos fijos sale del medio de la página
a su propio bloque; el historial usa los colores de categoría.

**Huéspedes** (`app/(admin)/guests/`): tabla ordenable (por gasto, recencia,
cantidad de reservas); acciones rápidas Llamar/WhatsApp por fila; "última estadía"
enlaza a la reserva.

**Propiedades** (`app/(admin)/properties/`): tarjetas de grilla con más señal
(ocupación, ingreso del mes, próxima reserva); la página de detalle muestra el
swatch de color del depto.

**Reportes** (`app/(admin)/reports/`): pagos pendientes al frente; las plantillas
de export agrupadas por uso (operativas / contables); se quita la tabla de
previsualización redundante al pie.

**Ajustes** (`app/(admin)/settings/`): formularios de propiedad más compactos;
aviso visible cuando el tipo de cambio está desactualizado; selector de color
consistente con la grilla de Propiedades.

## Fases de implementación

El diseño es uno solo; la implementación se ejecuta por fases para reducir riesgo:

1. **Tokens y marca** — `globals.css`, Geist en `layout.tsx`, nombre/logo,
   Telegram/PDFs, actualización de `color_hex`.
2. **Calendario** — reconstrucción de `calendar-view.tsx`.
3. **Dashboard** — rediseño de jerarquía y secciones.
4. **Resto de páginas** — Reservas, Gastos, Huéspedes, Propiedades, Reportes,
   Ajustes; sidebar/login/agenda.

## Fuera de alcance

- Cambios de esquema de base de datos.
- Cambios de lógica de negocio, cálculos de analytics, auth o roles.
- Funciones nuevas (salvo el filtro por departamento del calendario).
- Adopción de FullCalendar — el calendario queda como lista.
- Funciones que el audit sugirió pero no se piden: comunicación con huéspedes,
  audit log, programación de reportes, edición masiva, importación CSV.
- Shims de compatibilidad: el código de widgets removidos se elimina, no se oculta.
