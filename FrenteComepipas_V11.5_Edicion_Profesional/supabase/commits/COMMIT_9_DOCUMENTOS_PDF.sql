-- V22 Commit 9: almacenamiento privado de PDFs de renovación
-- Ejecutar una vez en Supabase > SQL Editor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'private-documents',
  'private-documents',
  false,
  20971520,
  array['application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Eliminamos únicamente las políticas de este commit para poder reejecutarlo.
drop policy if exists "commit9 admins read renewal pdfs" on storage.objects;
drop policy if exists "commit9 admins insert renewal pdfs" on storage.objects;
drop policy if exists "commit9 admins update renewal pdfs" on storage.objects;
drop policy if exists "commit9 admins delete renewal pdfs" on storage.objects;
drop policy if exists "commit9 authenticated read renewal pdfs" on storage.objects;

create policy "commit9 admins insert renewal pdfs"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'private-documents'
  and public.es_directivo()
);

create policy "commit9 admins update renewal pdfs"
on storage.objects for update
to authenticated
using (
  bucket_id = 'private-documents'
  and public.es_directivo()
)
with check (
  bucket_id = 'private-documents'
  and public.es_directivo()
);

create policy "commit9 admins delete renewal pdfs"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'private-documents'
  and public.es_directivo()
);

-- Los socios autenticados pueden abrir los documentos activos mediante URL firmada.
create policy "commit9 authenticated read renewal pdfs"
on storage.objects for select
to authenticated
using (bucket_id = 'private-documents');
