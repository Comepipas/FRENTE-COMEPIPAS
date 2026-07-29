-- FRENTE COMEPIPAS · COMMIT 28.0
-- Campañas de abonados configurables, histórico, piloto y conciliación.

create extension if not exists pgcrypto;

create table if not exists public.campanas_abonados (
  id uuid primary key default gen_random_uuid(),
  temporada text not null,
  nombre text not null,
  tipo text not null default 'real' check (tipo in ('historica','piloto','real')),
  estado text not null default 'borrador' check (estado in ('borrador','revision','abierta','cerrada','historica')),
  fecha_corte date,
  fecha_apertura timestamptz,
  fecha_cierre timestamptz,
  pago_online_activo boolean not null default false,
  modo_pruebas boolean not null default false,
  altas_post_cierre boolean not null default true,
  texto_socio text,
  configuracion jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (temporada, tipo)
);

create table if not exists public.campanas_categorias (
  id uuid primary key default gen_random_uuid(),
  campana_id uuid not null references public.campanas_abonados(id) on delete cascade,
  nombre text not null,
  edad_min integer not null default 0,
  edad_max integer,
  cuota numeric(10,2) not null default 0,
  orden integer not null default 0,
  activa boolean not null default true,
  unique(campana_id,nombre)
);

create table if not exists public.campanas_directivos (
  id uuid primary key default gen_random_uuid(),
  campana_id uuid not null references public.campanas_abonados(id) on delete cascade,
  socio_id uuid not null references public.socios(id) on delete cascade,
  cargo text,
  cuota_exenta boolean not null default true,
  unique(campana_id,socio_id)
);

create table if not exists public.familias_socios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  responsable_socio_id uuid references public.socios(id),
  created_at timestamptz not null default now()
);

create table if not exists public.familias_miembros (
  familia_id uuid not null references public.familias_socios(id) on delete cascade,
  socio_id uuid not null references public.socios(id) on delete cascade,
  relacion text,
  puede_pagar boolean not null default false,
  primary key(familia_id,socio_id)
);

create table if not exists public.campanas_registros (
  id uuid primary key default gen_random_uuid(),
  campana_id uuid not null references public.campanas_abonados(id) on delete cascade,
  socio_id uuid references public.socios(id),
  origen text not null default 'manual' check (origen in ('excel_club','excel_pena','manual','alta_posterior')),
  dni_club text,
  nombre_club text,
  zona_club text,
  categoria_club text,
  precio_original numeric(10,2) not null default 0,
  descuento_club numeric(10,2) not null default 0,
  precio_abono numeric(10,2) not null default 0,
  categoria_pena text,
  cuota_base numeric(10,2) not null default 0,
  cuota_exenta numeric(10,2) not null default 0,
  cuota_final numeric(10,2) not null default 0,
  gestion_abono text not null default 'pena' check (gestion_abono in ('pena','club','no_renueva','pendiente')),
  estado text not null default 'pendiente_revision' check (estado in ('pendiente_revision','pendiente_pago','pagado','incidencia','baja','no_renueva','alta_posterior')),
  forma_pago text check (forma_pago in ('tarjeta','efectivo','club',null)),
  importe_total numeric(10,2) generated always as (
    case when gestion_abono='pena' then precio_abono + cuota_final else cuota_final end
  ) stored,
  importe_pagado numeric(10,2) not null default 0,
  fecha_pago timestamptz,
  referencia_pago text,
  es_directivo boolean not null default false,
  datos_origen jsonb not null default '{}'::jsonb,
  observaciones text,
  movimiento_post_cierre boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(campana_id,socio_id)
);

