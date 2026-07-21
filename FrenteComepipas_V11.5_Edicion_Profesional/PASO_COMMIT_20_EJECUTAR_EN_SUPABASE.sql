-- =============================================================
-- FRENTE COMEPIPAS · COMMIT 20
-- Catálogo de material y solicitudes SIN venta ni pago online
-- Ejecutar completo en Supabase > SQL Editor
-- =============================================================
begin;
create extension if not exists pgcrypto;

create or replace function public.fc_is_admin()
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.admin_profiles where user_id=auth.uid() and coalesce(activo,true)=true);
$$;

create or replace function public.fc_current_member_id()
returns uuid language sql stable security definer set search_path=public as $$
 select id from public.socios where auth_user_id=auth.uid() limit 1;
$$;

create sequence if not exists public.material_request_number_seq start 1;

create table if not exists public.material_categories(
 id uuid primary key default gen_random_uuid(),
 nombre text not null unique,
 slug text not null unique,
 orden integer not null default 100,
 activa boolean not null default true,
 created_at timestamptz not null default now()
);

create table if not exists public.material_items(
 id uuid primary key default gen_random_uuid(),
 categoria_id uuid references public.material_categories(id) on delete set null,
 nombre text not null,
 descripcion text,
 imagen_url text,
 imagen_path text,
 emoji text default '📦',
 variantes text,
 disponibilidad text not null default 'Disponible' check(disponibilidad in ('Disponible','Consultar','Lista abierta','No disponible')),
 unidades_orientativas integer not null default 0 check(unidades_orientativas>=0),
 visible boolean not null default true,
 destacado boolean not null default false,
 orden integer not null default 100,
 observaciones_internas text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.material_requests(
 id uuid primary key default gen_random_uuid(),
 referencia text not null unique default ('MAT-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.material_request_number_seq')::text,6,'0')),
 socio_id uuid references public.socios(id) on delete set null,
 material_id uuid not null references public.material_items(id) on delete restrict,
 nombre text not null,
 telefono text not null,
 email text,
 cantidad integer not null default 1 check(cantidad between 1 and 20),
 variante text,
 preferencia_contacto text not null default 'WhatsApp' check(preferencia_contacto in ('WhatsApp','Llamada','Correo electrónico')),
 observaciones_socio text,
 estado text not null default 'Pendiente' check(estado in ('Pendiente','Contactado','Reservado','Entregado','Cancelado')),
 nota_respuesta text,
 fecha_contacto timestamptz,
 fecha_reserva timestamptz,
 fecha_entrega timestamptz,
 gestionado_por uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create index if not exists material_items_visible_idx on public.material_items(visible,orden);
create index if not exists material_requests_estado_idx on public.material_requests(estado,created_at desc);
create index if not exists material_requests_socio_idx on public.material_requests(socio_id,created_at desc);

create or replace function public.fc_touch_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
drop trigger if exists trg_material_items_updated on public.material_items;
create trigger trg_material_items_updated before update on public.material_items for each row execute function public.fc_touch_updated_at();
drop trigger if exists trg_material_requests_updated on public.material_requests;
create trigger trg_material_requests_updated before update on public.material_requests for each row execute function public.fc_touch_updated_at();

insert into public.material_categories(nombre,slug,orden) values
 ('Bufandas','bufandas',10),('Banderas','banderas',20),('Camisetas','camisetas',30),('Sudaderas','sudaderas',40),
 ('Gorras','gorras',50),('Mochilas','mochilas',60),('Pegatinas','pegatinas',70),('Tazas','tazas',80),('Otros','otros',100)
on conflict(slug) do nothing;

