-- FRENTE COMEPIPAS · COMMIT 34.0
-- Censo oficial de la Peña, antigüedad declarada y número de socio pendiente.
-- Ejecutar una vez en Supabase > SQL Editor.
begin;
alter table public.socios add column if not exists antiguedad_declarada_tipo text not null default 'pendiente';
alter table public.socios add column if not exists antiguedad_declarada_temporada text;
alter table public.socios add column if not exists antiguedad_declarada_anio integer;
alter table public.socios add column if not exists antiguedad_declarada_observaciones text;
alter table public.socios add column if not exists antiguedad_estado text not null default 'pendiente';
alter table public.socios add column if not exists numero_socio_estado text not null default 'pendiente';
alter table public.socios add column if not exists bloqueado_comprobacion boolean not null default false;
alter table public.socios add column if not exists bloqueo_motivo text;
alter table public.socios add column if not exists bloqueo_observaciones text;

create table if not exists public.socios_abonos_historial(
 id uuid primary key default gen_random_uuid(), socio_id uuid not null references public.socios(id) on delete cascade,
 temporada text not null, numero_abonado_malaga text, sector text, fila text, asiento text, tipo_abono text, precio_abono numeric,
 origen text not null default 'Málaga CF', created_at timestamptz not null default now(),
 unique(socio_id,temporada)
);
alter table public.socios_abonos_historial enable row level security;
drop policy if exists socios_abonos_historial_admin_c34 on public.socios_abonos_historial;
create policy socios_abonos_historial_admin_c34 on public.socios_abonos_historial for all to authenticated using(public.is_active_admin()) with check(public.has_management_role());
grant select,insert,update on public.socios_abonos_historial to authenticated;

create or replace function public.commit34_import_members(p_members jsonb,p_update_existing boolean default true,p_mark_tests_low boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare x jsonb; existing_id uuid; batch_id uuid:=gen_random_uuid(); n_created int:=0;n_updated int:=0;errs jsonb:='[]'::jsonb;
begin
 if not public.has_management_role() then raise exception 'No autorizado para importar socios.'; end if;
 if p_mark_tests_low then update public.socios set estado='baja' where es_registro_prueba=true and estado<>'baja'; end if;
 for x in select * from jsonb_array_elements(p_members) loop
  begin
   existing_id:=null;
   if nullif(upper(regexp_replace(coalesce(x->>'dni',''),'[^A-Za-z0-9]','','g')),'') is not null then
    select id into existing_id from public.socios where upper(regexp_replace(coalesce(dni,''),'[^A-Za-z0-9]','','g'))=upper(regexp_replace(x->>'dni','[^A-Za-z0-9]','','g')) limit 1;
   end if;
   if existing_id is null and nullif(x->>'fecha_nacimiento','') is not null then
    select id into existing_id from public.socios where upper(trim(coalesce(nombre,'')||' '||coalesce(apellidos,'')))=upper(trim(coalesce(x->>'nombre','')||' '||coalesce(x->>'apellidos',''))) and fecha_nacimiento=nullif(x->>'fecha_nacimiento','')::date limit 1;
   end if;
   if existing_id is not null and p_update_existing then
    update public.socios set nombre=nullif(x->>'nombre',''),apellidos=nullif(x->>'apellidos',''),dni=coalesce(nullif(x->>'dni',''),dni),fecha_nacimiento=coalesce(nullif(x->>'fecha_nacimiento','')::date,fecha_nacimiento),telefono=coalesce(nullif(x->>'telefono',''),telefono),email=coalesce(nullif(x->>'email',''),email),direccion=coalesce(nullif(x->>'direccion',''),direccion),estado=coalesce(nullif(x->>'estado',''),estado),categoria=coalesce(nullif(x->>'categoria',''),categoria),cuota_al_dia=coalesce((x->>'cuota_al_dia')::boolean,cuota_al_dia),numero_abonado_malaga=nullif(x->>'numero_abonado_malaga',''),sector=nullif(x->>'sector',''),fila=nullif(x->>'fila',''),asiento=nullif(x->>'asiento',''),tipo_abono=nullif(x->>'tipo_abono',''),precio_abono=coalesce(nullif(x->>'precio_abono','')::numeric,0),observaciones_internas=coalesce(nullif(x->>'observaciones_internas',''),observaciones_internas),migration_source='commit34_censo_pena',migration_batch=batch_id,numero_socio_estado=coalesce(numero_socio_estado,'pendiente'),updated_at=now() where id=existing_id;n_updated:=n_updated+1;
   elsif existing_id is null then
    insert into public.socios(numero_socio,nombre,apellidos,dni,fecha_nacimiento,telefono,email,direccion,fecha_alta,estado,categoria,cuenta_activada,cuota_al_dia,numero_abonado_malaga,sector,fila,asiento,tipo_abono,precio_abono,observaciones_internas,migration_source,migration_batch,antiguedad_estado,numero_socio_estado)
    values(null,nullif(x->>'nombre',''),nullif(x->>'apellidos',''),nullif(x->>'dni',''),nullif(x->>'fecha_nacimiento','')::date,nullif(x->>'telefono',''),nullif(x->>'email',''),nullif(x->>'direccion',''),coalesce(nullif(x->>'fecha_alta','')::date,current_date),coalesce(nullif(x->>'estado',''),'activo'),nullif(x->>'categoria',''),false,coalesce((x->>'cuota_al_dia')::boolean,false),nullif(x->>'numero_abonado_malaga',''),nullif(x->>'sector',''),nullif(x->>'fila',''),nullif(x->>'asiento',''),nullif(x->>'tipo_abono',''),coalesce(nullif(x->>'precio_abono','')::numeric,0),nullif(x->>'observaciones_internas',''),'commit34_censo_pena',batch_id,'pendiente','pendiente');n_created:=n_created+1;
   end if;
  exception when others then errs:=errs||jsonb_build_array(jsonb_build_object('nombre',x->>'nombre','apellidos',x->>'apellidos','dni',x->>'dni','error',sqlerrm)); end;
 end loop;
 insert into public.data_migrations(tipo,archivo_origen,registros_creados,registros_actualizados,errores) values('socios','Commit 34 · Censo oficial Peña',n_created,n_updated,errs);
 return jsonb_build_object('created',n_created,'updated',n_updated,'errors',errs,'batch_id',batch_id);
end $$;
grant execute on function public.commit34_import_members(jsonb,boolean,boolean) to authenticated;
commit;
