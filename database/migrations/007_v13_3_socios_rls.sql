-- V13.3.0 R4
-- Políticas de socios para usuarios autenticados.
-- Ejecutar únicamente si diagnostico-socios.html muestra un error de RLS/permisos.

begin;

alter table public.socios enable row level security;
alter table public.member_history enable row level security;
alter table public.member_guardians enable row level security;

drop policy if exists socios_select_authenticated on public.socios;
create policy socios_select_authenticated
on public.socios for select
to authenticated
using (true);

drop policy if exists socios_insert_authenticated on public.socios;
create policy socios_insert_authenticated
on public.socios for insert
to authenticated
with check (true);

drop policy if exists socios_update_authenticated on public.socios;
create policy socios_update_authenticated
on public.socios for update
to authenticated
using (true)
with check (true);

drop policy if exists member_history_select_authenticated on public.member_history;
create policy member_history_select_authenticated
on public.member_history for select
to authenticated
using (true);

drop policy if exists member_guardians_select_authenticated on public.member_guardians;
create policy member_guardians_select_authenticated
on public.member_guardians for select
to authenticated
using (true);

drop policy if exists member_guardians_write_authenticated on public.member_guardians;
create policy member_guardians_write_authenticated
on public.member_guardians for all
to authenticated
using (true)
with check (true);

commit;
