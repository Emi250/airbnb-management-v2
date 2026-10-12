# Correcciones de datos y funcionamiento

Implementadas sobre la revisión del 11 de octubre. Por indicación del usuario, quedan fuera los cambios de permisos, políticas RLS y autenticación.

## Cambios implementados

- **Saldos:** permanecen pendientes hasta registrar el pago, incluso tras el check-in o check-out. Ya no se ocultan por no haber llegadas dentro del mes seleccionado.
- **Ocupación:** dashboard, reportes y CSV cuentan la última noche del rango y las estadías iniciadas antes del período. Se comparte la misma definición de noches.
- **Comparaciones:** el acumulado anual se compara con el mismo período del año anterior; los últimos 12 meses con los 12 anteriores. Los rótulos se refieren al período seleccionado.
- **Reservas:** alta y edición guardan huésped y reserva en una transacción; un fallo revierte ambas escrituras. La restricción de exclusión de PostgreSQL sustituye al trigger vulnerable a carreras. Se siguen permitiendo salidas y entradas el mismo día.
- **Propiedades:** no se pueden crear reservas en unidades inactivas, pero sigue siendo posible editar las reservas que ya tenían esa propiedad.
- **Gastos fijos:** pago y marca se guardan/revierten juntos. Borrar el gasto elimina su marca. Retirar un concepto del catálogo lo desactiva y conserva el historial.
- **Historial completo:** consultas por lotes con orden estable, incluidas reservas, huéspedes, gastos, objetivos y reportes. Se avanza por el número de filas recibido, aunque el servidor imponga un límite inferior al solicitado.
- **Errores de datos:** una consulta fallida interrumpe la carga y permite reintentar; no se presenta como lista vacía o total cero.
- **Cotizaciones:** validación de tasas positivas y finitas. Se eliminaron las cotizaciones ficticias de respaldo; cuando falta una tasa válida se muestra “Cotización no disponible”.
- **Notion:** una actualización fallida conserva el vínculo y no crea otra página. Las llamadas tienen tiempo máximo de espera y el formulario informa si la reserva se guardó pero no pudo sincronizarse.
- **Fechas:** agenda, calendario, gastos y períodos de indicadores utilizan el día de negocio argentino.
- **Agenda:** muestra la configuración de camas. El contacto del dueño se toma de `OWNER_PHONE`; si falta, no aparece el botón con un teléfono ficticio.
- **Recordatorios:** cambiar el día de check-in habilita nuevamente el recordatorio de esa reserva.
- **Herramientas:** ESLint y TypeScript excluyen copias locales de worktrees. Corregidos los dos errores de tipos del script de deduplicación.

## Base de datos y publicación

