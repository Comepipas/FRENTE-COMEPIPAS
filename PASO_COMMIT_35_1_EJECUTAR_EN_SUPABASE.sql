-- FRENTE COMEPIPAS · COMMIT 35.1
-- Evita que un fallo secundario de vinculación cancele la creación de auth.users.
-- Ejecutar completo en Supabase SQL Editor después de publicar el Commit 35.1.

begin;

create or replace function public.handle_member_auth_created()
returns trigger
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v_nombre text;
  v_apellidos text;
begin
  v_nombre:=coalesce(new.raw_user_meta_data->>'member_first_name','');
  v_apellidos:=coalesce(new.raw_user_meta_data->>'member_last_name','');

  -- La validación previa ya identifica la ficha. Aquí intentamos vincularla,
  -- pero un fallo secundario nunca debe borrar la cuenta recién creada.
  if public.normalizar_identidad(v_nombre)<>''
     and public.normalizar_identidad(v_apellidos)<>'' then
    begin
      perform public.link_member_identity_by_name(new.id,new.email,v_nombre,v_apellidos);
    exception when others then
      raise warning 'COMMIT 35.1: cuenta Auth creada, vinculación pendiente para %: %',new.email,sqlerrm;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_handle_member_auth_created on auth.users;
create trigger trg_handle_member_auth_created
after insert on auth.users
for each row execute function public.handle_member_auth_created();

-- Devuelve un diagnóstico seguro para la propia sesión confirmada.
create or replace function public.my_activation_status()
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_user auth.users%rowtype;
  v_socio public.socios%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok',false,'code','no_session');
  end if;
  select * into v_user from auth.users where id=auth.uid();
  select * into v_socio from public.socios where auth_user_id=auth.uid() limit 1;
  return jsonb_build_object(
    'ok',true,
    'email_confirmed',v_user.email_confirmed_at is not null,
    'linked',v_socio.id is not null,
    'member_id',v_socio.id,
    'access_status',v_socio.access_status
  );
end;
$$;
grant execute on function public.my_activation_status() to authenticated;

commit;

-- COMPROBACIÓN
select proname from pg_proc where proname in ('handle_member_auth_created','my_activation_status');
