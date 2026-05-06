-- ============================================================================
-- Check-in reminder idempotency
-- ============================================================================
-- Soporta el cron diario (Vercel) que avisa por Telegram 3 días antes del
-- check-in. La columna se setea cuando el envío al bot fue exitoso, así un
-- reintento del cron (manual o automático) no genera Telegrams duplicados.
-- ============================================================================

alter table reservations
  add column checkin_reminder_sent_at timestamptz;

-- Índice parcial: el cron filtra por status='confirmed' + check_in exacto +
-- checkin_reminder_sent_at IS NULL. Mantener este índice chico (solo filas
-- pendientes de notificar) reduce el costo del query y se autopurga.
create index idx_reservations_checkin_reminder_pending
  on reservations(check_in)
  where status = 'confirmed' and checkin_reminder_sent_at is null;
