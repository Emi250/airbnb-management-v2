-- Configuración de camas por reserva.
--
-- Algunos departamentos tienen una cama de dos plazas que se puede desarmar en
-- dos camas de una plaza y media. `properties.has_split_beds` marca cuáles, y
-- se administra desde Configuración (no se deduce del nombre: en producción las
-- propiedades se llaman "Departamento #N").
alter table properties
  add column has_split_beds boolean not null default false;

-- `null` = la propiedad no ofrece la opción, así la columna "Camas" del
-- calendario de Notion queda vacía en vez de afirmar algo que no aplica.
alter table reservations
  add column bed_setup text check (bed_setup in ('together', 'separate'));
