-- Sincronización con Notion: id de la página del calendario "Reservas Airbnb"
-- asociada a cada reserva. Null si la reserva aún no se sincronizó o si su
-- página fue archivada al cancelar.
alter table reservations add column notion_page_id text;
