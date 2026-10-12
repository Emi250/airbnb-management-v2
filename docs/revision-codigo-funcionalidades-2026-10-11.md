# Revisión de código y funcionalidades
Fecha: 11 de octubre de 2026. Proyecto: Refugio del Corazón. Revisión de la copia local, commit base `7067710`.

La prioridad es mejorar la confiabilidad de la base interna: permisos efectivos, reservas sin superposición, saldos verificables y reportes completos. La estructura actual permite hacerlo sin reescribir el sitio.

## Alcance y evidencia

Se revisaron autenticación, roles, migraciones, reservas, huéspedes, calendario, agenda, gastos, dashboard, reportes, comprobantes y sincronización con Notion. Se ejecutaron comprobaciones locales con datos ficticios sobre las funciones originales.

Los hallazgos de base de datos describen las migraciones del repositorio. No se verificó si producción tiene modificaciones manuales adicionales, ni se ejecutaron escrituras, envíos de mensajes o pruebas con cuentas reales. Esta revisión no incluye una prueba visual autenticada en navegador.

P1 = prioridad alta por confidencialidad, integridad o cifras engañosas. P2 = corrección funcional. P3 = mantenimiento.

## Hallazgos prioritarios

### 1. [P1] La encargada puede leer columnas financieras directamente

**Ubicación:** [política de reservas](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/supabase/migrations/0001_init.sql:180).

La política permite leer las filas recientes y futuras completas de `reservations` al rol `caretaker`. Proyectar menos columnas en la agenda no impide consultar `total_amount_ars` y `amount_paid_ars` por la API de datos. La lectura de propiedades también incluye precios.

