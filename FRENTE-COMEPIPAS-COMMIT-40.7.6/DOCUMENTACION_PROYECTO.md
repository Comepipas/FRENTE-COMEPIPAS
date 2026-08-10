# DOCUMENTACIÓN DEL PROYECTO — FRENTE COMEPIPAS

## Versión actual
V8.0

## Cambiar la foto principal
Sustituye `assets/images/hero/hero.jpg`.

## Cambiar datos generales
Edita `assets/js/config.js`.

## Activar o desactivar módulos y efectos
Edita `assets/js/features.js`.

Ejemplo:
```js
mostrarTienda: false
```

## Contenidos editables
- Productos: `assets/js/products.js`
- Viajes: `assets/js/trips.js`
- Noticias: `assets/js/news.js`
- Galería: `assets/js/gallery.js`
- Socios de prueba: `assets/js/members.js`

## Panel de administración
Abre `admin.html`.

Usuario: `admin`
Contraseña: `2007`

## Cambios consolidados
- En la portada solo aparece el escudo institucional.
- Don Comepipas queda fuera de la portada.
- La imagen hero es fácilmente reemplazable.
- Los módulos especiales pueden desactivarse desde un único archivo.
- Las instrucciones se consolidan en este documento.


## V8.1 - Calendario y eventos

### Editar eventos
Abre:

`assets/js/events.js`

Puedes cambiar:
- título
- tipo
- fecha
- hora
- lugar
- descripción

### Desactivar el calendario
En `assets/js/features.js`:

```js
mostrarCalendario: false
```

### Tipos disponibles
- Partido
- Viaje
- Reunión
- Evento

## V8.2 - Gestión de socios
Abre `socios-admin.html`.

Incluye búsqueda, filtros, alta, edición, baja lógica, ficha detallada, carné digital y exportación CSV.

Datos base: `assets/js/members-db.js`.
Los cambios se guardan en localStorage.

## V8.3 - Cuotas y pagos
Abre `cuotas-admin.html`.

Incluye alta, edición, marcar como pagada, métodos de pago, referencias, filtros, resumen de ingresos y exportación CSV.

Datos base: `assets/js/fees.js`.

## V8.4 - Tienda y pedidos
Abre `tienda-admin.html`.

Incluye gestión de productos, stock, tallas, pedidos, estados, detalle de cliente, ingresos y exportación CSV.

Datos base de pedidos: `assets/js/orders.js`.

## V8.5 - Panel profesional
Abre `admin.html`. Incluye navegación lateral, estadísticas globales, actividad reciente y accesos rápidos.

## V8.6 - Supabase

- Configuración: `assets/js/supabase-config.js`
- Comprobación y migración: `conexion.html`
- SQL: `supabase/schema.sql`
- Instrucciones: `supabase/README_SETUP.md`
- El modo local continúa activo hasta introducir las credenciales.
- No introducir nunca la clave secreta service_role.

## V8.7 - Viajes y reservas

Abre `viajes-admin.html`.

Incluye:
- gestión de viajes
- reservas y pasajeros
- lista de espera automática
- plazas ocupadas y libres
- pagos
- listado de pasajeros
- importación y exportación CSV
- preparación para Supabase

Datos base:
`assets/js/trip-bookings.js`

## V8.8 - Noticias y publicaciones
Abre `noticias-admin.html`.

Incluye borradores, publicación, programación, categorías, imagen destacada, vista previa, duplicado, edición, eliminación y exportación CSV.

## V8.9 - Gestión multimedia

Abre `multimedia-admin.html`.

Incluye:
- imágenes
- vídeos
- documentos
- álbumes
- temporadas
- estados publicado, borrador y privado
- vista previa
- edición y eliminación
- exportación de inventario CSV

Datos base:
`assets/js/media-library.js`


## V9.0 - Seguridad, usuarios, roles y permisos

### Acceso
Abre:

`login.html`

Usuario de prueba:
- admin@frentecomepipas.es
- contraseña: 2007

### Gestión de usuarios
Abre:

`usuarios-admin.html`

### Roles disponibles
- Superadministrador
- Presidente
- Secretario
- Tesorero
- Responsable de viajes
- Editor

