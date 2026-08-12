-- Commit 40.4: ficha maestra y separación estricta entre datos reales y piloto.
alter table public.socios add column if not exists menor_sin_dni boolean not null default false;
alter table public.socios add column if not exists correo_compartido_familiar boolean not null default false;
alter table public.socios add column if not exists email_contacto text;
alter table public.socios add column if not exists datos_revision_estado text not null default 'pendiente';
alter table public.socios add column if not exists datos_revisados_at timestamptz;
alter table public.socios add column if not exists datos_revisados_por uuid;

alter table public.socios drop constraint if exists socios_datos_revision_estado_check;
alter table public.socios add constraint socios_datos_revision_estado_check
check (datos_revision_estado in ('pendiente','incompleto','posible_duplicado','revisado'));

-- Convierte el texto MENOR en un estado explícito. No se guarda como un DNI ficticio repetido.
update public.socios
set dni=null, menor_sin_dni=true
where upper(trim(coalesce(dni,'')))='MENOR';

create or replace function public.commit404_member_review_stamp()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.datos_revision_estado='revisado' and old.datos_revision_estado is distinct from 'revisado' then
    new.datos_revisados_at=now();
    new.datos_revisados_por=auth.uid();
  elsif new.datos_revision_estado<>'revisado' then
    new.datos_revisados_at=null;
    new.datos_revisados_por=null;
  end if;
  if new.menor_sin_dni then new.dni=null; end if;
  if new.correo_compartido_familiar then
    new.email_contacto=coalesce(nullif(trim(new.email_contacto),''),nullif(trim(new.email),''));
    new.email=null;
  end if;
  return new;
end $$;

drop trigger if exists commit404_member_review_stamp on public.socios;
create trigger commit404_member_review_stamp before update of datos_revision_estado,menor_sin_dni,correo_compartido_familiar,email,email_contacto
on public.socios for each row execute function public.commit404_member_review_stamp();

-- La tarifa de directivo existe y es editable como cualquier otra categoría de campaña.
insert into public.campanas_categorias(campana_id,nombre,nacimiento_desde,nacimiento_hasta,cuota,orden,activa)
select c.id,'Directivo',null,null,0,40,true
from public.campanas_abonados c
where not exists (
  select 1 from public.campanas_categorias cc
  where cc.campana_id=c.id and lower(cc.nombre)='directivo'
);

comment on column public.socios.menor_sin_dni is 'Menor al que no se exige DNI; evita guardar el texto MENOR como documento duplicado.';
comment on column public.socios.correo_compartido_familiar is 'El correo es de contacto y puede coincidir con el del responsable familiar; no implica otra cuenta web.';
comment on column public.socios.email_contacto is 'Correo de contacto que puede repetirse; no se utiliza para iniciar sesión.';
comment on column public.socios.datos_revision_estado is 'Estado de revisión manual de la ficha maestra.';
