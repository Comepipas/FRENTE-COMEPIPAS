-- FRENTE COMEPIPAS · COMMIT 40.8.0
-- Ejecutar una sola vez en Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.fc_app_settings (
  clave text primary key,
  valor jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.fc_app_settings enable row level security;
drop policy if exists fc_settings_public_read on public.fc_app_settings;
create policy fc_settings_public_read on public.fc_app_settings for select using (true);
drop policy if exists fc_settings_admin_write on public.fc_app_settings;
create policy fc_settings_admin_write on public.fc_app_settings for all
using (public.fc_is_admin()) with check (public.fc_is_admin());

insert into public.fc_app_settings(clave,valor) values
('general', jsonb_build_object('temporada_activa','2026/27','email_general','frentecomepipas2007@gmail.com')),
('notificaciones', jsonb_build_object('material_email','frentecomepipas2007@gmail.com','altas_email','frentecomepipas2007@gmail.com','copias','','material_activas',true,'altas_activas',true))
on conflict (clave) do nothing;

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(), nombre text not null, email text not null,
  telefono text not null, asunto text not null, mensaje text not null,
  privacidad_aceptada boolean not null default false,
  estado text not null default 'nueva' check (estado in ('nueva','contactada','pendiente_documentacion','completada','descartada')),
  user_agent text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.contact_requests enable row level security;
drop policy if exists contact_public_insert on public.contact_requests;
create policy contact_public_insert on public.contact_requests for insert with check (
  length(trim(nombre)) between 3 and 160 and length(trim(email)) between 5 and 254 and
  length(trim(telefono)) between 6 and 30 and length(trim(mensaje)) between 10 and 4000 and privacidad_aceptada=true
);
drop policy if exists contact_admin_all on public.contact_requests;
create policy contact_admin_all on public.contact_requests for all using (public.fc_is_admin()) with check (public.fc_is_admin());

-- Limpieza solicitada: únicamente comunicaciones inequívocamente de prueba.
delete from public.communications where lower(trim(titulo)) in
('prueba 18:53','otra prueba','atleti-málaga','atleti-malaga','prueba bravo','prueba brevo');

-- Limpieza solicitada: únicamente las dos campañas piloto 2027/28 identificadas.
delete from public.campanas_abonados
where temporada='2027/28' and modo_pruebas=true and lower(trim(nombre)) in
('campaña 27/28','campana 27/28','simulación completa 2027/28','simulacion completa 2027/28');

-- El histórico 2026/27 conserva un solo registro por socio. Antes de quitar
-- duplicados exactos sin vincular se guarda una copia recuperable.
create table if not exists public.campanas_registros_backup_408
(like public.campanas_registros including defaults including constraints);
create unique index if not exists campanas_registros_backup_408_id_uq
on public.campanas_registros_backup_408(id);
with ranked as (
  select r.id,row_number() over(partition by r.campana_id,
    coalesce(nullif(upper(trim(r.dni_club)),''),'SIN_DNI'),
    upper(trim(coalesce(r.nombre_club,''))),coalesce(r.zona_club,''),coalesce(r.sector_club,''),
    coalesce(r.precio_abono,0),coalesce(r.descuento_club,0),coalesce(r.importe_total,0)
    order by r.created_at desc,r.id desc) as rn
  from public.campanas_registros r join public.campanas_abonados c on c.id=r.campana_id
  where c.temporada='2026/27' and c.tipo='historica' and r.socio_id is null
), duplicates as (select id from ranked where rn>1)
insert into public.campanas_registros_backup_408
select r.* from public.campanas_registros r join duplicates d on d.id=r.id
on conflict (id) do nothing;
with ranked as (
  select r.id,row_number() over(partition by r.campana_id,
    coalesce(nullif(upper(trim(r.dni_club)),''),'SIN_DNI'),
    upper(trim(coalesce(r.nombre_club,''))),coalesce(r.zona_club,''),coalesce(r.sector_club,''),
    coalesce(r.precio_abono,0),coalesce(r.descuento_club,0),coalesce(r.importe_total,0)
    order by r.created_at desc,r.id desc) as rn
  from public.campanas_registros r join public.campanas_abonados c on c.id=r.campana_id
  where c.temporada='2026/27' and c.tipo='historica' and r.socio_id is null
)
delete from public.campanas_registros r using ranked x where r.id=x.id and x.rn>1;
