# Mejoras operativas

Continuación autorizada de la revisión. Se conserva la estructura visual actual y el alcance anterior sobre permisos de usuarios existentes.

- [x] Edición de huéspedes con detección de cambios simultáneos.
- [x] Unificación explícita de huéspedes, conservando ficha original y reservas.
- [x] Movimientos de cobro y devolución, referencia/enlace a comprobante, PDF y saldo derivado.
- [x] Historial de cambios con responsable y protección de ediciones simultáneas en huéspedes y reservas.
- [x] Estado de Notion persistente, reintentos y reconciliación sin duplicaciones.
- [x] Verificación de respaldos y ensayo de restauración aislada. Supabase Free no incluye respaldos automáticos; copia manual cifrada y ensayo local completos.
- [x] Recorridos autenticados del sitio, pruebas de regresión y publicación.
- [x] Definición de reglas contables con el usuario antes de cambiar reportes.

Los pagos históricos se conservarán como saldos previos sin fecha ni medio inventados. La unificación nunca se hará automáticamente por coincidencia de nombre. Las pruebas de recuperación no reemplazarán la base en uso.

Reglas confirmadas: ingresos al mes de llegada; gastos generales solo en el total del negocio; comisiones y limpieza ya están en Gastos y no se descuentan nuevamente. Corregido el filtro del dashboard que incluía gastos generales en propiedades individuales. Reportes explica la distinción entre ingresos por llegada y pagos acumulados.

Verificación local: 31 pruebas automáticas, incluyendo saldos, devoluciones, idempotencia, ediciones obsoletas, unificación, PDFs y Notion ante errores/timeout/trabajadores concurrentes. Compilación de producción y lint sin errores.

Migraciones 0011–0014 aplicadas conjuntamente como `20261013011035_operational_workflows_0011_to_0014`. Ensayo transaccional con el rol authenticated del administrador: altas, cobro repetido idempotente, rechazo de edición obsoleta, unificación, devolución, cola, historial y exportación de respaldo. Todos los registros del ensayo se revirtieron. El script reproducible está en `scripts/verify-operational.sql`.

Publicación activada y Ready en `https://master-airbnb-planging.vercel.app`, despliegue inicial `dpl_HwiKSQMgDECxptvTbDqynWz1FsG3`, código `ab70e78868c3b73aee07e2d0f32801b97b421a2f`. Navegador autenticado: dashboard, ficha de reserva y saldo previo, búsqueda/editor de huéspedes, detección de duplicados, selección y confirmación de unificación sin aplicar cambios a personas reales, Actividad, Integraciones y descarga de respaldo desde Ajustes.

El reintento real de Notion conservó la revisión pendiente sin crear otra página. Las 23 reservas anteriores sin vínculo quedan explícitamente para revisión; no se asume que no existan en Notion. Los vínculos anteriores no verificados se distinguen de sincronizaciones recientes. No se enviaron confirmaciones a huéspedes.

Se restauraron tanto la copia anterior (nueve tablas, 370 registros) como la descarga autenticada posterior (doce tablas, 554 registros) en bases en memoria, comparando el contenido completo y revalidando relaciones y saldos. Los datos cambiaron entre ambas instantáneas durante el uso normal del sitio. Copias privadas excluidas de Git y Vercel.

Límite de la comprobación de interfaz: las escrituras de pagos y unificación se probaron en transacción revertida, no guardando operaciones ficticias duraderas en producción. El recorrido visual de esos formularios llegó hasta la confirmación. La protección automática de respaldos fuera del equipo queda por contratar/configurar; Supabase Free no la incluye.
