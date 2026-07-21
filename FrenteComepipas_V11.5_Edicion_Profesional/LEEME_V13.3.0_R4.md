# V13.3.0 R4

Esta revisión sustituye los parches R1, R2 y R3.

## Instalación
1. Usa esta carpeta completa como nueva base.
2. Copia en `assets/js/supabase-config.js` la URL y la Publishable Key que ya configuraste.
3. Abre `diagnostico-socios.html` con Go Live.
4. Si muestra lectura correcta, abre `socios-admin.html`.
5. Si muestra un error de RLS o permisos, inicia sesión con un administrador y ejecuta la migración `database/migrations/007_v13_3_socios_rls.sql`.

## Correcciones
- Un único cliente de Supabase.
- Tiempo máximo de espera.
- El cargador siempre se oculta.
- Mensajes distintos para conexión, tabla vacía y bloqueo RLS.
- Página específica de diagnóstico.
- Se eliminan los tres parches anteriores.
