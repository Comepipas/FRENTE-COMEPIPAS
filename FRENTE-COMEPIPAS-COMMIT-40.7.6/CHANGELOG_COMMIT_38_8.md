# COMMIT 38.8 — Inicio final y corrección de álbumes

- Corregida la apertura de álbumes por slug: ya no intenta usar nombres como UUID.
- Redes sociales: solo aparecen los botones con una URL configurada.
- Instagram y X quedan configurados; Facebook, TikTok y WhatsApp quedan preparados pero ocultos.
- Eliminada la franja repetida «Hazte socio» del final de Inicio.
- La imagen de Material se controla desde `assets/js/home-v10c-config.js` mediante `materialImage`.
- Los patrocinadores se cargan desde `assets/images/patrocinadores/` y se listan en `home-v10c-config.js`.
- Si falta el archivo de un patrocinador, su tarjeta se oculta automáticamente.
- Renovada la caché de los archivos modificados.
