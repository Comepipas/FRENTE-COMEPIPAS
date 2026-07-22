-- =============================================================
-- FRENTE COMEPIPAS · COMMIT 21 · CENTRO DOCUMENTAL SUPABASE
-- Ejecutar completo en Supabase > SQL Editor
-- =============================================================
create extension if not exists pgcrypto;

create or replace function public.fc_is_admin()
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.admin_profiles where user_id=auth.uid() and coalesce(activo,true)=true);
$$;

create table if not exists public.document_categories(
 id uuid primary key default gen_random_uuid(),
 nombre text not null unique,
 descripcion text,
 icono text not null default '📁',
 orden integer not null default 100,
 activa boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.documents(
 id uuid primary key default gen_random_uuid(),
 category_id uuid references public.document_categories(id) on delete set null,
 titulo text not null,
 descripcion text,
 temporada text,
 etiquetas text[] not null default '{}',
 visibilidad text not null default 'socios' check(visibilidad in ('publico','socios','administradores')),
 estado text not null default 'publicado' check(estado in ('borrador','publicado','archivado')),
 requiere_aceptacion boolean not null default false,
 vigente_desde date,
 vigente_hasta date,
 version_actual integer not null default 0,
 destacado boolean not null default false,
 orden integer not null default 100,
 creado_por uuid references auth.users(id) on delete set null,
 actualizado_por uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.document_versions(
 id uuid primary key default gen_random_uuid(),
 document_id uuid not null references public.documents(id) on delete cascade,
 numero integer not null,
 nombre_archivo text not null,
 storage_path text not null unique,
 mime_type text,
 tamano_bytes bigint,
 notas_version text,
 subido_por uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(document_id,numero)
);

create table if not exists public.document_acceptances(
 id uuid primary key default gen_random_uuid(),
 document_id uuid not null references public.documents(id) on delete cascade,
 version_id uuid not null references public.document_versions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 socio_id uuid references public.socios(id) on delete set null,
 accepted_at timestamptz not null default now(),
 ip_note text,
 user_agent text,
 unique(version_id,user_id)
);

create index if not exists idx_documents_category on public.documents(category_id);
create index if not exists idx_documents_visibility on public.documents(visibilidad,estado);
create index if not exists idx_document_versions_document on public.document_versions(document_id,numero desc);
create index if not exists idx_document_acceptances_user on public.document_acceptances(user_id,accepted_at desc);

insert into public.document_categories(nombre,descripcion,icono,orden) values
 ('Documentación oficial','Estatutos, normativa y documentación institucional','📜',10),
 ('Socios','Formularios, autorizaciones y documentos para socios','👥',20),
 ('Junta Directiva','Actas y documentos internos','🔒',30),
 ('Temporada 2026/27','Documentación de la temporada','⚽',40),
 ('Viajes y entradas','Normas, autorizaciones y formularios','🚌',50),
 ('Material y cartelería','Catálogos, carteles y recursos gráficos','🖼️',60)
on conflict(nombre) do nothing;

alter table public.document_categories enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_acceptances enable row level security;

-- Categorías
drop policy if exists doc_categories_read on public.document_categories;
create policy doc_categories_read on public.document_categories for select using(activa=true or public.fc_is_admin());
drop policy if exists doc_categories_admin on public.document_categories;
create policy doc_categories_admin on public.document_categories for all using(public.fc_is_admin()) with check(public.fc_is_admin());

-- Documentos: público sin sesión; socios autenticados; administradores todo.
drop policy if exists documents_read on public.documents;
create policy documents_read on public.documents for select using(
 public.fc_is_admin() or
 (estado='publicado' and visibilidad='publico') or
 (estado='publicado' and visibilidad='socios' and auth.uid() is not null)
);
drop policy if exists documents_admin on public.documents;
create policy documents_admin on public.documents for all using(public.fc_is_admin()) with check(public.fc_is_admin());

-- Versiones heredan la visibilidad del documento.
drop policy if exists document_versions_read on public.document_versions;
create policy document_versions_read on public.document_versions for select using(exists(
 select 1 from public.documents d where d.id=document_id and (
  public.fc_is_admin() or (d.estado='publicado' and d.visibilidad='publico') or
  (d.estado='publicado' and d.visibilidad='socios' and auth.uid() is not null)
 )
));
drop policy if exists document_versions_admin on public.document_versions;
create policy document_versions_admin on public.document_versions for all using(public.fc_is_admin()) with check(public.fc_is_admin());

-- Aceptaciones: cada usuario ve/crea las suyas; administración ve todas.
drop policy if exists document_acceptances_read on public.document_acceptances;
create policy document_acceptances_read on public.document_acceptances for select using(public.fc_is_admin() or user_id=auth.uid());
drop policy if exists document_acceptances_insert on public.document_acceptances;
create policy document_acceptances_insert on public.document_acceptances for insert with check(user_id=auth.uid());
drop policy if exists document_acceptances_admin on public.document_acceptances;
create policy document_acceptances_admin on public.document_acceptances for all using(public.fc_is_admin()) with check(public.fc_is_admin());

-- Bucket privado. Las descargas se realizan mediante URL firmada.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('documents-private','documents-private',false,26214400,array[
 'application/pdf','image/jpeg','image/png','image/webp',
 'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'text/plain','text/csv'
]) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists documents_storage_admin_select on storage.objects;
create policy documents_storage_admin_select on storage.objects for select using(bucket_id='documents-private' and public.fc_is_admin());
drop policy if exists documents_storage_admin_insert on storage.objects;
create policy documents_storage_admin_insert on storage.objects for insert with check(bucket_id='documents-private' and public.fc_is_admin());
drop policy if exists documents_storage_admin_update on storage.objects;
create policy documents_storage_admin_update on storage.objects for update using(bucket_id='documents-private' and public.fc_is_admin()) with check(bucket_id='documents-private' and public.fc_is_admin());
drop policy if exists documents_storage_admin_delete on storage.objects;
create policy documents_storage_admin_delete on storage.objects for delete using(bucket_id='documents-private' and public.fc_is_admin());

-- RPC: crea aceptación de la versión vigente y enlaza al socio autenticado si existe.
create or replace function public.accept_document(p_document_id uuid,p_version_id uuid,p_user_agent text default null)
returns public.document_acceptances language plpgsql security definer set search_path=public as $$
declare v public.document_acceptances; v_socio uuid;
begin
 if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
 if not exists(select 1 from public.document_versions dv join public.documents d on d.id=dv.document_id
  where dv.id=p_version_id and d.id=p_document_id and d.estado='publicado'
  and d.requiere_aceptacion=true and d.version_actual=dv.numero
  and (d.visibilidad='publico' or d.visibilidad='socios' or public.fc_is_admin())) then
  raise exception 'Documento o versión no disponibles';
 end if;
 select id into v_socio from public.socios where auth_user_id=auth.uid() limit 1;
 insert into public.document_acceptances(document_id,version_id,user_id,socio_id,user_agent)
 values(p_document_id,p_version_id,auth.uid(),v_socio,p_user_agent)
 on conflict(version_id,user_id) do update set accepted_at=now(),user_agent=excluded.user_agent
 returning * into v;
 return v;
end $$;
grant execute on function public.accept_document(uuid,uuid,text) to authenticated;

-- Vista administrativa útil para el panel.
create or replace view public.document_admin_summary as
select d.*,c.nombre categoria,c.icono,
 v.id version_id,v.nombre_archivo,v.storage_path,v.mime_type,v.tamano_bytes,v.created_at version_fecha,
 (select count(*) from public.document_acceptances a where a.document_id=d.id) aceptaciones
from public.documents d
left join public.document_categories c on c.id=d.category_id
left join public.document_versions v on v.document_id=d.id and v.numero=d.version_actual;

-- Mantener updated_at.
create or replace function public.fc_touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists trg_doc_categories_touch on public.document_categories;
create trigger trg_doc_categories_touch before update on public.document_categories for each row execute function public.fc_touch_updated_at();
drop trigger if exists trg_documents_touch on public.documents;
create trigger trg_documents_touch before update on public.documents for each row execute function public.fc_touch_updated_at();

select 'COMMIT 21 instalado correctamente' as resultado,
 (select count(*) from public.document_categories) as categorias;
