-- Frente Comepipas V21
-- Permisos RLS para leer, crear y modificar cuotas.

alter table public.cuotas_socios enable row level security;

drop policy if exists cuotas_admin_select on public.cuotas_socios;
create policy cuotas_admin_select
on public.cuotas_socios
for select
to authenticated
using (
  exists (
    select 1 from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.activo = true
      and ap.rol in ('superadmin','presidente','secretario','tesorero','viajes')
  )
);

drop policy if exists cuotas_admin_insert on public.cuotas_socios;
create policy cuotas_admin_insert
on public.cuotas_socios
for insert
to authenticated
with check (
  exists (
    select 1 from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.activo = true
      and ap.rol in ('superadmin','presidente','secretario','tesorero')
  )
);

drop policy if exists cuotas_admin_update on public.cuotas_socios;
create policy cuotas_admin_update
on public.cuotas_socios
for update
to authenticated
using (
  exists (
    select 1 from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.activo = true
      and ap.rol in ('superadmin','presidente','secretario','tesorero')
  )
)
with check (
  exists (
    select 1 from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.activo = true
      and ap.rol in ('superadmin','presidente','secretario','tesorero')
  )
);
