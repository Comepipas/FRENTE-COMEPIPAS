-- FRENTE COMEPIPAS · COMMIT 26 · GALERÍA POR ÁLBUMES
create extension if not exists pgcrypto;

create table if not exists public.gallery_albums (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  slug text not null unique,
  descripcion text,
  fecha date,
  temporada text,
  portada_url text,
  publicado boolean not null default false,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.gallery_albums(id) on delete cascade,
  titulo text,
  descripcion text,
  imagen_url text not null,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.gallery_albums enable row level security;
alter table public.gallery_photos enable row level security;

drop policy if exists gallery_albums_public_read on public.gallery_albums;
create policy gallery_albums_public_read on public.gallery_albums for select using (publicado = true or public.c23_is_admin());
drop policy if exists gallery_albums_admin_all on public.gallery_albums;
create policy gallery_albums_admin_all on public.gallery_albums for all using (public.c23_is_admin()) with check (public.c23_is_admin());

drop policy if exists gallery_photos_public_read on public.gallery_photos;
create policy gallery_photos_public_read on public.gallery_photos for select using (
  exists(select 1 from public.gallery_albums a where a.id=album_id and (a.publicado=true or public.c23_is_admin()))
);
drop policy if exists gallery_photos_admin_all on public.gallery_photos;
create policy gallery_photos_admin_all on public.gallery_photos for all using (public.c23_is_admin()) with check (public.c23_is_admin());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('gallery','gallery',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true;

drop policy if exists gallery_storage_public_read on storage.objects;
create policy gallery_storage_public_read on storage.objects for select using (bucket_id='gallery');
drop policy if exists gallery_storage_admin_insert on storage.objects;
create policy gallery_storage_admin_insert on storage.objects for insert with check (bucket_id='gallery' and public.c23_is_admin());
drop policy if exists gallery_storage_admin_update on storage.objects;
create policy gallery_storage_admin_update on storage.objects for update using (bucket_id='gallery' and public.c23_is_admin());
drop policy if exists gallery_storage_admin_delete on storage.objects;
create policy gallery_storage_admin_delete on storage.objects for delete using (bucket_id='gallery' and public.c23_is_admin());
