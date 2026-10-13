# Mejoras operativas

Continuación autorizada de la revisión. Se conserva la estructura visual actual y el alcance anterior sobre permisos de usuarios existentes.

- [x] Edición de huéspedes con detección de cambios simultáneos.
- [x] Unificación explícita de huéspedes, conservando ficha original y reservas.
- [x] Movimientos de cobro y devolución, referencia/enlace a comprobante, PDF y saldo derivado.
- [x] Historial de cambios con responsable y protección de ediciones simultáneas en huéspedes y reservas.
- [x] Estado de Notion persistente, reintentos y reconciliación sin duplicaciones.
- [ ] Verificación de respaldos y ensayo de restauración aislada.
- [ ] Recorridos autenticados del sitio, pruebas de regresión y publicación.
- [x] Definición de reglas contables con el usuario antes de cambiar reportes.

Los pagos históricos se conservarán como saldos previos sin fecha ni medio inventados. La unificación nunca se hará automáticamente por coincidencia de nombre. Las pruebas de recuperación no reemplazarán la base en uso.

Reglas confirmadas: ingresos al mes de llegada; gastos generales solo en el total del negocio; comisiones y limpieza ya están en Gastos y no se descuentan nuevamente. Corregido el filtro del dashboard que incluía gastos generales en propiedades individuales. Reportes explica la distinción entre ingresos por llegada y pagos acumulados.

Verificación local: 30 pruebas automáticas, incluyendo saldos, devoluciones, idempotencia, ediciones obsoletas, unificación y Notion ante errores/timeout/trabajadores concurrentes. Restauración de las nueve tablas anteriores y migración del saldo histórico verificadas en memoria. Publicación y recorridos autenticados pendientes de completar.
