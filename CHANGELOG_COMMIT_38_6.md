# Commit 38.6 — Calendario público estable

- El bloque de próximos partidos permanece inmediatamente debajo de Noticias destacadas.
- Se eliminan de esta portada los datos antiguos de localStorage y la mezcla con registros incompletos.
- Los partidos se ordenan por jornada y, dentro de la temporada, por fecha.
- Antes del inicio de la competición se muestran las jornadas 1, 2 y 3.
- Escudos locales diferenciados para todos los equipos del calendario, sin depender de enlaces externos.
- Fotografías de estadio servidas desde archivos locales, evitando bloqueos de imágenes externas.
- Botón «Ver calendario completo» que abre una imagen en pantalla con las 38 jornadas, tanto en casa como fuera.
- La imagen no se descarga automáticamente.
- Caché renovada mediante versión 38.6 en los scripts.

## Sincronización automática de horarios

La interfaz queda preparada para recibir cambios de horario desde `matches-config.js` o desde una futura fuente de datos. Este commit no finge una sincronización oficial: para actualizar automáticamente desde un proveedor externo hace falta configurar una API o feed autorizado en el servidor.
