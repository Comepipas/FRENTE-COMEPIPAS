-- V9.0: perfiles y roles para Supabase Auth
create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol text not null check (rol in ('superadmin','presidente','secretario','tesorero','viajes','editor')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_profiles enable row level security;

create policy "usuarios autenticados leen su perfil"
on public.admin_profiles
for select
to authenticated
using (auth.uid() = user_id);

-- La gestión completa de perfiles debe limitarse mediante funciones seguras
-- o políticas adicionales para el rol superadmin.
