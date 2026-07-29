-- FRENTE COMEPIPAS · COMMIT 33.0
-- Centro de Migración Oficial y relaciones familiares confirmadas.
-- No elimina socios. Ejecutar una vez en Supabase > SQL Editor.
begin;
create extension if not exists pgcrypto;
create table if not exists public.data_migrations(
 id uuid primary key default gen_random_uuid(), tipo text not null default 'socios', archivo_origen text,
 registros_creados integer not null default 0, registros_actualizados integer not null default 0,
 errores jsonb not null default '[]'::jsonb, ejecutado_por uuid default auth.uid(), created_at timestamptz not null default now());
alter table public.data_migrations enable row level security;
drop policy if exists data_migrations_admin_c33 on public.data_migrations;
create policy data_migrations_admin_c33 on public.data_migrations for all to authenticated
 using (public.is_active_admin()) with check (public.has_management_role());
grant select,insert on public.data_migrations to authenticated;

alter table public.socios add column if not exists migration_source text;
alter table public.socios add column if not exists migration_batch uuid;
alter table public.socios add column if not exists es_registro_prueba boolean not null default false;
create index if not exists socios_numero_abonado_c33_idx on public.socios(numero_abonado_malaga);
create index if not exists socios_dni_normalized_c33_idx on public.socios(upper(regexp_replace(coalesce(dni,''),'[^A-Za-z0-9]','','g')));

create or replace function public.commit33_import_members(p_members jsonb,p_update_existing boolean default true,p_mark_tests_low boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare x jsonb; existing_id uuid; batch_id uuid:=gen_random_uuid(); n_created int:=0;n_updated int:=0;errs jsonb:='[]'::jsonb; num integer;
begin
 if not public.has_management_role() then raise exception 'No autorizado para importar socios.'; end if;
 if p_mark_tests_low then update public.socios set estado='baja' where es_registro_prueba=true and estado<>'baja'; end if;
 for x in select * from jsonb_array_elements(p_members) loop
  begin
   existing_id:=null;
   select id into existing_id from public.socios where
    (nullif(upper(regexp_replace(coalesce(x->>'dni',''),'[^A-Za-z0-9]','','g')),'') is not null and upper(regexp_replace(coalesce(dni,''),'[^A-Za-z0-9]','','g'))=upper(regexp_replace(x->>'dni','[^A-Za-z0-9]','','g')))
    or (nullif(x->>'numero_abonado_malaga','') is not null and numero_abonado_malaga=x->>'numero_abonado_malaga') limit 1;
   num:=nullif(x->>'numero_socio','')::integer;
   if existing_id is not null and p_update_existing then
    update public.socios set nombre=nullif(x->>'nombre',''),apellidos=nullif(x->>'apellidos',''),dni=nullif(x->>'dni',''),fecha_nacimiento=nullif(x->>'fecha_nacimiento','')::date,
     telefono=nullif(x->>'telefono',''),email=nullif(x->>'email',''),direccion=nullif(x->>'direccion',''),estado=coalesce(nullif(x->>'estado',''),estado),categoria=nullif(x->>'categoria',''),
     cuota_al_dia=coalesce((x->>'cuota_al_dia')::boolean,cuota_al_dia),numero_abonado_malaga=nullif(x->>'numero_abonado_malaga',''),sector=nullif(x->>'sector',''),fila=nullif(x->>'fila',''),asiento=nullif(x->>'asiento',''),
     tipo_abono=nullif(x->>'tipo_abono',''),precio_abono=coalesce(nullif(x->>'precio_abono','')::numeric,0),observaciones_internas=nullif(x->>'observaciones_internas',''),migration_source='commit33',migration_batch=batch_id,updated_at=now()
     where id=existing_id;n_updated:=n_updated+1;
   elsif existing_id is null then
    insert into public.socios(numero_socio,nombre,apellidos,dni,fecha_nacimiento,telefono,email,direccion,fecha_alta,estado,categoria,cuenta_activada,cuota_al_dia,numero_abonado_malaga,sector,fila,asiento,tipo_abono,precio_abono,observaciones_internas,migration_source,migration_batch)
    values(coalesce(num,nextval('public.socios_numero_seq')),nullif(x->>'nombre',''),nullif(x->>'apellidos',''),nullif(x->>'dni',''),nullif(x->>'fecha_nacimiento','')::date,nullif(x->>'telefono',''),nullif(x->>'email',''),nullif(x->>'direccion',''),coalesce(nullif(x->>'fecha_alta','')::date,current_date),coalesce(nullif(x->>'estado',''),'activo'),nullif(x->>'categoria',''),false,coalesce((x->>'cuota_al_dia')::boolean,false),nullif(x->>'numero_abonado_malaga',''),nullif(x->>'sector',''),nullif(x->>'fila',''),nullif(x->>'asiento',''),nullif(x->>'tipo_abono',''),coalesce(nullif(x->>'precio_abono','')::numeric,0),nullif(x->>'observaciones_internas',''),'commit33',batch_id);
    n_created:=n_created+1;
   end if;
  exception when others then errs:=errs||jsonb_build_array(jsonb_build_object('nombre',x->>'nombre','apellidos',x->>'apellidos','dni',x->>'dni','error',sqlerrm)); end;
 end loop;
 insert into public.data_migrations(tipo,archivo_origen,registros_creados,registros_actualizados,errores) values('socios','Centro de Migración Commit 33',n_created,n_updated,errs);
 return jsonb_build_object('created',n_created,'updated',n_updated,'errors',errs,'batch_id',batch_id);
end $$;

grant execute on function public.commit33_import_members(jsonb,boolean,boolean) to authenticated;

create or replace function public.commit33_link_guardians(p_links jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare x jsonb;mid uuid;gid uuid;n int:=0;
begin
 if not public.has_management_role() then raise exception 'No autorizado.';end if;
 for x in select * from jsonb_array_elements(p_links) loop
  select id into mid from public.socios where upper(regexp_replace(coalesce(dni,''),'[^A-Za-z0-9]','','g'))=upper(regexp_replace(x->>'minor_key','[^A-Za-z0-9]','','g')) or numero_abonado_malaga=x->>'minor_key' limit 1;
  select id into gid from public.socios where upper(regexp_replace(coalesce(dni,''),'[^A-Za-z0-9]','','g'))=upper(regexp_replace(x->>'guardian_key','[^A-Za-z0-9]','','g')) or numero_abonado_malaga=x->>'guardian_key' limit 1;
  if mid is not null and gid is not null and mid<>gid then
   insert into public.member_guardians(tutor_id,menor_id,parentesco,es_principal,activo) values(gid,mid,coalesce(nullif(x->>'parentesco',''),'padre/madre/tutor'),true,true)
   on conflict do nothing;n:=n+1;
  end if;
 end loop;return jsonb_build_object('linked',n);
end $$;
grant execute on function public.commit33_link_guardians(jsonb) to authenticated;
commit;