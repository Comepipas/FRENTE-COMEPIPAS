insert into public.site_settings (
  id,nombre,subtitulo,lema,temporada,fundacion,email,direccion,
  hero_image,hero_position,escudo,logo,
  color_primario,color_secundario,color_acento
)
values (
  'main',
  'Frente Comepipas',
  'Peña Malaguista',
  'Levantando copas contigo desde 2007',
  '2026/27',
  '2007',
  'contacto@frentecomepipas.es',
  'Málaga, Andalucía',
  'hero.jpg',
  'center center',
  'escudo-transparente.png',
  'don-comepipas-transparente.png',
  '#0057B8',
  '#002B5C',
  '#FFD447'
)
on conflict (id) do update set
  nombre = excluded.nombre,
  temporada = excluded.temporada;
