# Frente Comepipas V7.2

Esta versión incorpora configuración centralizada para que puedas cambiar datos sin buscar por todos los archivos.

## Abrir la web

1. Abre la carpeta `FrenteComepipas_V7.2` en Visual Studio Code.
2. Abre `index.html`.
3. Pulsa `Open with Live Server`.

## Cambiar la foto principal

Método más fácil:

1. Ve a `assets/images/hero/`.
2. Sustituye `hero.jpg` por tu nueva fotografía.
3. La nueva imagen debe llamarse exactamente `hero.jpg`.
4. Recarga la página con `Ctrl + F5`.

No necesitas cambiar código.

Se recomienda una imagen horizontal de al menos 1920 × 1080 píxeles.

## Cambiar nombre, lema, correo y otros datos

Abre:

`assets/js/config.js`

Puedes cambiar:

- Nombre de la peña
- Subtítulo
- Lema
- Año de fundación
- Número de socios
- Número de viajes
- Ciudad
- Correo
- Teléfono
- WhatsApp
- Redes sociales
- Nombre y posición de la imagen de portada

## Cambiar la posición de la foto

Dentro de `assets/js/config.js`:

```js
heroPosition: "center center"
```

Ejemplos:

```js
heroPosition: "center top"
heroPosition: "center bottom"
heroPosition: "30% center"
```

## Importante

Esta versión sigue usando datos y botones de demostración. Las funciones reales de socios, pagos, productos y viajes se conectarán en fases posteriores.


## Cambios de V7.3

- Escudo sin recuadro blanco.
- Don Comepipas sin recuadro blanco.
- Don Comepipas colocado aparte para no tapar el escudo.
- Accesos de Viajes, Tienda y Socios convertidos en tarjetas visuales.
- Imágenes de tarjetas fácilmente reemplazables.

## Cambiar imágenes de Viajes, Tienda y Socios

Ve a:

`assets/images/cards/`

Sustituye cualquiera de estos archivos:

- `viajes.jpg`
- `tienda.jpg`
- `socios.jpg`

Mantén el mismo nombre. Luego pulsa `Ctrl + F5`.


## V7.4
Tienda local funcional con carrito, cantidades, total y productos editables.


## V7.5 - Zona de socios local

Incluye:
- Inicio de sesión de demostración
- Sesión guardada en el navegador
- Carné digital
- Estado de cuota
- Viajes y compras
- Datos del socio
- Cierre de sesión

### Acceso de prueba
- Correo: `socio@frentecomepipas.es`
- Contraseña: `2007`

### Editar socios de demostración
Abre:

`assets/js/members.js`

Esta versión no usa todavía una base de datos real. Supabase se añadirá posteriormente.


## V7.6 - Viajes funcionales en modo local

Incluye:
- Viajes generados desde `assets/js/trips.js`
- Reserva de plazas
- Cancelación de reservas
- Plazas disponibles
- Barra de ocupación
- Reservas guardadas en el navegador
- Panel de "Mis reservas"

Para cambiar destinos, fechas, precios y plazas:
`assets/js/trips.js`

Esta versión todavía no utiliza base de datos real ni pagos.


## V7.7 - Noticias

Incluye:
- Noticia destacada
- Listado de noticias
- Buscador
- Filtro por categorías
- Página individual de cada noticia
- Imágenes reemplazables
- Datos editables desde un único archivo

Para editar noticias:
`assets/js/news.js`

Para cambiar imágenes:
`assets/images/news/`


## V7.8 - Galería

Incluye:
- Galería por tarjetas
- Filtro por categoría
- Filtro por temporada
- Visor ampliado
- Navegación anterior/siguiente
- Soporte para vídeos enlazados
- Contenido editable desde un único archivo

Para editar la galería:
`assets/js/gallery.js`

Para cambiar imágenes:
`assets/images/gallery/`


## V7.9 - Panel de administración local

Incluye:
- Acceso de administrador
- Estadísticas
- Alta y eliminación de productos
- Alta y eliminación de viajes
- Alta y eliminación de noticias
- Cambios visibles en la tienda, viajes y noticias
- Datos guardados con localStorage

