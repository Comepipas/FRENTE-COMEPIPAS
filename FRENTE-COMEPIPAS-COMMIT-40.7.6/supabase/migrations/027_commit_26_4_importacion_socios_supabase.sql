-- Frente Comepipas · Commit 26.4
-- Importación real de socios en Supabase, DNI como identificador y antigüedad de la peña.
-- Ejecutar una vez en Supabase > SQL Editor antes de probar la importación.

begin;

alter table public.socios
  add column if not exists fecha_alta_pena date;

comment on column public.socios.fecha_alta_pena is
  'Fecha histórica de alta en Frente Comepipas. Servirá para ordenar la antigüedad y asignar números de socio.';

-- El número de socio deja de generarse automáticamente. La directiva lo asignará
-- manualmente o mediante un proceso posterior ordenado por antigüedad.
alter table public.socios alter column numero_socio drop default;

-- Un DNI/NIE informado solo puede pertenecer a una persona.
-- Se ignoran espacios, puntos y guiones y no afecta a menores sin documento.
create unique index if not exists socios_dni_normalizado_uidx
on public.socios ((upper(regexp_replace(dni,'[[:space:].-]','','g'))))
where dni is not null and btrim(dni) <> '';

-- En nuevas altas y actualizaciones, el DNI es obligatorio desde los 18 años.
create or replace function public.validar_dni_socio_por_edad()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.fecha_nacimiento is not null
     and new.fecha_nacimiento <= (current_date - interval '18 years')::date
     and coalesce(btrim(new.dni),'') = '' then
    raise exception 'El DNI/NIE es obligatorio para socios mayores de edad.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_socios_validar_dni_edad on public.socios;
create trigger trg_socios_validar_dni_edad
before insert or update of dni,fecha_nacimiento on public.socios
for each row execute function public.validar_dni_socio_por_edad();

-- Registro de cada importación para auditoría administrativa.
create table if not exists public.member_imports (
  id uuid primary key default gen_random_uuid(),
  archivo text,
  filas_leidas integer not null default 0,
  creados integer not null default 0,
  actualizados integer not null default 0,
  errores integer not null default 0,
  realizado_por uuid default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.member_imports enable row level security;
drop policy if exists member_imports_admin_c264 on public.member_imports;
create policy member_imports_admin_c264 on public.member_imports
for all to authenticated
using (public.is_active_admin())
with check (public.has_management_role());

commit;