El código nuevo de reservas y gastos fijos depende de **0009_data_integrity.sql**. La migración ya está aplicada en la base `hdapnhttahaifkhvepbc`, después de restaurar la estructura faltante de gastos fijos de 0002. **Publicado en producción el 12 de octubre de 2026**, con estado `Ready` confirmado por Vercel: [abrir el sitio](https://master-airbnb-planging.vercel.app).

Orden para publicar en otro entorno:

1. Inspeccionar el esquema y las dependencias de las migraciones 0001–0008. No ejecutar ciegamente todas las migraciones: esta base tenía estructura creada sin historial y diferencias de roles respecto de los archivos locales.
2. Ejecutar `supabase/checks/0009_preflight.sql`, que es solo lectura. Si devuelve superposiciones, resolverlas con criterio operativo: la migración no elimina ni cancela reservas automáticamente.
3. Revisar las marcas de gastos sin movimiento listadas por ese control. La migración elimina esas marcas huérfanas; los gastos existentes permanecen.
4. Aplicar `supabase/migrations/0009_data_integrity.sql`. Está envuelta en una transacción; si la exclusión detecta conflictos, no se aplica parcialmente.
   Aplicar después `0010_extension_schema.sql` para mantener `btree_gist` en el esquema de extensiones.
5. Configurar `OWNER_PHONE` con el contacto real, si se quiere habilitar “Llamar a Emilio”.
6. Publicar la aplicación y comprobar creación/edición/cancelación, un pago fijo y su reversión, agenda, reportes y sincronización.

Las funciones nuevas ejecutan con los permisos del usuario conectado. La vista de agenda conserva su definición de acceso y añade únicamente `bed_setup`. No se modificaron roles ni políticas de tablas existentes. Las dos tablas nuevas de gastos fijos se crearon con las políticas de administrador ya definidas en 0002; no se aplicó la ampliación de permisos de manager de 0003, fuera del alcance pedido.

## Validación

### Comprobación remota del 12 de octubre

- Vercel: proyecto `master-airbnb-planging` vinculado al repositorio `Emi250/airbnb-management-v2`. La publicación inicial se realizó directamente desde los archivos locales: `dpl_9Hi4uxsvxEEiuRz5g9iUYVpQDNZr`, URL `https://master-airbnb-planging-ko2cwalnc.vercel.app`. Este conjunto de cambios reúne el código publicado, las migraciones, las pruebas y la documentación para mantenerlos sincronizados con GitHub y los despliegues automáticos de `main`.
- Las variables de producción están marcadas como sensibles. La descarga de configuración devolvió valores vacíos, lo que no demuestra que falten en el despliegue. Se retiró el archivo temporal para que no sobrescriba la configuración local al compilar.
- En la base configurada localmente y confirmada por el usuario (`hdapnhttahaifkhvepbc`), el control de solo lectura por la API recuperó **129 reservas, sin superposiciones activas, y 8 cotizaciones, todas positivas y finitas**.
- La inspección SQL confirmó que existían recordatorios, Notion, camas y `monthly_targets`, pero faltaban las tablas de gastos fijos y la categoría `fixed`. El historial remoto de migraciones estaba vacío. Se aplicó el contenido de `0002_fixed_expenses.sql` como `20261012132148_restore_fixed_expenses_0002`.
- El preflight SQL posterior devolvió **0 superposiciones, 0 marcas huérfanas y 0 cotizaciones inválidas**. Se aplicó el contenido de `0009_data_integrity.sql` como `20261012132209_data_integrity_0009`. No se eliminaron marcas ni reservas existentes.
- La sesión anterior de la herramienta de Supabase no tenía acceso administrativo a esta base. Por indicación del usuario se agregó el servidor MCP `supabase`, limitado al proyecto indicado, y la autenticación OAuth terminó correctamente. La configuración muestra `enabled: true` y `auth_status: o_auth`.
- Tras recargar Codex, la conexión MCP funcionó y permitió aplicar y verificar las migraciones. Se comprobó la exclusión de fechas, el borrado en cascada de la marca al borrar un gasto, las tres funciones como SECURITY INVOKER y la columna de camas en agenda.
- La revisión posterior detectó que `btree_gist` había quedado en el esquema público. Se aplicó `0010_extension_schema.sql` para trasladarla a `extensions`, conservando la restricción de fechas. Las 20 pruebas locales volvieron a pasar con esta migración incluida.
- La prueba de integración remota usó una transacción y el rol `authenticated` con contexto del administrador existente. Pasaron el alta de reserva, el rechazo de superposición con reversión del huésped nuevo y el pago/reversión de un gasto fijo. La transacción terminó en `ROLLBACK`: permanecen **129 reservas, 153 huéspedes y 63 gastos**, más los 9 conceptos del catálogo inicial y 0 marcas de pago. No se enviaron notificaciones de prueba.
- Los avisos de permisos y autenticación permanecen fuera de alcance. La observación de índices pendientes puede consultarse en [la documentación del asesor de Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys); no bloquea esta publicación.

### Comprobaciones locales

- `pnpm test`: 20 pruebas aprobadas de cálculos, fechas, lectura completa, errores de carga, sincronización y transacciones.
- Las pruebas de base usan PostgreSQL embebido en memoria (PGlite), ejecutan las migraciones versionadas y usan exclusivamente datos ficticios. No leen `.env.local` ni se conectan a Supabase o Notion.
- Se verificó la existencia de la restricción de exclusión y su rechazo de conflictos. No se simularon sesiones PostgreSQL independientes concurrentes; la garantía de exclusión queda delegada a la restricción nativa.
- `pnpm typecheck` y `pnpm lint`: aprobados.
- `pnpm build`: aprobado; compilación, tipos y generación de páginas completados.
- La compilación remota de Vercel también aprobó lint, tipos y generación de páginas. El despliegue quedó `Ready` y asociado al dominio de producción. No se hizo una prueba manual completa de la interfaz autenticada ni de envíos reales a Notion/Telegram.

## Límites y siguientes mejoras

- Las pantallas todavía reciben el historial completo, aunque ahora se recupera sin truncamiento. Para volúmenes grandes, conviene mover agregaciones y paginación de la interfaz al servidor.
- La sincronización no incorpora todavía cola persistente, reconciliación ni historial de intentos. Ante una creación de página con resultado incierto, revisar Notion antes de reintentar.
- Falta definir disponibilidad histórica de propiedades, distribución de gastos generales y tratamiento de comisiones/limpieza antes de cambiar esas reglas contables.
- Registro de pagos por movimiento, historial de cambios, edición/unificación de huéspedes y bloqueos de disponibilidad siguen como ampliaciones posteriores.
- Se mantiene fuera del alcance la revisión de permisos y el caso de autenticación de usuarios sin rol.

El informe original se conserva como diagnóstico previo; este documento describe las correcciones posteriores.
