-- FRENTE COMEPIPAS · COMMIT 26.1
-- Subida de imágenes ON TOUR desde el ordenador
-- Ejecutar completo en Supabase > SQL Editor

begin;

alter table public.travel_events
  add column if not exists imagen_path text;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'on-tour-images',
  'on-tour-images',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict(id) do update set
  public=true,
  file_size_limit=10485760,
  allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists on_tour_images_public_read on storage.objects;
create policy on_tour_images_public_read
on storage.objects for select
using(bucket_id='on-tour-images');

drop policy if exists on_tour_images_admin_insert on storage.objects;
create policy on_tour_images_admin_insert
on storage.objects for insert
with check(bucket_id='on-tour-images' and public.c23_is_admin());

drop policy if exists on_tour_images_admin_update on storage.objects;
create policy on_tour_images_admin_update
on storage.objects for update
using(bucket_id='on-tour-images' and public.c23_is_admin())
with check(bucket_id='on-tour-images' and public.c23_is_admin());

drop policy if exists on_tour_images_admin_delete on storage.objects;
create policy on_tour_images_admin_delete
on storage.objects for delete
using(bucket_id='on-tour-images' and public.c23_is_admin());

commit;

select 'Commit 26.1 instalado correctamente' resultado;
