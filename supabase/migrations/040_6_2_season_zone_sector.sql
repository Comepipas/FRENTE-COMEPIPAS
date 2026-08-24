-- Commit 40.6.2: zona y sector pertenecen a cada temporada, no a la ficha permanente.
alter table if exists public.campanas_registros
  add column if not exists sector_club text;

-- Recupera el código de sector de importaciones anteriores cuando estaba dentro del JSON original.
update public.campanas_registros
set sector_club = coalesce(
  nullif(trim(datos_origen->>'Id. Zona Abono'),''),
  nullif(trim(datos_origen->>'id. zona abono'),''),
  nullif(trim(datos_origen->>'sector_codigo_club'),'')
)
where sector_club is null
  and datos_origen is not null;

comment on column public.campanas_registros.sector_club is
  'Código o número de sector indicado por el Málaga CF para esta temporada.';