### Archivos principales
- `assets/js/roles.js`
- `assets/js/admin-users.js`
- `assets/js/auth.js`
- `assets/js/users-admin.js`

### Modo actual
La autenticación funciona en localStorage para pruebas.

### Preparación Supabase Auth
SQL:
`supabase/auth_roles.sql`

No uses contraseñas reales ni datos sensibles en el modo local.

## V9.1 - Configuración general

Abre `configuracion-admin.html`.

Permite cambiar desde el panel:
- nombre
- subtítulo
- lema
- temporada
- contacto
- redes sociales
- hero
- escudo
- logo
- colores corporativos

Datos base:
`assets/js/site-settings.js`

Cambios locales:
`localStorage`

Las imágenes deben existir dentro de:
- `assets/images/hero/`
- `assets/images/brand/`


## V9.2 - Copias de seguridad

Abre:

`backups-admin.html`

Funciones:
- copia completa en JSON
- restauración desde JSON
- exportación por módulos
- historial local de operaciones
- eliminación de datos personalizados
- registro de fecha, tamaño y módulos

### Importante
La copia protege los datos guardados en `localStorage`.
No incluye físicamente las imágenes de las carpetas del proyecto.

Antes de restaurar una copia, crea otra del estado actual.


## V9.3 - Auditoría y actividad

Abre:

`auditoria-admin.html`

Incluye:
- usuario que realizó el cambio
- rol
- fecha y hora
- módulo
- acción
- elemento afectado
- detalle
- filtros
- exportación CSV
- limpieza del historial

Archivo principal:
`assets/js/audit.js`

El historial se guarda en:
`frente_audit_log_v1`

La versión local registra cambios realizados sobre los módulos almacenados en `localStorage`.


## V9.4 - Dashboard avanzado

Abre:

`dashboard-admin.html`

Incluye:
- indicadores globales
- evolución de ingresos
- cuotas y pedidos
- distribución de socios
- ocupación de viajes
- stock bajo
- avisos
- actividad reciente
- datos consolidados desde todos los módulos

Archivo principal:
`assets/js/dashboard-advanced.js`


## V9.5 - Supabase y modo dual

### Qué cambia

La web puede funcionar en:

- modo local
- modo online con Supabase

Mientras no se configure Supabase, todo continúa funcionando en local.

### Configuración principal

`assets/js/supabase-config.js`

### API unificada

`assets/js/api.js`

Recursos disponibles:

- `FrenteAPI.members`
- `FrenteAPI.fees`
- `FrenteAPI.products`
- `FrenteAPI.orders`
- `FrenteAPI.trips`
- `FrenteAPI.tripBookings`
- `FrenteAPI.news`
- `FrenteAPI.media`
- `FrenteAPI.events`
- `FrenteAPI.siteSettings`
- `FrenteAPI.audit`

Métodos principales:

- `list()`
- `get(id)`
- `create(record)`
- `update(id, changes)`
- `remove(id)`

### Migración

Abre:

`migracion-supabase.html`

### Scripts SQL

Ejecuta en este orden:

1. `supabase/schema.sql`
2. `supabase/policies.sql`
3. `supabase/storage.sql`
4. `supabase/seed.sql`

### Guía completa

`supabase/README_SETUP.md`

### Seguridad

Nunca pongas la clave `service_role` dentro de los archivos públicos de la web.
Usa únicamente la clave pública `anon`.

## V10.0-A - Nueva portada
Incluye hero completo, menú transparente, menú móvil, escudo centrado, botones principales y base visual V10.

## V10.0-B
Edita datos en `assets/js/home-config.js` e imágenes en `assets/images/home/`.

## V10.0-C
Configura en `assets/js/home-v10c-config.js`. Imágenes en noticias, galeria-home, patrocinadores y partido.

## V10.1
Abre `editor-portada-admin.html` para editar la portada sin tocar código.

## V10.2
Abre `cms-admin.html` para gestionar el contenido de la portada.

## V10.3
Abre `area-socio.html`.

## V10.4
Abre `eventos-admin.html`. El módulo no asigna asientos.

## V10.6
Gestiona la agenda en `calendario-admin.html`. Los datos se guardan en `frente_agenda_v106`.

## V10.7
Abre `dashboard-v107.html`.