create or replace function public.submit_material_request(
 p_material_id uuid,p_nombre text,p_telefono text,p_email text default null,p_cantidad integer default 1,
 p_variante text default null,p_preferencia_contacto text default 'WhatsApp',p_observaciones text default null
) returns table(id uuid,referencia text,estado text,created_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare v_item public.material_items%rowtype;v_socio uuid;v_row public.material_requests%rowtype;
begin
 select * into v_item from public.material_items where id=p_material_id and visible=true;
 if not found then raise exception 'El material no está disponible en el catálogo';end if;
 if v_item.disponibilidad='No disponible' then raise exception 'Este material figura como no disponible';end if;
 if nullif(trim(p_nombre),'') is null or nullif(trim(p_telefono),'') is null then raise exception 'Nombre y teléfono son obligatorios';end if;
 if p_cantidad<1 or p_cantidad>20 then raise exception 'Cantidad no válida';end if;
 v_socio:=public.fc_current_member_id();
 insert into public.material_requests(socio_id,material_id,nombre,telefono,email,cantidad,variante,preferencia_contacto,observaciones_socio)
 values(v_socio,p_material_id,trim(p_nombre),trim(p_telefono),nullif(trim(p_email),''),p_cantidad,nullif(trim(p_variante),''),p_preferencia_contacto,nullif(trim(p_observaciones),''))
 returning * into v_row;
 return query select v_row.id,v_row.referencia,v_row.estado,v_row.created_at;
end$$;

grant execute on function public.submit_material_request(uuid,text,text,text,integer,text,text,text) to anon,authenticated;

alter table public.material_categories enable row level security;
alter table public.material_items enable row level security;
alter table public.material_requests enable row level security;

drop policy if exists material_categories_public_read on public.material_categories;
create policy material_categories_public_read on public.material_categories for select using(activa=true or public.fc_is_admin());
drop policy if exists material_categories_admin_all on public.material_categories;
create policy material_categories_admin_all on public.material_categories for all using(public.fc_is_admin()) with check(public.fc_is_admin());

drop policy if exists material_items_public_read on public.material_items;
create policy material_items_public_read on public.material_items for select using(visible=true or public.fc_is_admin());
drop policy if exists material_items_admin_all on public.material_items;
create policy material_items_admin_all on public.material_items for all using(public.fc_is_admin()) with check(public.fc_is_admin());

drop policy if exists material_requests_admin_all on public.material_requests;
create policy material_requests_admin_all on public.material_requests for all using(public.fc_is_admin()) with check(public.fc_is_admin());
drop policy if exists material_requests_member_read on public.material_requests;
create policy material_requests_member_read on public.material_requests for select using(socio_id=public.fc_current_member_id());

-- Almacenamiento de imágenes del catálogo
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('material-images','material-images',true,5242880,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists material_images_public_read on storage.objects;
create policy material_images_public_read on storage.objects for select using(bucket_id='material-images');
drop policy if exists material_images_admin_insert on storage.objects;
create policy material_images_admin_insert on storage.objects for insert with check(bucket_id='material-images' and public.fc_is_admin());
drop policy if exists material_images_admin_update on storage.objects;
create policy material_images_admin_update on storage.objects for update using(bucket_id='material-images' and public.fc_is_admin()) with check(bucket_id='material-images' and public.fc_is_admin());
drop policy if exists material_images_admin_delete on storage.objects;
create policy material_images_admin_delete on storage.objects for delete using(bucket_id='material-images' and public.fc_is_admin());

create or replace view public.material_admin_summary with(security_invoker=true) as
select i.*,c.nombre categoria_nombre,c.slug categoria_slug,
 count(r.id) solicitudes_totales,
 count(r.id) filter(where r.estado in('Pendiente','Contactado','Reservado')) solicitudes_abiertas,
 count(r.id) filter(where r.estado='Entregado') solicitudes_entregadas
from public.material_items i left join public.material_categories c on c.id=i.categoria_id
left join public.material_requests r on r.material_id=i.id group by i.id,c.nombre,c.slug;

commit;
select 'Commit 20 instalado correctamente' resultado,
 (select count(*) from public.material_categories) categorias,
 (select count(*) from public.material_items) materiales,
 (select count(*) from public.material_requests) solicitudes;
