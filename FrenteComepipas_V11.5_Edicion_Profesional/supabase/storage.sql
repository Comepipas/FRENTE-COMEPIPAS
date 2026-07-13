-- Buckets de almacenamiento

insert into storage.buckets (id,name,public)
values
  ('public-images','public-images',true),
  ('private-documents','private-documents',false)
on conflict (id) do nothing;

create policy "public images readable"
on storage.objects for select
to public
using (bucket_id = 'public-images');

create policy "admins upload public images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'public-images'
  and public.is_admin()
);

create policy "admins update public images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'public-images'
  and public.is_admin()
)
with check (
  bucket_id = 'public-images'
  and public.is_admin()
);

create policy "admins delete public images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'public-images'
  and public.is_admin()
);

create policy "admins read private documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'private-documents'
  and public.is_admin()
);

create policy "admins manage private documents"
on storage.objects for all
to authenticated
using (
  bucket_id = 'private-documents'
  and public.is_admin()
)
with check (
  bucket_id = 'private-documents'
  and public.is_admin()
);
