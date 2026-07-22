# Commit 22.2

- Comunicaciones obtiene el email desde `socios.email` y usa `auth.users.email` como respaldo.
- El segmento de socios activos excluye únicamente estados explícitos de baja o inactividad.
- Se reconstruyen destinatarios y avisos al volver a preparar una comunicación.
- Se añade diagnóstico SQL con total de socios, emails en ficha, emails en Authentication y destinatarios disponibles.
