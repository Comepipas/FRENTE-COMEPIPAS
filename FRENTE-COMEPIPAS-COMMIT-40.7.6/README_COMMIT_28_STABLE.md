# FRENTE COMEPIPAS · COMMIT 28.0

## Puesta en marcha
1. Publica todos los archivos del ZIP.
2. Ejecuta **una sola vez** `PASO_COMMIT_28_EJECUTAR_EN_SUPABASE.sql` en Supabase → SQL Editor.
3. Abre `campanas-admin.html` desde el panel.
4. Revisa las edades de Infantil/Joven/Adulto antes de importar datos: se han dejado valores iniciales editables.

## Incluido
- Campañas históricas, piloto y reales.
- Campaña histórica 2026/27 cerrada, con altas posteriores permitidas.
- Campaña piloto 2027/28 con pagos ficticios.
- Cuotas configurables por temporada.
- Directivos exentos de cuota.
- Separación entre abono Málaga y cuota de la peña.
- Socios que pagan el abono directamente al club.
- Pago online únicamente con tarjeta en la zona del socio.
- Efectivo únicamente desde administración.
- Importador Excel con vista previa.
- Incidencias de socios no localizados.
- Participantes piloto y formulario para reportar fallos.
- Tablas de familias y antigüedad preparadas en Supabase.

## Límite intencionado
El pago piloto funciona y no cobra dinero. Para el pago real con tarjeta habrá que conectar el proveedor elegido (Stripe/TPV bancario) mediante una función segura y webhook. Las claves privadas nunca deben guardarse en JavaScript.
