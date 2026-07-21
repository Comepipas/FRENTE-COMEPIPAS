# Frente Comepipas V22 · Commit 22.2 Estable

## Corrección confirmada

- Reparada la función `c22_prepare_recipients`.
- El segmento `activos` reconoce correctamente el estado `activo`.
- En canal `email` solo se incluyen socios con correo válido.
- El correo se obtiene primero de `socios.email` y, cuando existe vinculación, de `auth.users.email`.
- Los canales `interno` y `ambos` permiten incluir socios sin email.
- Se eliminan destinatarios anteriores antes de volver a preparar la comunicación.
- Se recalcula y guarda `total_destinatarios`.
- Se reinician los contadores de envío al preparar de nuevo.

## Seguridad

La función usa `security definer`, pero su ejecución queda revocada para `public` y `anon`; únicamente el rol `authenticated` puede invocarla.

## Estado verificado

Prueba confirmada con tres socios activos:

- 3 socios reconocidos como activos.
- 1 socio con email válido.
- Comunicación de canal `email`: 1 destinatario preparado correctamente.
