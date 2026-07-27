-- =============================================================
-- FRENTE COMEPIPAS · COMMIT 32.2
-- Catálogo profesional de material (sin venta online)
-- Ejecutar completo en Supabase > SQL Editor
-- =============================================================
begin;

alter table public.material_items
  add column if not exists precio numeric(10,2),
  add column if not exists mostrar_precio boolean not null default true,
  add column if not exists codigo_interno text,
  add column if not exists color text,
  add column if not exists nuevo boolean not null default false;

create table if not exists public.material_item_images(
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.material_items(id) on delete cascade,
  imagen_url text not null,
  imagen_path text not null,
  orden integer not null default 100,
  principal boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists material_item_images_item_idx
  on public.material_item_images(material_id,principal desc,orden,created_at);

-- Migra la fotografía antigua a la nueva galería sin duplicarla.
insert into public.material_item_images(material_id,imagen_url,imagen_path,orden,principal)
select i.id,i.imagen_url,i.imagen_path,10,true
from public.material_items i
where nullif(i.imagen_url,'') is not null
  and nullif(i.imagen_path,'') is not null
  and not exists(select 1 from public.material_item_images x where x.material_id=i.id);

alter table public.material_item_images enable row level security;
drop policy if exists material_item_images_public_read on public.material_item_images;
create policy material_item_images_public_read on public.material_item_images
for select using(
  exists(select 1 from public.material_items i where i.id=material_id and (i.visible=true or public.fc_is_admin()))
);
drop policy if exists material_item_images_admin_all on public.material_item_images;
create policy material_item_images_admin_all on public.material_item_images
for all using(public.fc_is_admin()) with check(public.fc_is_admin());

-- Una sola imagen principal por producto.
create unique index if not exists material_item_images_one_primary
on public.material_item_images(material_id) where principal=true;

-- Mantiene la compatibilidad: imagen_url / imagen_path apuntan a la principal.
create or replace function public.fc_sync_material_primary_image()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_material uuid; v_img record;
begin
  v_material:=coalesce(new.material_id,old.material_id);
  select imagen_url,imagen_path into v_img
  from public.material_item_images
  where material_id=v_material
  order by principal desc,orden,created_at
  limit 1;
  update public.material_items
  set imagen_url=v_img.imagen_url,imagen_path=v_img.imagen_path
  where id=v_material;
  return coalesce(new,old);
end$$;

drop trigger if exists trg_sync_material_primary_image on public.material_item_images;
create trigger trg_sync_material_primary_image
after insert or update or delete on public.material_item_images
for each row execute function public.fc_sync_material_primary_image();

-- Vista administrativa actualizada.
drop view if exists public.material_admin_summary;
create view public.material_admin_summary with(security_invoker=true) as
select i.*,c.nombre categoria_nombre,c.slug categoria_slug,
 count(distinct r.id) solicitudes_totales,
 count(distinct r.id) filter(where r.estado in('Pendiente','Contactado','Reservado')) solicitudes_abiertas,
 count(distinct r.id) filter(where r.estado='Entregado') solicitudes_entregadas,
 count(distinct im.id) imagenes_totales
from public.material_items i
left join public.material_categories c on c.id=i.categoria_id
left join public.material_requests r on r.material_id=i.id
left join public.material_item_images im on im.material_id=i.id
group by i.id,c.nombre,c.slug;

commit;
select 'Commit 32.2 instalado correctamente' resultado;
