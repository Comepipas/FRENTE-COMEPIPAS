-- Frente Comepipas · Commit 34.7
-- Eliminación definitiva y controlada de socios dados de baja.
-- Ejecutar completo en Supabase > SQL Editor.

begin;

create or replace function public.commit347_protect_member_delete()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if coalesce(current_setting('app.member_delete',true),'')='allowed'
     and public.has_management_role()
     and lower(coalesce(old.estado::text,''))='baja' then
    return old;
  end if;
  raise exception 'Los socios solo pueden eliminarse mediante la eliminación definitiva autorizada y después de estar de baja.';
end;
$$;

drop trigger if exists trg_socios_impedir_delete on public.socios;
create trigger trg_socios_impedir_delete
before delete on public.socios
for each row execute function public.commit347_protect_member_delete();

create or replace function public.admin_delete_discharged_member(p_socio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_socio public.socios%rowtype;
  r record;
  v_sql text;
begin
  if not public.has_management_role() then
    raise exception 'No tienes permisos para eliminar socios.';
  end if;

  select * into v_socio from public.socios where id=p_socio_id for update;
  if not found then raise exception 'El socio no existe.'; end if;
  if lower(coalesce(v_socio.estado::text,''))<>'baja' then
    raise exception 'Primero debes dar de baja al socio.';
  end if;

  perform set_config('app.member_delete','allowed',true);

  -- Elimina automáticamente filas de tablas con FK restrict/no action hacia socios.
  -- Las relaciones CASCADE o SET NULL siguen su configuración normal.
  for r in
    select n.nspname schema_name, c.relname table_name, a.attname column_name
    from pg_constraint con
    join pg_class c on c.oid=con.conrelid
    join pg_namespace n on n.oid=c.relnamespace
    join unnest(con.conkey) with ordinality ck(attnum,ord) on true
    join pg_attribute a on a.attrelid=con.conrelid and a.attnum=ck.attnum
    where con.contype='f'
      and con.confrelid='public.socios'::regclass
      and con.confdeltype in ('a','r')
      and array_length(con.conkey,1)=1
  loop
    v_sql=format('delete from %I.%I where %I=$1',r.schema_name,r.table_name,r.column_name);
    execute v_sql using p_socio_id;
  end loop;

  delete from public.socios where id=p_socio_id;

  return jsonb_build_object(
    'ok',true,
    'socio_id',p_socio_id,
    'nombre',trim(coalesce(v_socio.nombre,'')||' '||coalesce(v_socio.apellidos,'')),
    'auth_user_preservado',v_socio.auth_user_id is not null
  );
end;
$$;

revoke all on function public.admin_delete_discharged_member(uuid) from public;
grant execute on function public.admin_delete_discharged_member(uuid) to authenticated;

commit;
