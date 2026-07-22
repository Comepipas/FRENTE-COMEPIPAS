# PRUEBA V13.3.0

1. Abre `assets/js/supabase-config.js`.
2. Escribe la URL del proyecto y la clave pública `anon` o `publishable`.
3. Cambia `enabled: false` por `enabled: true`.
4. Abre `conexion.html` con Go Live y pulsa **Probar conexión**.
5. Inicia sesión con un usuario autorizado si tus políticas RLS lo exigen.
6. Abre `socios-admin.html`.
7. Comprueba listado, búsqueda y paginación.
8. Crea un socio de prueba.
9. Edita su teléfono y abre **Ver** para comprobar el historial.
10. Pulsa **Baja** y verifica que el registro sigue existiendo con el nuevo estado.
11. Exporta Excel y comprueba que contiene los datos de Supabase.

Si aparece un error RLS, ejecuta `supabase/migrations/007_v13_3_members_rls_check.sql` y comparte el resultado para adaptar las políticas sin abrir el acceso públicamente.
