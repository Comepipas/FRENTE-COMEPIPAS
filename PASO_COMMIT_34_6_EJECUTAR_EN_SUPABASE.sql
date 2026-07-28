begin;

-- COMMIT 34.6: activación automática y área familiar.
-- Reinstala el disparador que enlaza auth.users con socios al crear la cuenta.

drop trigger if exists trg_handle_member_auth_created on auth.users;
create trigger trg_handle_member_auth_created
after insert on auth.users
for each row execute function public.handle_member_auth_created();

-- Completa automáticamente cuentas ya creadas y nuevas tras confirmar/iniciar sesión.
create or replace function public.complete_member_link()
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  u auth.users%rowtype;
  sid uuid;
  v_nombre text;
  v_apellidos text;
begin
  if auth.uid() is null then
    raise exception 'No hay una sesión iniciada.';
  end if;

  select * into u from auth.users where id=auth.uid();
  if not found then raise exception 'Usuario de acceso no encontrado.'; end if;

  if exists(select 1 from public.socios where auth_user_id=u.id) then
    update public.socios
       set last_access_at=now(),
           access_status='activo',
           cuenta_activada=true,
           activated_at=coalesce(activated_at,now()),
           updated_at=now()
     where auth_user_id=u.id;
    return jsonb_build_object('ok',true,'already_linked',true);
  end if;

  v_nombre:=coalesce(u.raw_user_meta_data->>'member_first_name','');
  v_apellidos:=coalesce(u.raw_user_meta_data->>'member_last_name','');

  if trim(v_nombre)<>'' and trim(v_apellidos)<>'' then
    sid:=public.link_member_identity_by_name(u.id,u.email,v_nombre,v_apellidos);
  else
    select id into sid
      from public.socios
     where lower(trim(coalesce(email,'')))=lower(trim(coalesce(u.email,'')))
       and lower(coalesce(estado::text,'activo')) in ('activo','activa','alta')
     limit 1;
    if sid is null then raise exception 'No existe una ficha activa con este correo.'; end if;
    if (select count(*) from public.socios where lower(trim(coalesce(email,'')))=lower(trim(coalesce(u.email,''))) and lower(coalesce(estado::text,'activo')) in ('activo','activa','alta'))<>1 then
      raise exception 'El correo coincide con más de una ficha. Contacta con la directiva.';
    end if;
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
end;$$;

grant execute on function public.complete_member_link() to authenticated;

-- Devuelve a cada padre/madre/tutor solamente los menores vinculados y activos.
create or replace function public.my_linked_minors()
returns table(
  relacion_id uuid,
  menor_id uuid,
  parentesco text,
  es_principal boolean,
  nombre text,
  apellidos text,
  numero_socio integer,
  categoria text,
  estado text,
  cuota_al_dia boolean,
  fecha_nacimiento date
)
language sql
security definer
set search_path=public
as $$
  select mg.id, s.id, mg.parentesco, mg.es_principal,
         s.nombre, s.apellidos, s.numero_socio,
         s.categoria::text, s.estado::text, s.cuota_al_dia, s.fecha_nacimiento
    from public.socios tutor
    join public.member_guardians mg on mg.tutor_id=tutor.id and mg.activo=true
    join public.socios s on s.id=mg.menor_id
   where tutor.auth_user_id=auth.uid()
   order by s.apellidos, s.nombre;
$$;

grant execute on function public.my_linked_minors() to authenticated;

commit;
