-- Commit 40.3: numeración provisional separada del número histórico definitivo.
alter table public.socios
  add column if not exists numero_socio_provisional bigint;

create unique index if not exists socios_numero_provisional_unique
  on public.socios(numero_socio_provisional)
  where numero_socio_provisional is not null;

create sequence if not exists public.socios_numero_provisional_seq;

select setval(
  'public.socios_numero_provisional_seq',
  greatest(coalesce((select max(numero_socio_provisional) from public.socios), 0) + 1, 1),
  false
);

create or replace function public.commit403_assign_provisional_member_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.numero_socio_provisional is null
     and coalesce(new.antiguedad_estado, '') in ('declarada','pendiente_revision','validada')
     and coalesce(new.antiguedad_declarada_tipo, '') not in ('','pendiente') then
    new.numero_socio_provisional := nextval('public.socios_numero_provisional_seq');
  end if;
  return new;
end;
$$;

drop trigger if exists commit403_assign_provisional_member_number on public.socios;
create trigger commit403_assign_provisional_member_number
before insert or update of antiguedad_estado, antiguedad_declarada_tipo
on public.socios
for each row execute function public.commit403_assign_provisional_member_number();

-- Asigna provisional a quienes ya declararon su antigüedad antes de este commit.
update public.socios
set numero_socio_provisional = nextval('public.socios_numero_provisional_seq')
where numero_socio_provisional is null
  and coalesce(antiguedad_estado, '') in ('declarada','pendiente_revision','validada')
  and coalesce(antiguedad_declarada_tipo, '') not in ('','pendiente');

comment on column public.socios.numero_socio_provisional is
  'Identificador interno automático P-####. No sustituye al número histórico definitivo.';
