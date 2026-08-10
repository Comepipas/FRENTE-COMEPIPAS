-- Frente Comepipas V9.5
-- Políticas RLS básicas

alter table public.admin_profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.members enable row level security;
alter table public.fees enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.trips enable row level security;
alter table public.trip_bookings enable row level security;
alter table public.news enable row level security;
alter table public.media_items enable row level security;
alter table public.events enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.current_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol
  from public.admin_profiles
  where user_id = auth.uid()
    and activo = true
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
      and activo = true
  );
$$;

create or replace function public.has_admin_role(allowed text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_admin_role() = any(allowed);
$$;

-- Lectura pública limitada
create policy "public read published news"
on public.news for select
to anon, authenticated
using (estado = 'Publicada' and (programada_para is null or programada_para <= now()));

create policy "public read active products"
on public.products for select
to anon, authenticated
using (activo = true);

create policy "public read trips"
on public.trips for select
to anon, authenticated
using (true);

create policy "public read events"
on public.events for select
to anon, authenticated
using (true);

create policy "public read published media"
on public.media_items for select
to anon, authenticated
using (estado = 'Publicado');

create policy "public read settings"
on public.site_settings for select
to anon, authenticated
using (true);

-- Administración autenticada
create policy "admins manage members"
on public.members for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage fees"
on public.fees for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage products"
on public.products for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage orders"
on public.orders for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage trips"
on public.trips for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage bookings"
on public.trip_bookings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage news"
on public.news for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage media"
on public.media_items for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage events"
on public.events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage settings"
on public.site_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins read audit"
on public.audit_log for select
to authenticated
using (public.is_admin());

create policy "admins insert audit"
on public.audit_log for insert
to authenticated
with check (public.is_admin());

create policy "users read own admin profile"
on public.admin_profiles for select
to authenticated
using (user_id = auth.uid());

create policy "superadmin manage profiles"
on public.admin_profiles for all
to authenticated
using (public.has_admin_role(array['superadmin']))
with check (public.has_admin_role(array['superadmin']));
