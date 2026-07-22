-- FRENTE COMEPIPAS · COMMIT 25 · ON TOUR
-- Ejecutar completo en Supabase > SQL Editor
begin;

alter table public.travel_events
  add column if not exists match_id uuid references public.ticket_matches(id) on delete set null,
  add column if not exists rival text,
  add column if not exists estadio text,
  add column if not exists ciudad text,
  add column if not exists km_desde_rosaleda integer,
  add column if not exists duracion_minutos integer,
  add column if not exists escudo_url text,
  add column if not exists imagen_url text,
  add column if not exists solicitudes_entradas boolean not null default true;

alter table public.travel_events alter column max_plazas_por_socio set default 4;

alter table public.travel_companions
  add column if not exists numero_abonado_malaga text,
  add column if not exists socio_id uuid references public.socios(id) on delete set null;

alter table public.travel_bookings
  add column if not exists solicitante_nombre text,
  add column if not exists solicitante_dni text,
  add column if not exists solicitante_numero_abonado text,
  add column if not exists condiciones_aceptadas boolean not null default false;

create table if not exists public.on_tour_stadiums (
  id uuid primary key default gen_random_uuid(),
  equipo text not null,
  estadio text not null,
  ciudad text not null,
  km_desde_rosaleda integer check(km_desde_rosaleda>=0),
  duracion_minutos integer check(duracion_minutos>=0),
  escudo_url text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(equipo,estadio)
);

create table if not exists public.on_tour_people (
  id uuid primary key default gen_random_uuid(),
  travel_id uuid not null references public.travel_events(id) on delete cascade,
  booking_id uuid not null references public.travel_bookings(id) on delete cascade,
  socio_id uuid references public.socios(id) on delete set null,
  rol text not null check(rol in ('solicitante','acompanante')),
  nombre_completo text not null,
  dni_normalizado text not null,
  abonado_normalizado text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists on_tour_people_dni_unique on public.on_tour_people(travel_id,dni_normalizado);
create unique index if not exists on_tour_people_abonado_unique on public.on_tour_people(travel_id,abonado_normalizado);
create index if not exists on_tour_people_booking_idx on public.on_tour_people(booking_id);

create or replace function public.on_tour_normalize(v text)
returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(v,''),'[^A-Za-z0-9]','','g'))
$$;

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
begin
  if not p_accept then raise exception 'Debes aceptar que la solicitud no garantiza la entrada'; end if;
  select * into me from public.socios where auth_user_id=auth.uid() limit 1;
  if not found then raise exception 'Cuenta no vinculada a un socio'; end if;
  select * into ev from public.travel_events where id=p_travel_id for update;
  if not found then raise exception 'ON TOUR no encontrado'; end if;
  if ev.estado <> 'abierto' or not ev.visible then raise exception 'Las solicitudes no están abiertas'; end if;
  if ev.apertura is not null and now()<ev.apertura then raise exception 'El plazo todavía no ha comenzado'; end if;
  if ev.cierre is not null and now()>ev.cierre then raise exception 'El plazo ha finalizado'; end if;
  if exists(select 1 from public.travel_bookings where travel_id=p_travel_id and socio_id=me.id and estado<>'cancelada') then
    raise exception 'Ya has enviado una solicitud para este ON TOUR';
  end if;
  n:=1+coalesce(jsonb_array_length(p_companions),0);
  if n>4 then raise exception 'Puedes solicitar tu entrada y la de un máximo de 3 acompañantes'; end if;

  dni_n:=public.on_tour_normalize(p_solicitante->>'dni');
  ab_n:=public.on_tour_normalize(p_solicitante->>'numero_abonado');
  if dni_n='' or ab_n='' then raise exception 'Debes indicar tu DNI y número de abonado del Málaga CF'; end if;
  if public.on_tour_normalize(me.dni)<>dni_n or public.on_tour_normalize(me.numero_abonado_malaga)<>ab_n then
    raise exception 'Tus datos no coinciden con la ficha de socio y abonado';
  end if;

  people:=jsonb_build_array(jsonb_build_object(
    'rol','solicitante','socio_id',me.id,'nombre',concat_ws(' ',me.nombre,me.apellidos),
    'dni',dni_n,'abonado',ab_n
  ));

  for x in select * from jsonb_array_elements(coalesce(p_companions,'[]'::jsonb)) loop
    dni_n:=public.on_tour_normalize(x->>'dni');
    ab_n:=public.on_tour_normalize(x->>'numero_abonado');
    full_name:=trim(x->>'nombre');
    if full_name='' or dni_n='' or ab_n='' then raise exception 'Faltan datos de uno de los acompañantes'; end if;
    select * into person from public.socios
      where public.on_tour_normalize(dni)=dni_n
        and public.on_tour_normalize(numero_abonado_malaga)=ab_n
      limit 1;
    if not found then raise exception 'Uno de los acompañantes no figura como socio de la peña y abonado del Málaga CF'; end if;
    people:=people||jsonb_build_array(jsonb_build_object(
      'rol','acompanante','socio_id',person.id,'nombre',concat_ws(' ',person.nombre,person.apellidos),
      'dni',dni_n,'abonado',ab_n
    ));
  end loop;

  if exists(
    select 1 from jsonb_array_elements(people) a, jsonb_array_elements(people) b
    where a::text<>b::text and ((a->>'dni')=(b->>'dni') or (a->>'abonado')=(b->>'abonado'))
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

alter table public.on_tour_stadiums enable row level security;
alter table public.on_tour_people enable row level security;
drop policy if exists on_tour_stadiums_read on public.on_tour_stadiums;
create policy on_tour_stadiums_read on public.on_tour_stadiums for select using(activo or public.c23_is_admin());
drop policy if exists on_tour_stadiums_admin on public.on_tour_stadiums;
create policy on_tour_stadiums_admin on public.on_tour_stadiums for all using(public.c23_is_admin()) with check(public.c23_is_admin());
drop policy if exists on_tour_people_admin on public.on_tour_people;
create policy on_tour_people_admin on public.on_tour_people for all using(public.c23_is_admin()) with check(public.c23_is_admin());
drop policy if exists on_tour_people_member on public.on_tour_people;
create policy on_tour_people_member on public.on_tour_people for select using(
  exists(select 1 from public.travel_bookings b where b.id=booking_id and b.socio_id=public.fc_member_id())
);

commit;
select 'Commit 25 ON TOUR instalado correctamente' resultado;
