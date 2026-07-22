# Frente Comepipas V11.6 Profesional

## Centro de control de la directiva

- Rediseño completo de `dashboard-admin.html`.
- Menú lateral unificado para acceder a socios, entradas, desplazamientos, tienda, noticias, galerías, renovaciones, configuración y auditoría.
- Panel adaptado para tablet, móvil y ordenador.
- Contadores automáticos de socios activos, cuentas pendientes, solicitudes de entradas, pedidos, cuotas, stock, noticias y multimedia.
- Avisos prioritarios calculados con la información guardada.
- Accesos rápidos a las tareas habituales de la directiva.
- Resúmenes visuales de socios y solicitudes de entradas.
- Actividad reciente y resumen económico informativo.
- Ayudas contextuales mediante botones `?`.
- Se corrige la carga de protección administrativa para ejecutarla después de cargar `auth.js`.
- La Home V11.5 aprobada no ha sido modificada.

## Nota técnica

Mientras no esté conectado Supabase, los datos se guardan en el navegador mediante `localStorage`. Por ello, dos dispositivos distintos pueden mostrar datos diferentes.