create table if not exists public.campanas_incidencias (
  id uuid primary key default gen_random_uuid(),
  campana_id uuid not null references public.campanas_abonados(id) on delete cascade,
  registro_id uuid references public.campanas_registros(id) on delete cascade,
  tipo text not null,
  gravedad text not null default 'media' check (gravedad in ('baja','media','alta','critica')),
  descripcion text not null,
  estado text not null default 'abierta' check (estado in ('abierta','resuelta','descartada')),
  resolucion text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.campanas_piloto_participantes (
  campana_id uuid not null references public.campanas_abonados(id) on delete cascade,
  socio_id uuid not null references public.socios(id) on delete cascade,
  invitado_at timestamptz not null default now(),
  completado_at timestamptz,
  primary key(campana_id,socio_id)
);

create table if not exists public.campanas_pruebas_feedback (
  id uuid primary key default gen_random_uuid(),
  campana_id uuid not null references public.campanas_abonados(id) on delete cascade,
  socio_id uuid references public.socios(id),
  tipo text not null default 'otro',
  mensaje text not null,
  estado text not null default 'abierto',
  created_at timestamptz not null default now()
);

create table if not exists public.socios_antiguedad (
  socio_id uuid primary key references public.socios(id) on delete cascade,
  anio_declarado integer,
  temporada_confirmada text,
  estado text not null default 'pendiente' check (estado in ('pendiente','confirmada','corregida')),
  nivel_certeza text default 'aproximada',
  numero_provisional text,
  numero_definitivo integer unique,
  observaciones text,
  updated_at timestamptz not null default now()
);

create or replace function public.c28_touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_c28_campaign_touch on public.campanas_abonados;
create trigger trg_c28_campaign_touch before update on public.campanas_abonados for each row execute function public.c28_touch_updated_at();
drop trigger if exists trg_c28_record_touch on public.campanas_registros;
create trigger trg_c28_record_touch before update on public.campanas_registros for each row execute function public.c28_touch_updated_at();

-- RLS. El acceso administrativo se valida además en la aplicación.
alter table public.campanas_abonados enable row level security;
alter table public.campanas_categorias enable row level security;
alter table public.campanas_directivos enable row level security;
alter table public.familias_socios enable row level security;
alter table public.familias_miembros enable row level security;
alter table public.campanas_registros enable row level security;
alter table public.campanas_incidencias enable row level security;
alter table public.campanas_piloto_participantes enable row level security;
alter table public.campanas_pruebas_feedback enable row level security;
alter table public.socios_antiguedad enable row level security;

-- Políticas para usuarios autenticados. En producción conviene endurecerlas con vuestra tabla de administradores.
do $$ declare t text; begin
  foreach t in array array['campanas_abonados','campanas_categorias','campanas_directivos','familias_socios','familias_miembros','campanas_registros','campanas_incidencias','campanas_piloto_participantes','campanas_pruebas_feedback','socios_antiguedad'] loop
    execute format('drop policy if exists c28_authenticated_all on public.%I',t);
    execute format('create policy c28_authenticated_all on public.%I for all to authenticated using (true) with check (true)',t);
  end loop;
end $$;

-- Campaña histórica 26/27 y piloto 27/28.
insert into public.campanas_abonados(temporada,nombre,tipo,estado,fecha_corte,pago_online_activo,modo_pruebas,altas_post_cierre,texto_socio)
values
('2026/27','Campaña 2026/27 · Histórico','historica','historica','2026-06-30',false,false,true,'Campaña cerrada. Se permiten altas posteriores desde administración.'),
('2027/28','Campaña piloto 2027/28','piloto','borrador','2027-06-30',true,true,true,'CAMPAÑA DE PRUEBAS: ningún pago es real.')
on conflict (temporada,tipo) do nothing;

insert into public.campanas_categorias(campana_id,nombre,edad_min,edad_max,cuota,orden)
select c.id,x.nombre,x.edad_min,x.edad_max,x.cuota,x.orden
from public.campanas_abonados c
cross join (values ('Infantil',0,13,0::numeric,1),('Joven',14,25,10::numeric,2),('Adulto',26,null::integer,20::numeric,3)) x(nombre,edad_min,edad_max,cuota,orden)
where c.temporada='2026/27' and c.tipo='historica'
on conflict(campana_id,nombre) do nothing;

insert into public.campanas_categorias(campana_id,nombre,edad_min,edad_max,cuota,orden)
select c.id,x.nombre,x.edad_min,x.edad_max,x.cuota,x.orden
from public.campanas_abonados c
cross join (values ('Infantil',0,13,0::numeric,1),('Joven',14,25,10::numeric,2),('Adulto',26,null::integer,20::numeric,3)) x(nombre,edad_min,edad_max,cuota,orden)
where c.temporada='2027/28' and c.tipo='piloto'
on conflict(campana_id,nombre) do nothing;
