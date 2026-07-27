-- FRENTE COMEPIPAS · COMMIT 29.0
-- Cuotas de socio por rangos concretos de fecha de nacimiento.
-- Script incremental y seguro: puede ejecutarse aunque ya se aplicara el 28.4.

begin;

alter table if exists public.campanas_categorias
  add column if not exists nacimiento_desde date,
  add column if not exists nacimiento_hasta date;

-- Convierte datos antiguos basados en edad cuando exista fecha de corte.
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
  and cc.edad_min is not null
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
  'Primera fecha de nacimiento incluida en la categoría.';
comment on column public.campanas_categorias.nacimiento_hasta is
  'Última fecha de nacimiento incluida en la categoría.';

commit;

-- COMPROBACIÓN FINAL
select campana_id,nombre,nacimiento_desde,nacimiento_hasta,cuota,activa
from public.campanas_categorias
order by campana_id,orden;
