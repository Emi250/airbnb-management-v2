# Recuperación de datos

## Copia verificada el 12 de octubre de 2026

Antes de las migraciones operativas se exportaron las nueve tablas del negocio en una sola consulta, con una instantánea consistente. La copia está excluida de Git y de las publicaciones en Vercel, en `.backups/pre-operational-2026-10-12.json.dpapi`.

Se cifró con Windows DPAPI para el usuario actual, se verificó la lectura y se eliminó el archivo sin cifrar. Para descifrarla se necesita el mismo perfil de Windows y sus claves de recuperación. Esta copia local no reemplaza un respaldo independiente del equipo.

El ensayo restauró los 370 registros en PostgreSQL PGlite en memoria, comparó el contenido completo de cada tabla, revalidó claves foráneas y aplicó las migraciones 0011–0014. Los saldos de todas las reservas coincidieron con el nuevo registro de movimientos. No se restauraron datos sobre producción ni se enviaron notificaciones.

Después de publicar también se probó la descarga autenticada desde Ajustes: doce tablas y 554 registros. Su copia cifrada está en `.backups/post-operational-2026-10-13.json.dpapi`; se restauró y comparó completamente, incluyendo movimientos y estado de Notion, sin diferencias de saldo. El JSON descargado por el navegador permanece en Descargas para el usuario.

```powershell
./scripts/verify-backup.ps1 -Path .backups/pre-operational-2026-10-12.json.dpapi
```

## Nuevas copias

Verificación del panel de Supabase: el proyecto está en Free Plan y el panel indica que no incluye respaldos automáticos del proyecto. No hay una restauración automática del proveedor disponible para validar con este plan. La copia manual y su ensayo de restauración no equivalen a protección automática fuera del equipo; queda por elegir un servicio de respaldo externo o un plan del proveedor que lo incluya.

Ajustes permite descargar una instantánea consistente de las doce tablas del negocio, incluyendo pagos, historial y estado de Notion. Guardar el archivo en un destino privado y con respaldo independiente. El archivo descargado contiene datos personales y no está cifrado por la aplicación. El script `protect-backup.ps1` cifra una copia local para el perfil actual de Windows.

Para ensayar una copia descargada sin cifrar, sin abrir una conexión remota:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\ruta\respaldo.json')) | node scripts/verify-business-backup.cjs
```

El verificador solo crea una base en memoria; nunca acepta una URL de producción. Las restauraciones de prueba usan identidades ficticias para comprobar las relaciones de usuarios, sin recuperar sus credenciales.

## Alcance

Estas copias cubren datos de negocio. No incluyen usuarios/contraseñas de Supabase Auth, archivos de Storage, variables secretas, archivos enlazados ni contenido externo de Notion. Una recuperación completa requiere también la configuración del proyecto, sus credenciales y los respaldos del proveedor. No ejecutar automáticamente todas las migraciones antiguas sobre producción: existe una diferencia conocida en los roles históricos y la migración 0003 queda fuera del alcance autorizado.

Antes de una recuperación real, probar la copia en un proyecto aislado, reconciliar nuevas operaciones posteriores a la fecha de respaldo, verificar vínculos de Notion y decidir el corte con el responsable del negocio. No activar notificaciones ni trabajos de sincronización en una base de ensayo.
