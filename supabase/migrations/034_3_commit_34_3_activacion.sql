-- FRENTE COMEPIPAS · COMMIT 34.3
-- Activación por nombre + apellidos + correo, categorías completas y vínculo seguro.
-- Ejecutar después del Commit 34.2.

begin;

-- 1) Normalización de categorías existentes y asignación a quienes llegaron sin categoría.
update public.socios
set categoria = case
  when fecha_nacimiento is null then 'adulto'
  when public.calculate_age(fecha_nacimiento,current_date) < 14 then 'infantil'
  when public.calculate_age(fecha_nacimiento,current_date) < 26 then 'joven'
  else 'adulto'
end,
updated_at = now()
where categoria is null or trim(categoria) = '' or lower(trim(categoria)) = 'sin categoría';

update public.socios
set categoria = lower(trim(categoria)), updated_at=now()
where categoria is not null and categoria is distinct from lower(trim(categoria));

-- 2) Utilidad interna para comparar nombres sin distinguir mayúsculas ni espacios repetidos.
create or replace function public.normalizar_identidad(p_texto text)
returns text
language sql immutable
as $$
  select lower(regexp_replace(trim(coalesce(p_texto,'')), '\\s+', ' ', 'g'));
$$;

-- 3) Comprobación previa. Devuelve mensajes controlados y no expone datos del socio.
create or replace function public.check_member_activation_identity(
  p_nombre text,
  p_apellidos text,
  p_email text
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_count integer;
  v_linked integer;
begin
  if trim(coalesce(p_nombre,''))='' or trim(coalesce(p_apellidos,''))='' or trim(coalesce(p_email,''))='' then
    return jsonb_build_object('ok',false,'message','Debes indicar nombre, apellidos y correo electrónico.');
  end if;

  select count(*), count(*) filter(where auth_user_id is not null or cuenta_activada is true)
  into v_count,v_linked
  from public.socios
  where public.normalizar_identidad(nombre)=public.normalizar_identidad(p_nombre)
    and public.normalizar_identidad(apellidos)=public.normalizar_identidad(p_apellidos)
    and lower(trim(coalesce(email,'')))=lower(trim(p_email))
    and lower(coalesce(estado::text,'activo')) in ('activo','activa','alta');

  if v_count=0 then
    return jsonb_build_object('ok',false,'message','Los datos no coinciden con una ficha activa del censo. Revisa que sean exactamente los registrados por la peña.');
  elsif v_count>1 then
    return jsonb_build_object('ok',false,'message','Hay más de una ficha con esos datos. Contacta con la directiva para identificarla correctamente.');
  elsif v_linked>0 then
    return jsonb_build_object('ok',false,'message','Esta ficha ya tiene una cuenta activada. Usa el acceso de socios o recupera la contraseña.');
  end if;

  return jsonb_build_object('ok',true);
end;$$;

grant execute on function public.check_member_activation_identity(text,text,text) to anon,authenticated;

-- 4) Vinculación segura por nombre, apellidos y correo.
create or replace function public.link_member_identity_by_name(
  p_auth_user_id uuid,
  p_email text,
  p_nombre text,
  p_apellidos text
) returns uuid
language plpgsql security definer set search_path=public,auth
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
    and lower(trim(coalesce(email,'')))=lower(trim(p_email))
    and lower(coalesce(estado::text,'activo')) in ('activo','activa','alta');

  if v_count=0 then raise exception 'Los datos no coinciden con una ficha activa del censo.'; end if;
  if v_count>1 then raise exception 'Hay más de una ficha con esos datos. Contacta con la directiva.'; end if;

  select * into v
  from public.socios
  where public.normalizar_identidad(nombre)=public.normalizar_identidad(p_nombre)
    and public.normalizar_identidad(apellidos)=public.normalizar_identidad(p_apellidos)
    and lower(trim(coalesce(email,'')))=lower(trim(p_email))
    and lower(coalesce(estado::text,'activo')) in ('activo','activa','alta')
  for update;

  if v.auth_user_id is not null and v.auth_user_id<>p_auth_user_id then
    raise exception 'Esta ficha ya está vinculada con otra cuenta.';
  end if;

  perform set_config('app.member_claim','allowed',true);
  update public.socios set
    auth_user_id=p_auth_user_id,
    cuenta_activada=false,
    access_status='pendiente_confirmacion',
    updated_at=now()
  where id=v.id;

  insert into public.member_account_events(socio_id,auth_user_id,evento,detalle)
  values(v.id,p_auth_user_id,'cuenta_vinculada_34_3',jsonb_build_object('email',p_email));

  return v.id;
end;$$;

-- 5) El alta de Auth usa exclusivamente nombre, apellidos y correo.
create or replace function public.handle_member_auth_created()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare
  v_nombre text;
  v_apellidos text;
  sid uuid;
begin
  v_nombre:=new.raw_user_meta_data->>'member_first_name';
  v_apellidos:=new.raw_user_meta_data->>'member_last_name';
  if trim(coalesce(v_nombre,''))<>'' and trim(coalesce(v_apellidos,''))<>'' then
    sid:=public.link_member_identity_by_name(new.id,new.email,v_nombre,v_apellidos);
  end if;
  return new;
exception when others then
  raise exception 'No se pudo vincular la ficha de socio: %',sqlerrm;
end;$$;

-- 6) Completar la vinculación al confirmar el correo o iniciar sesión.
create or replace function public.complete_member_link()
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  u auth.users%rowtype;
  sid uuid;
  v_nombre text;
  v_apellidos text;
begin
  if auth.uid() is null then raise exception 'No hay una sesión iniciada.'; end if;
  select * into u from auth.users where id=auth.uid();

  if exists(select 1 from public.socios where auth_user_id=auth.uid()) then
    update public.socios
    set last_access_at=now(), access_status='activo', cuenta_activada=true,
        activated_at=coalesce(activated_at,now()), updated_at=now()
    where auth_user_id=auth.uid();
    return jsonb_build_object('ok',true,'already_linked',true);
  end if;

  v_nombre:=u.raw_user_meta_data->>'member_first_name';
  v_apellidos:=u.raw_user_meta_data->>'member_last_name';
  if trim(coalesce(v_nombre,''))='' or trim(coalesce(v_apellidos,''))='' then
    raise exception 'Esta cuenta no contiene los datos necesarios para vincularla. Contacta con la directiva.';
  end if;

  sid:=public.link_member_identity_by_name(u.id,u.email,v_nombre,v_apellidos);
  update public.socios
  set last_access_at=now(), access_status='activo', cuenta_activada=true,
      activated_at=coalesce(activated_at,now()), updated_at=now()
  where id=sid;
  return jsonb_build_object('ok',true,'socio_id',sid);
end;$$;

grant execute on function public.complete_member_link() to authenticated;

commit;

-- COMPROBACIÓN
select categoria,count(*) total
from public.socios
group by categoria
order by categoria;

select count(*) filter(where categoria is null or trim(categoria)='') as sin_categoria,
       count(*) as total_socios
from public.socios;
