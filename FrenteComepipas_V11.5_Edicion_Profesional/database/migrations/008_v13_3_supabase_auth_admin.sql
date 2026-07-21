-- V13.3.0 R5 — Autenticación administrativa con Supabase Auth
begin;

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol text not null check (rol in ('superadmin','presidente','secretario','tesorero','viajes','editor')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_profiles enable row level security;

drop policy if exists admin_profiles_read_own on public.admin_profiles;
create policy admin_profiles_read_own
on public.admin_profiles
for select
to authenticated
using (auth.uid() = user_id);

-- Socios: lectura y escritura para miembros activos de la directiva
alter table public.socios enable row level security;

drop policy if exists socios_board_select on public.socios;
create policy socios_board_select
on public.socios for select
to authenticated
using (
  exists (
    select 1 from public.admin_profiles p
    where p.user_id = auth.uid()
      and p.activo = true
      and p.rol in ('superadmin','presidente','secretario','tesorero','viajes')
  )
);

drop policy if exists socios_board_insert on public.socios;
create policy socios_board_insert
on public.socios for insert
to authenticated
with check (
  exists (
    select 1 from public.admin_profiles p
    where p.user_id = auth.uid()
      and p.activo = true
      and p.rol in ('superadmin','presidente','secretario','tesorero')
  )
);

drop policy if exists socios_board_update on public.socios;
create policy socios_board_update
on public.socios for update
to authenticated
using (
  exists (
    select 1 from public.admin_profiles p
    where p.user_id = auth.uid()
      and p.activo = true
      and p.rol in ('superadmin','presidente','secretario','tesorero')
  )
)
with check (
  exists (
    select 1 from public.admin_profiles p
    where p.user_id = auth.uid()
      and p.activo = true
      and p.rol in ('superadmin','presidente','secretario','tesorero')
  )
);

alter table public.member_history enable row level security;
drop policy if exists member_history_board_select on public.member_history;
create policy member_history_board_select
on public.member_history for select
to authenticated
using (
  exists (
    select 1 from public.admin_profiles p
    where p.user_id = auth.uid() and p.activo = true
  )
);

alter table public.member_guardians enable row level security;
drop policy if exists member_guardians_board_all on public.member_guardians;
create policy member_guardians_board_all
on public.member_guardians for all
to authenticated
using (
  exists (
    select 1 from public.admin_profiles p
    where p.user_id = auth.uid()
      and p.activo = true
      and p.rol in ('superadmin','presidente','secretario','tesorero')
  )
)
with check (
  exists (
    select 1 from public.admin_profiles p
    where p.user_id = auth.uid()
      and p.activo = true
      and p.rol in ('superadmin','presidente','secretario','tesorero')
  )
);

commit;