**Acción:** cerrar la lectura directa de datos financieros para ese rol y exponer únicamente los campos operativos mediante una interfaz de base de datos con autorización explícita. Verificar tanto consultas directas como acceso a la agenda. RLS filtra filas; no elimina columnas por sí sola, como explica la [documentación de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

**Aceptación:** una cuenta de encargada obtiene nombres, fechas y contactos permitidos, pero no importes, incluso consultando la API fuera de la web.

### 2. [P1] La vista de agenda no exige un rol operativo autorizado

**Ubicación:** [definición de la vista](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/supabase/migrations/0001_init.sql:194).

Se concede lectura a todo `authenticated`; la vista no verifica `current_user_role()` ni declara `security_invoker`. Creada por el propietario habitual desde el SQL Editor, puede eludir RLS y revelar nombres, teléfonos y notas a una cuenta autenticada sin rol asignado. El bloqueo de páginas en Next.js no cubre esa consulta directa. Supabase documenta este comportamiento de [vistas y RLS](https://supabase.com/docs/guides/database/postgres/row-level-security#views-and-rls).

**Acción:** diseñar conjuntamente la proyección segura del punto 1 y la autorización de la vista o función. No basta con cambiar una opción de la vista dejando accesibles las tablas completas.

**Aceptación:** probar explícitamente usuario anónimo, usuario autenticado sin rol, encargada, manager y administrador. Solo los roles previstos acceden a la agenda.

### 3. [P1] El control de superposición no garantiza exclusión con escrituras simultáneas

**Ubicación:** [trigger de reservas](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/supabase/migrations/0001_init.sql:115).

El trigger hace `if exists` sin una restricción de exclusión o bloqueo que serialice las altas. Dos transacciones concurrentes pueden consultar antes de que la otra confirme y aceptar la misma propiedad y fechas.

**Acción:** incorporar una restricción de exclusión por propiedad y rango de fechas, excluyendo canceladas; revisar conflictos existentes antes de aplicarla. PostgreSQL muestra este patrón para [reservas no superpuestas](https://www.postgresql.org/docs/current/rangetypes.html#RANGETYPES-CONSTRAINT).

**Aceptación:** lanzar dos altas concurrentes con fechas coincidentes: exactamente una debe guardarse. Un check-out y check-in el mismo día deben seguir permitidos. Hallazgo por análisis del esquema; no se corrió concurrencia contra producción.

### 4. [P1] El saldo pendiente desaparece sin registrar un cobro

**Ubicación:** [outstandingBalance](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/lib/analytics.ts:48).

Una reserva confirmada o completada con check-in pasado se considera saldada aunque `amount_paid_ars` siga siendo menor que el total. El detalle y los reportes conservan el saldo, por lo que las pantallas se contradicen.

**Reproducción local:** total 100.000, pagado 30.000, check-in pasado: el indicador devuelve **0**, cuando la diferencia registrada es **70.000**.

**Acción:** calcular el saldo a partir de pagos registrados. Si existe una regla de cobro automático al ingresar, debe producir un movimiento explícito y auditable, no ocultar la deuda.

### 5. [P2] El dashboard pierde la última noche del período

**Ubicación:** [occupancyRate](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/lib/analytics.ts:73).

Se recorta la estancia al final del último día y luego se cuentan días completos. Se mezcla un período con último día incluido con un check-out exclusivo.

**Reproducciones locales:** estancia del 1 de octubre al 1 de noviembre, una propiedad: **96,77%** en lugar de **100%**. Estancia del 31 de octubre al 1 de noviembre: **0 noches** en octubre en lugar de **1**.

**Acción:** usar intervalos de noches consistentes, con fin exclusivo al inicio del día siguiente al cierre del período. Unificar el cálculo con el helper de reportes que ya contempla esa convención.

### 6. [P2] Los reportes omiten ocupación de reservas iniciadas antes del período

**Ubicación:** [filtro de reportes](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(admin)/reports/reports-client.tsx:97).

La selección conserva solo check-ins dentro del período. Esa misma lista alimenta ocupación y exportaciones de ocupación, aunque una estancia anterior pueda ocupar noches dentro del rango.

**Reproducción local:** reserva del 30 de septiembre al 3 de octubre; el reporte de octubre contabiliza **0** noches en lugar de **2**.

**Acción:** separar el criterio de ingresos por fecha de llegada del criterio de ocupación por intersección de fechas. Dashboard, indicador de reportes y CSV deben concordar.

### 7. [P1] Los listados y totales pueden quedar incompletos al crecer la base

**Ubicaciones:** [dashboard](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(admin)/dashboard/page.tsx:8), [consulta de reservas](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/lib/queries/reservations.ts:35), [reportes](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(admin)/reports/page.tsx:8).

Se carga el historial con una única consulta sin paginación, y después se filtra o suma en memoria. Cuando se alcanza el límite de respuesta de la API, faltan registros sin una advertencia. El dashboard ordena ascendente: el recorte puede dejar afuera los datos más recientes.

Supabase documenta un límite predeterminado de 1.000 filas, configurable; **no se comprobó el valor del proyecto**. Ver [límites de consulta](https://supabase.com/docs/reference/python/select).

**Acción:** filtros y paginación en servidor para listas, agregaciones en base de datos para KPIs y lectura completa por lotes para exportaciones. Incluir orden estable y conteo total.

**Aceptación:** cargar más registros que el límite configurado en un entorno de prueba y contrastar búsqueda, totales y exportación con SQL.

### 8. [P1] Un error de consulta se presenta como ausencia de datos

**Ubicaciones:** [dashboard](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(admin)/dashboard/page.tsx:24), [reportes](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(admin)/reports/page.tsx:24), [agenda](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(caretaker)/agenda/page.tsx:10).

Se ignora `error` y se reemplaza `data` por `[]`. Una consulta fallida puede mostrarse como “sin llegadas” o producir cifras parciales. Si falla solo la lectura de gastos, el beneficio se calcula sin ellos.

**Acción:** comprobar los resultados antes de mostrar indicadores; ofrecer un estado de error y reintento. Distinguir cero registros de datos no disponibles. Aplicar lo mismo al tipo de cambio: los valores de respaldo actuales parecen cotizaciones reales.

**Aceptación:** simular un error de consulta y comprobar que no se presentan resultados vacíos o parciales como válidos.

### 9. [P2] Borrar un gasto fijo puede dejarlo marcado como pagado

**Ubicaciones:** [borrado de gastos](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(admin)/expenses/actions.ts:31), [relación con el checklist](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/supabase/migrations/0002_fixed_expenses.sql:24), [lectura del estado](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(admin)/expenses/fixed-checklist.tsx:49).

Al borrar desde la tabla general un gasto vinculado al checklist, `on delete set null` conserva la marca y elimina su referencia al gasto. El checklist sigue contando el registro como pagado, y volver a marcarlo se rechaza porque la marca ya existe.

Además, [desmarcar un pago](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(admin)/expenses/fixed-actions.ts:125) elimina primero la marca e ignora errores al eliminar el gasto: puede informar éxito dejando el importe en los reportes.

**Acción:** mantener marca y movimiento dentro de una transacción, con una única operación para revertir el pago. Verificar y reportar cualquier fallo.

### 10. [P2] Un fallo al guardar una reserva deja huéspedes huérfanos

**Ubicación:** [creación del huésped](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(admin)/reservations/actions.ts:134).

Primero se crea el huésped y después la reserva. Si las fechas chocan, la reserva se rechaza pero el huésped queda guardado. Reintentar con “nuevo huésped” crea otro registro. El mismo patrón existe al editar.

**Acción:** guardar huésped y reserva atómicamente, e incorporar búsqueda por contacto antes de crear un duplicado.

**Aceptación:** provocar un conflicto de fechas con un huésped nuevo y comprobar que no aumenta la cantidad de huéspedes; reintentar debe crear uno solo.

### 11. [P2] Un error transitorio de Notion puede duplicar la reserva

**Ubicación:** [actualización y recreación](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(admin)/reservations/actions.ts:103).

Cualquier error al actualizar una página provoca un intento de crear otra. Si hubo un error temporal o una respuesta perdida, la página original puede seguir existiendo; la creación posterior duplica la reserva y cambia el vínculo almacenado.

**Acción:** diferenciar página inexistente de errores temporales, mantener una identidad estable de reserva y encolar reintentos. Mostrar estado de sincronización y último error. Añadir tiempo máximo de espera: actualmente guardar la reserva espera las llamadas externas.

**Aceptación:** simular fallo temporal al actualizar y comprobar que no se crea otra página.

### 12. [P2] Se permite guardar tipo de cambio cero

**Ubicación:** [validación](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/lib/schemas.ts:99) y [conversión](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/lib/format.ts:14).

El esquema acepta cero y la conversión divide por ese valor.

**Reproducción local:** tasa USD = 0, importe = 100.000: el esquema acepta la tasa y la interfaz formatea **US$ ∞**.

**Acción:** exigir tasas positivas y finitas, con restricciones también en base de datos y un estado “cotización no disponible” cuando corresponda.

## Otros defectos funcionales

| Prioridad | Hallazgo y efecto | Ubicación / acción |
|---|---|---|
| P2 | Una propiedad inactiva sigue disponible para nuevas reservas; el servidor tampoco rechaza el alta por ese estado. | [Selector](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(admin)/reservations/reservation-form.tsx:209) y [acción](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(admin)/reservations/actions.ts:40). Filtrar nuevas altas y validar en servidor, conservando acceso a reservas históricas. Definir disponibilidad histórica para ocupación. |
| P2 | Un usuario autenticado sin rol entra en un ciclo login → dashboard → login. | [Middleware](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/lib/supabase/middleware.ts:70). Resolver el caso sin rol antes de redirigir fuera del login. |
| P2 | “Hoy” en agenda y calendario depende de la zona horaria del servidor. En un servidor UTC, desde las 21:00 argentinas ya se toma el día siguiente. La fecha inicial de gastos también usa UTC. | [Agenda](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(caretaker)/agenda/page.tsx:16), [calendario](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(admin)/calendar/page.tsx:23), [gastos](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(admin)/expenses/expenses-view.tsx:181). Reutilizar una fecha de negocio argentina consistente. |
| P2 | “Llamar a Emilio” apunta a un teléfono de ejemplo. | [Agenda](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(caretaker)/agenda/page.tsx:31). Configurar el contacto real y ocultar la acción mientras falte. |
| P2 | La configuración de camas llega al calendario administrativo y al comprobante, pero falta en la vista y tarjetas de la encargada. | [Vista](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/supabase/migrations/0001_init.sql:194) y [tarjeta de agenda](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(caretaker)/agenda/page.tsx:164). Exponer y mostrar ese dato para preparar la unidad. |
| P2 | Al seleccionar acumulado anual o últimos 12 meses se compara el total de ese período contra un solo mes; el rótulo sigue diciendo “Ingresos del mes”. | [Comparación](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(admin)/dashboard/dashboard-client.tsx:210) y [rótulos](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/app/(admin)/dashboard/pulso-section.tsx:115). Comparar períodos equivalentes y adaptar títulos. |
| P3 | El análisis global incluye archivos generados de worktrees locales; los 4.808 diagnósticos no representan 4.808 problemas del sitio. | [Configuración de ESLint](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/eslint.config.mjs:12). Excluir worktrees y artefactos; quedan dos errores reales de tipos `any` en [dedupe-notion](C:/Users/emili/OneDrive/Escritorio/master-airbnb-planging/scripts/dedupe-notion.ts:83). |

## Mejoras funcionales recomendadas

Estas son ampliaciones propuestas, no fallos demostrados.

| Orden | Funcionalidad | Beneficio y criterio de terminación |
|---|---|---|
| 1 | Registro de pagos por reserva | Fecha, importe, medio, responsable y comprobante por movimiento; saldo derivado de pagos y reversiones. Diferenciar reservado, cobrado y pendiente. |
| 2 | Historial de cambios y edición concurrente | Identificar quién cambió fechas, importe o estado; advertir cuando otro usuario guardó una versión más reciente. Hoy se sobrescribe por ID sin comparar versión. |
| 3 | Edición y unificación de huéspedes | Corregir contactos sin crear otra ficha; buscar por teléfono/email y unir duplicados conservando reservas. Actualmente el detalle de huésped es de consulta. |
| 4 | Disponibilidad por propiedad | Vista por noches ocupadas, bloqueos por mantenimiento/uso propio y huecos libres. El calendario actual está centrado en llegadas. |
| 5 | Agenda operativa | Camas, limpieza pendiente/lista, check-in y check-out realizados, tareas asignadas y observaciones operativas separadas de notas privadas. |
| 6 | Estado de integraciones | Mostrar sincronizado/pendiente/error, fecha del último intento y reintento controlado para Notion y recordatorios. |
| 7 | Gastos editables y comprobantes | Corregir importes o categorías con historial, adjuntar comprobantes y evitar borrar para corregir un error. |
| 8 | Recuperación de datos | Documentar respaldo y restauración, y probar una recuperación en otro entorno. No se verificó la configuración de backups de Supabase. |

Antes de ampliar indicadores, definir tres reglas del negocio: si ingresos se asignan al mes de llegada o se distribuyen por noches; cómo se reparten gastos generales entre propiedades; y si comisión/limpieza cargadas en la reserva deben descontarse o ya están incluidas en gastos. Actualmente “beneficio neto” resta solo `expenses`, sin consumir los campos de comisión y limpieza de la reserva; falta una convención única para evitar omisiones o doble conteo.

## Verificaciones

| Comprobación | Resultado |
|---|---|
| TypeScript: `pnpm typecheck` | Aprobado. |
| ESLint global: `pnpm lint` | Falló: 236 errores y 4.572 advertencias, mayormente archivos generados de worktrees. |
| ESLint limitado al código del proyecto | Dos errores en `scripts/dedupe-notion.ts`, líneas 83 y 85. Sin otros diagnósticos en las carpetas revisadas. |
| Casos de lógica con datos ficticios | Cinco casos confirmaron los problemas de saldo, ocupación y tasa cero descritos arriba. Se ejecutó el código original; el filtro de reportes se extrajo del componente. |
| Compilación de producción: `pnpm build` | Aprobada; completó compilación, validación de tipos y generación de páginas. |
| Pruebas automatizadas existentes | No se encontraron pruebas del producto en las carpetas principales ni un script de tests en package.json. |
| Permisos y concurrencia en base real | No ejecutados; conclusiones del esquema versionado, pendientes de contrastar con producción. |
| Recorridos autenticados y revisión visual | No realizados en esta revisión. |

## Orden de implementación

1. Cerrar acceso indebido a datos y probar la matriz de roles.
2. Corregir saldos y ocupación; convertir los casos reproducidos en pruebas de regresión.
3. Garantizar consistencia de reservas y gastos con restricciones y transacciones.
4. Resolver paginación, errores de carga, fechas y sincronización.
5. Incorporar pagos, historial y herramientas operativas según prioridad del equipo.

La revisión agregó únicamente este informe. No modificó código de aplicación ni datos de producción.
