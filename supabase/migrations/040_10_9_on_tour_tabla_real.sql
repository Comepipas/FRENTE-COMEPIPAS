-- COMMIT 40.10.9
-- Corrige la funcion 40.10.8 para utilizar el esquema real de ON TOUR.
-- No modifica solicitudes, socios, cuotas ni pagos existentes.

create or replace function public.on_tour_normalize(v text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    translate(
      upper(trim(coalesce(v,''))),
      U&'\00C1\00C9\00CD\00D3\00DA\00DC\00D1\00C7',
      'AEIOUUNC'
    ),
    '[^A-Z0-9]',
    '',
    'g'
  );
$$;

create or replace function public.create_on_tour_request(
  p_travel_id uuid,
  p_solicitante jsonb,
  p_companions jsonb default '[]'::jsonb,
  p_notes text default null,
  p_accept boolean default false
)
returns public.travel_bookings
language plpgsql
security definer
set search_path=public,auth
as $$
declare
 me public.socios%rowtype; ev public.travel_events%rowtype; person public.socios%rowtype; rec public.travel_bookings%rowtype;
 x jsonb; people jsonb:='[]'::jsonb; n int:=1; occupied int:=0; full_name text; dni_n text; ab_n text; stored_name text;
begin
 if not p_accept then raise exception 'Debes aceptar las condiciones'; end if;
 select * into me from public.socios where auth_user_id=auth.uid() and lower(coalesce(estado,''))='activo' limit 1;
 if not found then raise exception 'No existe una ficha de socio activa vinculada a tu cuenta'; end if;

 select * into ev from public.travel_events where id=p_travel_id and visible=true and estado in ('abierto','completo') for update;
 if not found then raise exception 'Este ON TOUR no admite solicitudes'; end if;
 if ev.apertura is not null and now()<ev.apertura then raise exception 'El plazo de solicitudes todavia no ha comenzado'; end if;
 if ev.cierre is not null and now()>ev.cierre then raise exception 'El plazo de solicitudes ha finalizado'; end if;
 if exists(
   select 1 from public.on_tour_people otp
   join public.travel_bookings tb on tb.id=otp.booking_id
   where otp.travel_id=ev.id and otp.socio_id=me.id and tb.estado not in ('cancelada','rechazada')
 ) then raise exception 'Ya existe una solicitud que te incluye para este ON TOUR'; end if;
 if coalesce(jsonb_array_length(p_companions),0)>3 then raise exception 'Puedes solicitar tu entrada y la de un maximo de 3 acompanantes'; end if;

 full_name:=trim(coalesce(p_solicitante->>'nombre',''));
 dni_n:=public.on_tour_normalize(p_solicitante->>'dni');
 ab_n:=public.on_tour_normalize(p_solicitante->>'numero_abonado');
 stored_name:=public.on_tour_normalize(concat_ws(' ',me.nombre,me.apellidos));
 if full_name='' or dni_n='' or ab_n='' then raise exception 'Debes indicar nombre, DNI y numero de abonado actual del Malaga CF'; end if;
 if public.on_tour_normalize(me.dni)<>dni_n or public.on_tour_normalize(full_name)<>stored_name then raise exception 'No se han podido verificar tus datos por DNI y nombre'; end if;
 people:=jsonb_build_array(jsonb_build_object('rol','solicitante','socio_id',me.id,'nombre',concat_ws(' ',me.nombre,me.apellidos),'dni',dni_n,'abonado',ab_n));

 for x in select value from jsonb_array_elements(coalesce(p_companions,'[]'::jsonb)) loop
  full_name:=trim(coalesce(x->>'nombre',''));
  dni_n:=public.on_tour_normalize(x->>'dni');
  ab_n:=public.on_tour_normalize(x->>'numero_abonado');
  if full_name='' and dni_n='' and ab_n='' then continue; end if;
  if full_name='' or dni_n='' or ab_n='' then raise exception 'Si anades un acompanante debes completar su nombre, DNI y numero de abonado actual'; end if;

  select * into person
  from public.socios
  where public.on_tour_normalize(dni)=dni_n
    and public.on_tour_normalize(concat_ws(' ',nombre,apellidos))=public.on_tour_normalize(full_name)
    and lower(coalesce(estado,''))='activo'
  order by (auth_user_id is not null) desc, id asc
  limit 1;

  if not found then
    if exists(select 1 from public.socios where public.on_tour_normalize(dni)=dni_n) then
      raise exception 'No se ha podido verificar a % por DNI y nombre',full_name;
    end if;
    raise exception 'No se ha encontrado al acompanante % por su DNI',full_name;
  end if;
  if person.id=me.id or exists(select 1 from jsonb_array_elements(people) q where q->>'socio_id'=person.id::text) then raise exception 'Una persona no puede aparecer dos veces en la misma solicitud'; end if;
  if exists(
    select 1 from public.on_tour_people otp
    join public.travel_bookings tb on tb.id=otp.booking_id
    where otp.travel_id=ev.id and otp.socio_id=person.id and tb.estado not in ('cancelada','rechazada')
  ) then raise exception '% ya esta incluido en otra solicitud para este ON TOUR',full_name; end if;
  people:=people||jsonb_build_array(jsonb_build_object('rol','acompanante','socio_id',person.id,'nombre',concat_ws(' ',person.nombre,person.apellidos),'dni',dni_n,'abonado',ab_n));
  n:=n+1;
 end loop;

 if n>coalesce(ev.max_plazas_por_socio,4) then raise exception 'Supera el maximo de plazas permitido por socio'; end if;
 occupied:=public.fc_travel_occupied(ev.id);
 if occupied+n>ev.plazas_totales then raise exception 'No quedan plazas suficientes'; end if;

 insert into public.travel_bookings(travel_id,socio_id,acompanantes,total_plazas,importe_total,estado,observaciones_socio,solicitante_nombre,solicitante_dni,solicitante_numero_abonado,condiciones_aceptadas)
 values(ev.id,me.id,n-1,n,0,'pendiente',nullif(trim(p_notes),''),concat_ws(' ',me.nombre,me.apellidos),p_solicitante->>'dni',p_solicitante->>'numero_abonado',true) returning * into rec;
 for x in select value from jsonb_array_elements(people) loop
  insert into public.on_tour_people(travel_id,booking_id,socio_id,rol,nombre_completo,dni_normalizado,abonado_normalizado)
  values(ev.id,rec.id,(x->>'socio_id')::uuid,x->>'rol',x->>'nombre',x->>'dni',x->>'abonado');
  if x->>'rol'='acompanante' then
   insert into public.travel_companions(booking_id,nombre,dni,numero_abonado_malaga,socio_id)
   values(rec.id,x->>'nombre',x->>'dni',x->>'abonado',(x->>'socio_id')::uuid);
  end if;
 end loop;
 return rec;
exception
 when unique_violation then
  raise exception 'Una de las personas ya esta incluida en otra solicitud para este ON TOUR';
end;
$$;

grant execute on function public.create_on_tour_request(uuid,jsonb,jsonb,text,boolean) to authenticated;

