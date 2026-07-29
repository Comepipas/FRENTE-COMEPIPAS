-- COMMIT 32.1 · Catálogo de material
-- Amplía el límite del bucket de fotografías a 10 MB.
-- El navegador optimiza las imágenes antes de subirlas, por lo que normalmente
-- quedarán por debajo de 2,2 MB. Este ajuste aporta margen adicional.

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
where id = 'material-images';

-- Crear el bucket si el Commit 20 no llegó a crearlo.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('material-images','material-images',true,10485760,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
