-- Frente Comepipas V9.5
-- Esquema principal para Supabase/PostgreSQL

create extension if not exists pgcrypto;

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol text not null check (rol in ('superadmin','presidente','secretario','tesorero','viajes','editor')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id text primary key default 'main',
  nombre text,
  subtitulo text,
  lema text,
  temporada text,
  fundacion text,
  email text,
  telefono text,
  whatsapp text,
  direccion text,
  instagram text,
  facebook text,
  x text,
  youtube text,
  tiktok text,
  hero_image text,
  hero_position text,
  escudo text,
  logo text,
  color_primario text,
  color_secundario text,
  color_acento text,
  updated_at timestamptz not null default now()
);

create table if not exists public.members (
  id text primary key,
  numero text unique,
  nombre text not null,
  dni text,
  nacimiento date,
  direccion text,
  telefono text,
  email text,
  alta date,
  estado text,
  cuota text,
  tipo text,
  observaciones text,
  foto text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fees (
  id text primary key,
  socio_id text references public.members(id) on delete cascade,
  temporada text,
  importe numeric(10,2) not null default 0,
  estado text,
  fecha_pago date,
  metodo text,
  referencia text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  nombre text not null,
  categoria text,
  precio numeric(10,2) not null default 0,
  stock integer not null default 0,
  tallas jsonb not null default '[]'::jsonb,
  imagen text,
  descripcion text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  fecha date,
  cliente text,
  email text,
  telefono text,
  estado text,
  envio text,
  total numeric(10,2) not null default 0,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trips (
  id text primary key,
  destino text not null,
  fecha date,
  salida time,
  precio numeric(10,2) not null default 0,
  plazas integer not null default 0,
  disponibles integer not null default 0,
  imagen text,
  descripcion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_bookings (
  id text primary key,
  viaje_id text references public.trips(id) on delete cascade,
  socio_id text references public.members(id) on delete set null,
  nombre text not null,
  email text,
  telefono text,
  plazas integer not null default 1,
  estado text,
  pago text,
  metodo_pago text,
  importe numeric(10,2) not null default 0,
  fecha_reserva date,
  observaciones text,
  created_at timestamptz not null default now()
);

create table if not exists public.news (
  id text primary key,
  titulo text not null,
  categoria text,
  fecha date,
  imagen text,
  destacada boolean not null default false,
  resumen text,
  contenido jsonb not null default '[]'::jsonb,
  estado text not null default 'Borrador',
  programada_para timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_items (
  id text primary key,
  titulo text not null,
  tipo text,
  album text,
  temporada text,
  estado text,
  archivo text,
  miniatura text,
  descripcion text,
  fecha date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id text primary key,
  titulo text not null,
  tipo text,
  fecha date,
  hora time,
  lugar text,
  descripcion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id text primary key,
  created_at timestamptz not null default now(),
  user_id text,
  user_name text,
  user_role text,
  action text,
  module text,
  entity text,
  detail text,
  severity text
);

create index if not exists idx_members_numero on public.members(numero);
create index if not exists idx_fees_socio on public.fees(socio_id);
create index if not exists idx_trip_bookings_viaje on public.trip_bookings(viaje_id);
create index if not exists idx_news_estado_fecha on public.news(estado,fecha);
create index if not exists idx_audit_created_at on public.audit_log(created_at desc);
