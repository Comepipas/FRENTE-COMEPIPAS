# Frente Comepipas V13.3.0 R6

## Corrección del módulo de socios

- Se definen de forma estable los estados válidos del enum `estado_socio`: `pendiente`, `activo`, `bloqueado` y `baja`.
- El botón **Baja** envía directamente el valor técnico `baja` a Supabase.
- Los selectores de estado ya no dependen de que exista previamente un socio con cada estado.
- Se actualiza la versión de caché del script en `socios-admin.html`.
