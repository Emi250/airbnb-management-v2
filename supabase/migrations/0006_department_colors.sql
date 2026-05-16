-- Actualiza los colores de departamento a la paleta Refugio del Corazón.
-- Empareja por nombre. Si los nombres en producción difieren de "Airbnb N",
-- ajustar los colores desde la pantalla de Propiedades de la app.
update properties set color_hex = '#c06d4a' where name = 'Airbnb 1';
update properties set color_hex = '#3f6ea5' where name = 'Airbnb 2';
update properties set color_hex = '#5a8f4e' where name = 'Airbnb 3';
update properties set color_hex = '#9c5f86' where name = 'Airbnb 4';
