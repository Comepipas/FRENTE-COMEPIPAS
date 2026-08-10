# Frente Comepipas V12 — Edición Profesional

## Primera entrega visible de V12

- Nuevo panel de administración de renovaciones 2027/28.
- Resumen de campaña: renovaciones, incidencias e importe previsto.
- Estados reales de la campaña: borrador, preparada, abierta y cerrada.
- Listado de renovaciones con búsqueda y filtros.
- Gestión visual de sectores ilimitados.
- Visualización de tarifas por sector.
- Cuotas Infantil, Joven y Adulto con fechas de nacimiento configurables por temporada.
- Integración con el cliente centralizado `FrenteSupabase`.
- Modo demostración local cuando Supabase todavía no está activado.
- La portada aprobada no ha sido modificada.

## Para conexión real

Editar `assets/js/supabase-config.js` y rellenar:

- `enabled: true`
- `url`
- `anonKey`

Nunca se debe introducir la clave `service_role` en la web.
