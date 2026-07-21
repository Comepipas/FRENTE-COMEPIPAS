-- Permite que los administradores autenticados consulten las cuotas.
-- Es seguro volver a ejecutarlo: elimina y recrea solamente esta política.

alter table public.cuotas_socios enable row level security;

drop policy if exists cuotas_admin_select on public.cuotas_socios;

create policy cuotas_admin_select
on public.cuotas_socios
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_profiles p
    where p.user_id = auth.uid()
      and p.activo = true
      and p.rol in ('superadmin', 'presidente', 'secretario', 'tesorero')
  )
);
