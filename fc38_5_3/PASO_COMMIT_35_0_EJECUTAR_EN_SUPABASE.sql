-- FRENTE COMEPIPAS · COMMIT 35.0
-- Activación robusta: ignora mayúsculas, tildes, diéresis, ñ, signos y espacios repetidos.
-- Ejecutar completo en Supabase SQL Editor después de instalar el Commit 35.0.

begin;

create extension if not exists unaccent with schema extensions;

-- Convierte distintas formas de escribir un nombre en una identidad comparable.
-- Ejemplos equivalentes: "José  Muñoz", "JOSE MUNOZ", " jose-muñoz ".
create or replace function public.normalizar_identidad(p_texto text)
returns text
language sql
immutable
set search_path=public,extensions
as $$
  select trim(
    regexp_replace(
      regexp_replace(
        lower(extensions.unaccent(coalesce(p_texto,''))),
        '[^a-z0-9]+', ' ', 'g'
      ),
      '\s+', ' ', 'g'
    )
  );
$$;

-- El correo se compara sin mayúsculas y sin espacios accidentales.
create or replace function public.normalizar_email(p_email text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(trim(coalesce(p_email,'')), '\s+', '', 'g'));
$$;

create or replace function public.check_member_activation_identity(
  p_nombre text,
  p_apellidos text,
  p_email text
) returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_count integer;
  v_linked integer;
begin
  if public.normalizar_identidad(p_nombre)=''
     or public.normalizar_identidad(p_apellidos)=''
     or public.normalizar_email(p_email)='' then
    return jsonb_build_object(
      'ok',false,
      'code','missing_data',
      'message','Debes indicar nombre, apellidos y correo electrónico.'
    );
  end if;

  select count(*),
         count(*) filter(where auth_user_id is not null or cuenta_activada is true)
    into v_count,v_linked
    from public.socios
   where public.normalizar_identidad(nombre)=public.normalizar_identidad(p_nombre)
     and public.normalizar_identidad(apellidos)=public.normalizar_identidad(p_apellidos)
     and public.normalizar_email(email)=public.normalizar_email(p_email)
     and lower(trim(coalesce(estado::text,'activo'))) in ('activo','activa','alta');

  if v_count=0 then
    return jsonb_build_object(
      'ok',false,
      'code','member_not_found',
      'message','No hemos encontrado un socio activo con esos datos. Comprueba el correo electrónico, el nombre y los apellidos registrados por la peña.'
    );
  elsif v_count>1 then
    return jsonb_build_object(
      'ok',false,
      'code','duplicate_identity',
      'message','Hay más de una ficha con esos datos. Contacta con la directiva para identificarla correctamente.'
    );
  elsif v_linked>0 then
    return jsonb_build_object(
      'ok',false,
      'code','already_activated',
      'message','Esta ficha ya tiene una cuenta activada. Entra con tu contraseña o utiliza “He olvidado mi contraseña”.'
    );
  end if;

  return jsonb_build_object('ok',true,'code','member_found');
end;
$$;

grant execute on function public.check_member_activation_identity(text,text,text) to anon,authenticated;

create or replace function public.link_member_identity_by_name(
  p_auth_user_id uuid,
  p_email text,
  p_nombre text,
  p_apellidos text
) returns uuid
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  v public.socios%rowtype;
  v_count integer;
