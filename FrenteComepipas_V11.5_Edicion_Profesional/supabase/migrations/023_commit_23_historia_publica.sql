-- Commit 23.1: Historia de la Peña pública y editable desde Administración
-- Compatible con la estructura actual de Frente Comepipas.
-- Puede ejecutarse aunque el intento anterior se quedara a medias.

begin;

create table if not exists public.site_content (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

-- Función propia de este módulo. No depende de public.is_admin().
create or replace function public.c23_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles p
    where p.user_id = auth.uid()
      and coalesce(p.activo, true) = true
  );
$$;

revoke all on function public.c23_is_admin() from public;
grant execute on function public.c23_is_admin() to anon, authenticated;

drop policy if exists "site content public read" on public.site_content;
drop policy if exists "site content admins insert" on public.site_content;
drop policy if exists "site content admins update" on public.site_content;
drop policy if exists "site content admins delete" on public.site_content;
drop policy if exists "site_content_public_read" on public.site_content;
drop policy if exists "site_content_admin_insert" on public.site_content;
drop policy if exists "site_content_admin_update" on public.site_content;
drop policy if exists "site_content_admin_delete" on public.site_content;

create policy "site_content_public_read"
on public.site_content
for select
to anon, authenticated
using (true);

create policy "site_content_admin_insert"
on public.site_content
for insert
to authenticated
with check (public.c23_is_admin());

create policy "site_content_admin_update"
on public.site_content
for update
to authenticated
using (public.c23_is_admin())
with check (public.c23_is_admin());

create policy "site_content_admin_delete"
on public.site_content
for delete
to authenticated
using (public.c23_is_admin());

grant select on table public.site_content to anon, authenticated;
grant insert, update, delete on table public.site_content to authenticated;

insert into public.site_content (id, content, updated_at)
values (
  'pena_history',
  jsonb_build_object(
    'eyebrow', 'Desde 2007',
    'title', 'Nuestra historia',
    'intro', 'Frente Comepipas nació de la amistad, la pasión por el Málaga CF y las ganas de compartir cada partido como una familia.',
    'image', '',
    'valuesTitle', 'Nuestros valores',
    'values', 'Malaguismo, amistad, respeto, convivencia y apoyo incondicional a nuestros colores.',
    'timeline', jsonb_build_array(
      jsonb_build_object('year', '2007', 'title', 'Fundación', 'text', 'Nace la peña Frente Comepipas.'),
      jsonb_build_object('year', '2015', 'title', 'Crecimiento', 'text', 'Aumentan los viajes, encuentros y actividades.'),
      jsonb_build_object('year', '2026', 'title', 'Nueva etapa digital', 'text', 'La peña renueva su web y sus servicios para socios.')
    )
  ),
  now()
)
on conflict (id) do nothing;

commit;
