# Commit 38.9.1

## Correcciones
- Corregido el guardado de la imagen de «Material de la Peña».
- Las imágenes se optimizan a WebP antes de guardarse.
- Se intenta guardar en Supabase Storage (`public-images`) y se usa almacenamiento local optimizado como respaldo.
- Se muestran mensajes de error reales cuando el navegador no puede guardar la configuración.
- La imagen de material se adapta automáticamente al recuadro con `object-fit: cover` y centrado, sin deformarse.
- Corregido el orden de carga de los scripts del CMS para que Supabase esté disponible antes de iniciar el editor.
- Aplicada la misma persistencia robusta a los logos de patrocinadores.
