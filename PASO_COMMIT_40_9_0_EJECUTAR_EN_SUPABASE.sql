begin;

-- Sustituye la eliminación antigua por una versión segura.
-- Nunca borra pagos, cuotas, abonos, campañas ni relaciones familiares.
create or replace function public.admin_delete_discharged_member(p_socio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_socio public.socios%rowtype;
  r record;
  v_count bigint;
begin
  if not public.has_management_role() then
    raise exception 'No tienes permisos para eliminar socios.';
  end if;

  select * into v_socio from public.socios where id=p_socio_id for update;
  if not found then raise exception 'El socio no existe.'; end if;
  if lower(coalesce(v_socio.estado::text,''))<>'baja' then
    raise exception 'Primero debes dar de baja al socio.';
  end if;

  for r in
    select n.nspname schema_name, c.relname table_name, a.attname column_name
    from pg_constraint con
    join pg_class c on c.oid=con.conrelid
    join pg_namespace n on n.oid=c.relnamespace
    join unnest(con.conkey) with ordinality ck(attnum,ord) on true
    join pg_attribute a on a.attrelid=con.conrelid and a.attnum=ck.attnum
    where con.contype='f'
      and con.confrelid='public.socios'::regclass
      and array_length(con.conkey,1)=1
  loop
    execute format('select count(*) from %I.%I where %I=$1',r.schema_name,r.table_name,r.column_name)
      into v_count using p_socio_id;
    if v_count>0 then
      raise exception 'No se puede eliminar: el socio tiene historial asociado. Déjalo de baja para conservar sus pagos y datos de temporadas.';
    end if;
  end loop;

  perform set_config('app.member_delete','allowed',true);
  delete from public.socios where id=p_socio_id;

  return jsonb_build_object('ok',true,'socio_id',p_socio_id);
end;
$$;

revoke all on function public.admin_delete_discharged_member(uuid) from public;
grant execute on function public.admin_delete_discharged_member(uuid) to authenticated;

commit;