begin
  if p_auth_user_id is null then raise exception 'Usuario no válido.'; end if;

  select count(*) into v_count
    from public.socios
   where public.normalizar_identidad(nombre)=public.normalizar_identidad(p_nombre)
     and public.normalizar_identidad(apellidos)=public.normalizar_identidad(p_apellidos)
     and public.normalizar_email(email)=public.normalizar_email(p_email)
     and lower(trim(coalesce(estado::text,'activo'))) in ('activo','activa','alta');

  if v_count=0 then
    raise exception 'No hemos encontrado un socio activo con esos datos.';
  end if;
  if v_count>1 then
    raise exception 'Hay más de una ficha con esos datos. Contacta con la directiva.';
  end if;

  select * into v
    from public.socios
   where public.normalizar_identidad(nombre)=public.normalizar_identidad(p_nombre)
     and public.normalizar_identidad(apellidos)=public.normalizar_identidad(p_apellidos)
     and public.normalizar_email(email)=public.normalizar_email(p_email)
     and lower(trim(coalesce(estado::text,'activo'))) in ('activo','activa','alta')
   for update;

  if v.auth_user_id is not null and v.auth_user_id<>p_auth_user_id then
    raise exception 'Esta ficha ya está vinculada con otra cuenta.';
  end if;

  perform set_config('app.member_claim','allowed',true);
  update public.socios
     set auth_user_id=p_auth_user_id,
         cuenta_activada=false,
         access_status='pendiente_confirmacion',
         updated_at=now()
   where id=v.id;

  insert into public.member_account_events(socio_id,auth_user_id,evento,detalle)
  values(
    v.id,p_auth_user_id,'cuenta_vinculada_35_0',
    jsonb_build_object(
      'email',public.normalizar_email(p_email),
      'nombre_introducido',p_nombre,
      'apellidos_introducidos',p_apellidos
    )
  );

  return v.id;
end;
$$;

-- Reinstala el trigger para que todas las cuentas nuevas utilicen la comparación flexible.
drop trigger if exists trg_handle_member_auth_created on auth.users;
create trigger trg_handle_member_auth_created
after insert on auth.users
for each row execute function public.handle_member_auth_created();

-- La reparación tras confirmar correo también compara de forma flexible.
create or replace function public.complete_member_link()
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  u auth.users%rowtype;
  sid uuid;
  v_nombre text;
  v_apellidos text;
  v_email_count integer;
begin
  if auth.uid() is null then raise exception 'No hay una sesión iniciada.'; end if;

  select * into u from auth.users where id=auth.uid();
  if not found then raise exception 'Usuario de acceso no encontrado.'; end if;

  if exists(select 1 from public.socios where auth_user_id=u.id) then
    update public.socios
       set last_access_at=now(), access_status='activo', cuenta_activada=true,
           activated_at=coalesce(activated_at,now()), updated_at=now()
     where auth_user_id=u.id;
    return jsonb_build_object('ok',true,'already_linked',true);
  end if;

  v_nombre:=coalesce(u.raw_user_meta_data->>'member_first_name','');
  v_apellidos:=coalesce(u.raw_user_meta_data->>'member_last_name','');

  if public.normalizar_identidad(v_nombre)<>'' and public.normalizar_identidad(v_apellidos)<>'' then
    sid:=public.link_member_identity_by_name(u.id,u.email,v_nombre,v_apellidos);
  else
    select count(*) into v_email_count
      from public.socios
     where public.normalizar_email(email)=public.normalizar_email(u.email)
       and lower(trim(coalesce(estado::text,'activo'))) in ('activo','activa','alta');

    if v_email_count=0 then raise exception 'No existe una ficha activa con este correo.'; end if;
    if v_email_count>1 then raise exception 'El correo coincide con más de una ficha. Contacta con la directiva.'; end if;

    select id into sid
      from public.socios
     where public.normalizar_email(email)=public.normalizar_email(u.email)
       and lower(trim(coalesce(estado::text,'activo'))) in ('activo','activa','alta')
     limit 1;

    perform set_config('app.member_claim','allowed',true);
    update public.socios
       set auth_user_id=u.id,
           cuenta_activada=true,
           access_status='activo',
           activated_at=coalesce(activated_at,now()),
           last_access_at=now(),
           updated_at=now()
     where id=sid and auth_user_id is null;
  end if;

  update public.socios
     set last_access_at=now(), access_status='activo', cuenta_activada=true,
         activated_at=coalesce(activated_at,now()), updated_at=now()
   where id=sid;

  return jsonb_build_object('ok',true,'socio_id',sid);
end;
$$;

grant execute on function public.complete_member_link() to authenticated;

commit;

-- COMPROBACIÓN: debe devolver cuatro filas equivalentes.
select public.normalizar_identidad(x) as resultado
from (values ('José  Muñoz'),('JOSE MUNOZ'),(' jose-muñoz '),('José Muñoz')) t(x);
