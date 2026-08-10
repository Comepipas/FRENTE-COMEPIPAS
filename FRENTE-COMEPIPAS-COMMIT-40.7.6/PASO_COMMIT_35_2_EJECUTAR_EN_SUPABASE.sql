-- FRENTE COMEPIPAS · COMMIT 35.2
-- Vinculación automática y verificable en el primer inicio de sesión.
-- Ejecutar completo en Supabase SQL Editor después de publicar el Commit 35.2.

begin;

create or replace function public.complete_member_link()
returns jsonb
language plpgsql
security definer
set search_path=public,auth,extensions
as $$
declare
  u auth.users%rowtype;
  v_socio public.socios%rowtype;
  v_count integer := 0;
  v_rows integer := 0;
  v_nombre text;
  v_apellidos text;
begin
  if auth.uid() is null then
    raise exception 'No hay una sesión iniciada.';
  end if;

  select * into u from auth.users where id=auth.uid();
  if not found then
    raise exception 'Usuario de acceso no encontrado.';
  end if;

  -- Si ya está vinculada, únicamente actualiza el estado de acceso.
  select * into v_socio
    from public.socios
   where auth_user_id=u.id
   limit 1
   for update;

  if found then
    update public.socios
       set last_access_at=now(),
           access_status='activo',
           cuenta_activada=true,
           activated_at=coalesce(activated_at,now()),
           updated_at=now()
     where id=v_socio.id;

    return jsonb_build_object(
      'ok',true,
      'linked',true,
      'already_linked',true,
      'socio_id',v_socio.id
    );
  end if;

  -- Vía principal: correo único y ficha activa. Es la más fiable tras confirmar el email.
  select count(*) into v_count
    from public.socios
   where public.normalizar_email(email)=public.normalizar_email(u.email)
     and lower(trim(coalesce(estado::text,'activo'))) in ('activo','activa','alta');

  if v_count > 1 then
    raise exception 'El correo coincide con más de una ficha activa. Contacta con la directiva.';
  end if;

  if v_count = 1 then
    select * into v_socio
      from public.socios
     where public.normalizar_email(email)=public.normalizar_email(u.email)
       and lower(trim(coalesce(estado::text,'activo'))) in ('activo','activa','alta')
     limit 1
     for update;
  else
    -- Respaldo: identidad normalizada, para fichas cuyo correo necesite corregirse.
    v_nombre:=coalesce(u.raw_user_meta_data->>'member_first_name','');
    v_apellidos:=coalesce(u.raw_user_meta_data->>'member_last_name','');

    if public.normalizar_identidad(v_nombre)='' or public.normalizar_identidad(v_apellidos)='' then
      raise exception 'No existe una ficha activa con este correo.';
    end if;

    select count(*) into v_count
      from public.socios
     where public.normalizar_identidad(nombre)=public.normalizar_identidad(v_nombre)
       and public.normalizar_identidad(apellidos)=public.normalizar_identidad(v_apellidos)
       and lower(trim(coalesce(estado::text,'activo'))) in ('activo','activa','alta');

    if v_count=0 then
      raise exception 'No se encontró una ficha activa compatible con esta cuenta.';
    elsif v_count>1 then
      raise exception 'Los datos coinciden con más de una ficha. Contacta con la directiva.';
    end if;

    select * into v_socio
      from public.socios
     where public.normalizar_identidad(nombre)=public.normalizar_identidad(v_nombre)
       and public.normalizar_identidad(apellidos)=public.normalizar_identidad(v_apellidos)
       and lower(trim(coalesce(estado::text,'activo'))) in ('activo','activa','alta')
     limit 1
     for update;
  end if;

  if v_socio.auth_user_id is not null and v_socio.auth_user_id<>u.id then
    raise exception 'Esta ficha ya está vinculada con otra cuenta.';
  end if;

  perform set_config('app.member_claim','allowed',true);

  update public.socios
     set auth_user_id=u.id,
         cuenta_activada=true,
         access_status='activo',
         activated_at=coalesce(activated_at,now()),
         last_access_at=now(),
         updated_at=now()
   where id=v_socio.id
     and (auth_user_id is null or auth_user_id=u.id);

  get diagnostics v_rows = row_count;
  if v_rows<>1 then
    raise exception 'No se pudo completar la vinculación de la ficha.';
  end if;

  -- Verificación final: nunca devuelve éxito si la ficha no quedó realmente vinculada.
  if not exists(
    select 1 from public.socios
     where id=v_socio.id
       and auth_user_id=u.id
       and cuenta_activada=true
  ) then
    raise exception 'La vinculación no pudo verificarse.';
  end if;

  begin
    insert into public.member_account_events(socio_id,auth_user_id,evento,detalle)
    values(v_socio.id,u.id,'vinculacion_automatica_35_2',jsonb_build_object('email',u.email));
  exception when undefined_table then
    null;
  end;

  return jsonb_build_object(
    'ok',true,
    'linked',true,
    'already_linked',false,
    'socio_id',v_socio.id
  );
end;
$$;

grant execute on function public.complete_member_link() to authenticated;

commit;

-- COMPROBACIÓN
select proname from pg_proc where proname='complete_member_link';
