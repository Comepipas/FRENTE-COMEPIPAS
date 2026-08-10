# Commit 23.3 — Guardado de historia verificado

- El administrador carga el contenido directamente desde `public.site_content`.
- Comprueba que existe una sesión real de Supabase y un perfil en `admin_profiles`.
- Guarda mediante `UPDATE ... RETURNING` y verifica que el JSON devuelto coincide.
- Nunca muestra éxito si Supabase no ha modificado realmente la fila.
- Los errores de autenticación y RLS aparecen completos en pantalla.
