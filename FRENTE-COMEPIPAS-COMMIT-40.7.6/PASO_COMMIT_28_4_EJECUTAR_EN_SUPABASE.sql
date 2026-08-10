-- FRENTE COMEPIPAS · COMMIT 28.4
-- Categorías de cuota por rangos exactos de fecha de nacimiento.
-- Este script es incremental. NO repite el PASO_COMMIT_28.

alter table public.campanas_categorias
  add column if not exists nacimiento_desde date,
  add column if not exists nacimiento_hasta date;

-- Conversión inicial de los rangos antiguos de edad usando la fecha de corte
-- de cada campaña. Después pueden revisarse y editarse desde el panel.
update public.campanas_categorias cc
set
  nacimiento_desde = case
    when cc.edad_max is null then date '1900-01-01'
    else (c.fecha_corte - make_interval(years => cc.edad_max + 1) + interval '1 day')::date
  end,
  nacimiento_hasta = (c.fecha_corte - make_interval(years => cc.edad_min))::date
from public.campanas_abonados c
where c.id = cc.campana_id
  and c.fecha_corte is not null
  and (cc.nacimiento_desde is null or cc.nacimiento_hasta is null);

alter table public.campanas_categorias
  drop constraint if exists campanas_categorias_fechas_validas;

alter table public.campanas_categorias
  add constraint campanas_categorias_fechas_validas
  check (
    nacimiento_desde is null
    or nacimiento_hasta is null
    or nacimiento_desde <= nacimiento_hasta
  );

create index if not exists campanas_categorias_nacimiento_idx
  on public.campanas_categorias(campana_id,nacimiento_desde,nacimiento_hasta)
  where activa = true;

comment on column public.campanas_categorias.nacimiento_desde is
  'Fecha de nacimiento inicial incluida en la categoría.';
comment on column public.campanas_categorias.nacimiento_hasta is
  'Fecha de nacimiento final incluida en la categoría.';
