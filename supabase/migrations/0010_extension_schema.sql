-- Mantener los objetos de la extensión fuera del esquema expuesto por la API.
-- PostgreSQL conserva las referencias de la restricción de exclusión por OID.
begin;
create schema if not exists extensions;
alter extension btree_gist set schema extensions;
commit;