### Acceso
- Usuario: `admin`
- Contraseña: `2007`

### Importante
Los cambios se guardan solo en el navegador y ordenador donde se realizan.
Todavía no existe una base de datos online.

## V8.0
- Portada institucional con un único escudo.
- Don Comepipas eliminado de la portada.
- Sistema central de módulos en `assets/js/features.js`.
- Documentación unificada en `DOCUMENTACION_PROYECTO.md`.

## V8.1
- Calendario mensual.
- Filtros por tipo.
- Próximos eventos.
- Modal de detalles.
- Eventos editables desde `assets/js/events.js`.
- Módulo desactivable desde `features.js`.

## V8.2
- Gestión local completa de socios.
- Buscador y filtros.
- Alta, edición y baja.
- Carné digital.
- Exportación CSV.

## V8.3
- Gestión de cuotas y pagos.
- Estados pagada/pendiente.
- Métodos de pago.
- Resumen de ingresos.
- Exportación CSV.

## V8.4
- Gestión avanzada de productos.
- Stock y tallas.
- Gestión de pedidos.
- Estados y detalle de pedido.
- Exportación CSV.

## V8.5
- Panel profesional.
- Resumen global.
- Actividad reciente.
- Accesos rápidos.

## V8.6
- Cliente Supabase preparado.
- Esquema SQL y políticas RLS.
- Autenticación preparada.
- Herramienta de conexión y migración.
- Fallback local para no romper la web sin credenciales.

## V8.7
- Gestión avanzada de viajes.
- Reservas y lista de espera.
- Pagos y plazas.
- Importación y exportación CSV.
- Listado de pasajeros.

## V8.8
- Gestión avanzada de noticias.
- Borradores y publicaciones programadas.
- Vista previa, duplicado y exportación CSV.

## V8.9
- Gestión multimedia completa.
- Álbumes y temporadas.
- Fotos, vídeos y documentos.
- Estados de publicación.
- Exportación de inventario CSV.

## V9.0
- Login de administradores.
- Usuarios y roles.
- Permisos por módulo.
- Protección de páginas.
- Menús según permisos.
- Preparación para Supabase Auth.

## V9.1
- Configuración general desde el panel.
- Identidad, contacto y redes.
- Imágenes y colores.
- Vista previa.
- Aplicación automática en la web.

## V9.2
- Copias de seguridad completas.
- Restauración JSON.
- Exportación por módulos.
- Historial local.
- Eliminación controlada de datos.

## V9.3
- Auditoría y registro de actividad.
- Usuario, rol, módulo y acción.
- Filtros por fecha, módulo y usuario.
- Exportación CSV.
- Registro automático de cambios locales.

## V9.4
- Dashboard avanzado.
- Gráficos de ingresos.
- Socios, pedidos, viajes y stock.
- Alertas y actividad reciente.
- Consolidación de todos los módulos.

## V9.5
- Modo local y online.
- Cliente Supabase.
- API unificada.
- Migración local → Supabase.
- Descarga Supabase → local.
- SQL completo.
- RLS y Storage.
- Guía paso a paso.

## V10.0-A
- Nueva portada.
- Hero a pantalla completa.
- Menú premium y móvil.
- Escudo centrado sin logo inferior.

## V10.0-B
- Contadores animados.
- Accesos rápidos con imágenes.
- Próximo viaje con cuenta atrás.

## V10.0-C
- Próximo partido, noticias, galería, patrocinadores y footer.

## V10.1
- Editor visual de portada.
- Orden y visibilidad de bloques.
- Hero, presentación y colores.

## V10.2
- CMS de portada.
- Noticias, patrocinadores, redes e imágenes.

## V10.3
- Área privada del socio.
- Carnet digital y QR.
- Sin asignación de asiento.

## V10.4
- Entradas, viajes y eventos.
- Reservas, pagos, entrega y check-in.
- Sin asignación de asientos.

## V10.6
- Calendario dinámico.
- Eventos y avisos administrables.
- Integración con portada y área del socio.

## V10.7
- Dashboard definitivo.
