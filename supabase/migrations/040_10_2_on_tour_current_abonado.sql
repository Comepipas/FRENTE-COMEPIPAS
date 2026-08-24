-- COMMIT 40.10.2
-- El numero de abonado del Malaga CF cambia cada temporada.
-- Se solicita y almacena el numero actual, pero la identidad se valida por DNI y nombre.

create or replace function public.create_on_tour_request(
  p_travel_id uuid,
  p_solicitante jsonb,
  p_companions jsonb default '[]'::jsonb,
  p_notes text default null,
  p_accept boolean default false
) returns public.travel_bookings
language plpgsql security definer set search_path=public,auth as $$
declare
  ev public.travel_events%rowtype;
  me public.socios%rowtype;
  person public.socios%rowtype;
  rec public.travel_bookings%rowtype;
  x jsonb;
  people jsonb;
  n integer;
  dni_n text;
  ab_n text;
  full_name text;
  stored_name text;
begin
  if not p_accept then raise exception 'Debes aceptar que la solicitud no garantiza la entrada'; end if;
  select * into me from public.socios where auth_user_id=auth.uid() limit 1;
  if not found then raise exception 'Cuenta no vinculada a un socio'; end if;
  select * into ev from public.travel_events where id=p_travel_id for update;
  if not found then raise exception 'ON TOUR no encontrado'; end if;
  if ev.estado <> 'abierto' or not ev.visible then raise exception 'Las solicitudes no estan abiertas'; end if;
  if ev.apertura is not null and now()<ev.apertura then raise exception 'El plazo todavia no ha comenzado'; end if;
  if ev.cierre is not null and now()>ev.cierre then raise exception 'El plazo ha finalizado'; end if;
  if exists(select 1 from public.travel_bookings where travel_id=p_travel_id and socio_id=me.id and estado<>'cancelada') then
    raise exception 'Ya has enviado una solicitud para este ON TOUR';
  end if;
  n:=1+coalesce(jsonb_array_length(p_companions),0);
  if n>4 then raise exception 'Puedes solicitar tu entrada y la de un maximo de 3 acompanantes'; end if;

  full_name:=trim(p_solicitante->>'nombre');
  dni_n:=public.on_tour_normalize(p_solicitante->>'dni');
  ab_n:=public.on_tour_normalize(p_solicitante->>'numero_abonado');
  stored_name:=public.on_tour_normalize(concat_ws(' ',me.nombre,me.apellidos));
  if full_name='' or dni_n='' or ab_n='' then
    raise exception 'Debes indicar nombre, DNI y numero de abonado actual del Malaga CF';
  end if;
  if public.on_tour_normalize(me.dni)<>dni_n or public.on_tour_normalize(full_name)<>stored_name then
    raise exception 'No se han podido verificar tus datos por DNI y nombre';
  end if;

  people:=jsonb_build_array(jsonb_build_object(
    'rol','solicitante','socio_id',me.id,'nombre',concat_ws(' ',me.nombre,me.apellidos),
    'dni',dni_n,'abonado',ab_n
  ));

  for x in select * from jsonb_array_elements(coalesce(p_companions,'[]'::jsonb)) loop
    full_name:=trim(x->>'nombre');
    dni_n:=public.on_tour_normalize(x->>'dni');
    ab_n:=public.on_tour_normalize(x->>'numero_abonado');
    if full_name='' or dni_n='' or ab_n='' then
      raise exception 'Faltan nombre, DNI o numero de abonado actual de un acompanante';
    end if;
    select * into person from public.socios where public.on_tour_normalize(dni)=dni_n limit 1;
    if not found then
      raise exception 'No se ha encontrado al acompanante % por su DNI', full_name;
    end if;
    if public.on_tour_normalize(full_name)<>public.on_tour_normalize(concat_ws(' ',person.nombre,person.apellidos)) then
      raise exception 'No se ha podido verificar a % por DNI y nombre', full_name;
    end if;
    people:=people||jsonb_build_array(jsonb_build_object(
      'rol','acompanante','socio_id',person.id,'nombre',concat_ws(' ',person.nombre,person.apellidos),
      'dni',dni_n,'abonado',ab_n
    ));
  end loop;

  if exists(
    select 1 from jsonb_array_elements(people) a, jsonb_array_elements(people) b
    where a::text<>b::text and ((a->>'dni')=(b->>'dni') or (a->>'socio_id')=(b->>'socio_id'))
  ) then raise exception 'Hay una persona duplicada dentro de la solicitud'; end if;

  insert into public.travel_bookings(
    travel_id,socio_id,acompanantes,total_plazas,importe_total,estado,observaciones_socio,
    solicitante_nombre,solicitante_dni,solicitante_numero_abonado,condiciones_aceptadas
  ) values(
    ev.id,me.id,n-1,n,0,'pendiente',nullif(trim(p_notes),''),
    concat_ws(' ',me.nombre,me.apellidos),p_solicitante->>'dni',p_solicitante->>'numero_abonado',true
  ) returning * into rec;

  begin
    for x in select * from jsonb_array_elements(people) loop
      insert into public.on_tour_people(travel_id,booking_id,socio_id,rol,nombre_completo,dni_normalizado,abonado_normalizado)
      values(ev.id,rec.id,(x->>'socio_id')::uuid,x->>'rol',x->>'nombre',x->>'dni',x->>'abonado');
      if x->>'rol'='acompanante' then
        insert into public.travel_companions(booking_id,nombre,dni,numero_abonado_malaga,socio_id)
        values(rec.id,x->>'nombre',x->>'dni',x->>'abonado',(x->>'socio_id')::uuid);
      end if;
    end loop;
  exception when unique_violation then
    raise exception 'Una de las personas ya aparece en otra solicitud para este partido';
  end;
  return rec;
end $$;

grant execute on function public.create_on_tour_request(uuid,jsonb,jsonb,text,boolean) to authenticated;
