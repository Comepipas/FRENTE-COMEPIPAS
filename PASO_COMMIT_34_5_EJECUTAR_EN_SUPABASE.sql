-- FRENTE COMEPIPAS · COMMIT 34.5
-- Antigüedad en activación, numeración pendiente y exención automática de directivos.
-- Ejecutar completo en Supabase > SQL Editor.

begin;

alter table public.socios
  add column if not exists es_directivo boolean not null default false,
  add column if not exists cargo_directiva text,
  add column if not exists antiguedad_declarada_anio integer,
  add column if not exists antiguedad_temporadas_consecutivas integer,
  add column if not exists antiguedad_declarada_observaciones text,
  add column if not exists antiguedad_estado text not null default 'pendiente',
  add column if not exists numero_socio_estado text not null default 'pendiente';

update public.socios
set numero_socio_estado = case when numero_socio is null then 'pendiente' else 'asignado' end
where numero_socio_estado is null
   or (numero_socio is null and numero_socio_estado <> 'pendiente')
   or (numero_socio is not null and numero_socio_estado <> 'asignado');

create or replace function public.commit345_apply_activation_antiquity(p_socio_id uuid,p_metadata jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare v_anio integer; v_temporadas integer; v_notas text;
begin
  v_anio:=nullif(p_metadata->>'member_antiquity_year','')::integer;
  v_temporadas:=nullif(p_metadata->>'member_consecutive_seasons','')::integer;
  v_notas:=nullif(trim(coalesce(p_metadata->>'member_antiquity_notes','')),'');
  if v_anio is null or v_anio<2007 or v_anio>extract(year from current_date)::integer then raise exception 'El año de antigüedad no es válido.'; end if;
  if v_temporadas is not null and (v_temporadas<0 or v_temporadas>99) then raise exception 'Las temporadas consecutivas no son válidas.'; end if;
  update public.socios set antiguedad_declarada_anio=v_anio,antiguedad_temporadas_consecutivas=v_temporadas,
    antiguedad_declarada_observaciones=v_notas,antiguedad_estado='declarada_pendiente_validacion',
    numero_socio_estado=case when numero_socio is null then 'pendiente' else 'asignado' end,updated_at=now()
  where id=p_socio_id;
end;$$;

create or replace function public.handle_member_auth_created()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare v_nombre text; v_apellidos text; sid uuid;
begin
  v_nombre:=new.raw_user_meta_data->>'member_first_name'; v_apellidos:=new.raw_user_meta_data->>'member_last_name';
  if trim(coalesce(v_nombre,''))<>'' and trim(coalesce(v_apellidos,''))<>'' then
    sid:=public.link_member_identity_by_name(new.id,new.email,v_nombre,v_apellidos);
    perform public.commit345_apply_activation_antiquity(sid,new.raw_user_meta_data);
  end if;
  return new;
exception when others then raise exception 'No se pudo vincular la ficha de socio: %',sqlerrm;
end;$$;

create or replace function public.commit345_apply_member_fee_exemption(p_socio_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_socio public.socios%rowtype; v_temporada uuid; v_categoria public.categorias_cuota%rowtype; v_exento boolean; v_metodo text; v_importe numeric;
begin
  select * into v_socio from public.socios where id=p_socio_id; if not found then return; end if;
  select id into v_temporada from public.temporadas where activa is true order by nombre desc limit 1; if v_temporada is null then return; end if;
  v_exento:=coalesce(v_socio.es_directivo,false) or lower(trim(coalesce(v_socio.categoria,'')))='infantil';
  v_metodo:=case when coalesce(v_socio.es_directivo,false) then 'Exenta directiva' else 'Exenta infantil' end;
  if lower(coalesce(v_socio.estado::text,''))<>'activo' or coalesce(v_socio.es_registro_prueba,false) then
    delete from public.cuotas_socios where socio_id=p_socio_id and temporada_id=v_temporada and estado='pendiente';
    update public.socios set cuota_al_dia=false,updated_at=now() where id=p_socio_id; return;
  end if;
  if v_exento then
    insert into public.cuotas_socios(socio_id,temporada_id,importe,estado,fecha_pago,metodo_pago,observaciones)
    values(p_socio_id,v_temporada,0,'pagada',null,v_metodo,case when coalesce(v_socio.es_directivo,false) then 'Cuota exenta por pertenecer a la Junta Directiva' else 'Cuota infantil exenta' end)
    on conflict (socio_id,temporada_id) do update set importe=0,estado='pagada',fecha_pago=null,metodo_pago=excluded.metodo_pago,observaciones=excluded.observaciones,updated_at=now();
    update public.socios set cuota_al_dia=true,updated_at=now() where id=p_socio_id; return;
  end if;
  select * into v_categoria from public.categorias_cuota c where c.temporada_id=v_temporada and coalesce(c.activa,true)
    and lower(trim(coalesce(c.codigo,c.nombre,'')))=lower(trim(coalesce(v_socio.categoria,''))) order by c.orden nulls last,c.id limit 1;
  v_importe:=coalesce(v_categoria.importe,0);
  insert into public.cuotas_socios(socio_id,temporada_id,categoria_cuota_id,importe,estado,fecha_pago,metodo_pago,observaciones)
  values(p_socio_id,v_temporada,v_categoria.id,v_importe,'pendiente',null,null,'Cuota recalculada automáticamente')
  on conflict (socio_id,temporada_id) do update set categoria_cuota_id=excluded.categoria_cuota_id,
    importe=case when public.cuotas_socios.estado='pagada' and public.cuotas_socios.importe>0 then public.cuotas_socios.importe else excluded.importe end,
    estado=case when public.cuotas_socios.estado='pagada' and public.cuotas_socios.importe>0 then 'pagada' else 'pendiente' end,
    fecha_pago=case when public.cuotas_socios.estado='pagada' and public.cuotas_socios.importe>0 then public.cuotas_socios.fecha_pago else null end,
    metodo_pago=case when public.cuotas_socios.estado='pagada' and public.cuotas_socios.importe>0 then public.cuotas_socios.metodo_pago else null end,
    observaciones=case when public.cuotas_socios.estado='pagada' and public.cuotas_socios.importe>0 then public.cuotas_socios.observaciones else excluded.observaciones end,updated_at=now();
  update public.socios set cuota_al_dia=exists(select 1 from public.cuotas_socios q where q.socio_id=p_socio_id and q.temporada_id=v_temporada and q.estado='pagada'),updated_at=now() where id=p_socio_id;
end;$$;

create or replace function public.commit345_member_fee_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.commit345_apply_member_fee_exemption(new.id); return new; end;$$;

drop trigger if exists trg_commit345_member_fee on public.socios;
create trigger trg_commit345_member_fee after insert or update of es_directivo,categoria,estado on public.socios for each row execute function public.commit345_member_fee_trigger();

do $$ declare r record; begin for r in select id from public.socios loop perform public.commit345_apply_member_fee_exemption(r.id); end loop; end $$;

commit;

select count(*) filter(where numero_socio is null) numeros_pendientes,
 count(*) filter(where antiguedad_estado='declarada_pendiente_validacion') antiguedades_pendientes,
 count(*) filter(where es_directivo is true) directivos from public.socios;
