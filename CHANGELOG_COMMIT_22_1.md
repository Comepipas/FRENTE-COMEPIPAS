# Commit 22.1 · Destinatarios de comunicaciones

## Corrección definitiva

El filtro `Socios activos` ahora usa el mismo criterio que el resto del proyecto:
`Activo`, `Activa` y `Alta`, sin distinguir mayúsculas ni espacios laterales.

La causa del resultado de 0 destinatarios era que la función SQL anterior solo
comparaba con `activo`, aunque los procesos de activación de los Commit 17 y 17.1
ya aceptaban también `activa` y `alta`.

Se conservan las demás correcciones del Commit 22.1: avisos internos para socios
sin correo, limpieza de selecciones anteriores y reinicio de contadores.
