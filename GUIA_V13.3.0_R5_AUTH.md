# Pasos

1. Conserva tu configuración en `assets/js/supabase-config.js`.
2. Ejecuta `database/migrations/008_v13_3_supabase_auth_admin.sql`.
3. En Supabase: Authentication → Users → Add user.
4. Copia el UUID del usuario.
5. Abre `preparar-administrador.html` para ver el SQL que asocia el rol.
6. Ejecuta ese INSERT sustituyendo el UUID.
7. Abre `login.html` e inicia sesión.
8. Abre `socios-admin.html`.
9. Crea el socio ficticio 9999 y comprueba que aparece en Supabase.
