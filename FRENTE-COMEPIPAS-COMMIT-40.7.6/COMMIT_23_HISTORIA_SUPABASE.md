# Commit 23 — Historia pública en Supabase

## Qué corrige

- La historia ya no depende solamente del navegador donde se edita.
- El panel de administración publica los cambios en Supabase.
- `la-pena.html` carga el contenido público desde Supabase para todos los visitantes.
- Se mantiene el contenido inicial como respaldo si la conexión no está disponible.

## Paso obligatorio en Supabase

Ejecuta en **SQL Editor** el archivo:

`supabase/migrations/023_commit_23_historia_publica.sql`

Después publica este commit en GitHub y espera el despliegue automático de Vercel.
