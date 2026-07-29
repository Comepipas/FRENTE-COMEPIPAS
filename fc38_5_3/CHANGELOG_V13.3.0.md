# CHANGELOG V13.3.0

## Socios conectados a Supabase

- El módulo `socios-admin.html` deja de usar `localStorage`.
- Listado, búsqueda, filtros y paginación consultan la tabla `socios`.
- Altas y ediciones se guardan directamente en Supabase.
- La acción Baja cambia el estado y nunca elimina físicamente el expediente.
- La ficha muestra historial de cambios desde `member_history`.
- La ficha consulta relaciones de tutores y menores desde `member_guardians`.
- Exportación Excel basada en los datos reales de Supabase.
- Indicador de conexión, cargador y mensajes de error.
- Nueva capa `core/database`, servicio `members.service` y controlador de página.
- El número de socio queda bloqueado durante la edición.

## Requisito
Configurar `assets/js/supabase-config.js` con la URL y la clave pública anon/publishable del proyecto.
