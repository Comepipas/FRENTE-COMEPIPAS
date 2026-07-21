-- FRENTE COMEPIPAS · COMMIT 19 · VIAJES SUPABASE
-- Ejecutar completo en Supabase > SQL Editor

begin;
create extension if not exists pgcrypto;

create table if not exists public.travel_events (
 id uuid primary key default gen_random_uuid(), titulo text not null, destino text not null, descripcion text,
 fecha_salida timestamptz not null, fecha_regreso timestamptz, punto_salida text,
 precio_socio numeric(10,2) not null default 0 check(precio_socio>=0),
 precio_acompanante numeric(10,2) not null default 0 check(precio_acompanante>=0),
 plazas_totales integer not null default 1 check(plazas_totales>0), max_plazas_por_socio integer not null default 1 check(max_plazas_por_socio>0),
 apertura timestamptz, cierre timestamptz, estado text not null default 'borrador' check(estado in ('borrador','abierto','completo','cerrado','cancelado','finalizado')),
 instrucciones_pago text, visible boolean not null default true, created_by uuid references auth.users(id), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.travel_bookings (
 id uuid primary key default gen_random_uuid(), travel_id uuid not null references public.travel_events(id) on delete cascade,
 socio_id uuid not null references public.socios(id) on delete cascade, acompanantes integer not null default 0 check(acompanantes>=0),
 total_plazas integer not null default 1 check(total_plazas>0), importe_total numeric(10,2) not null default 0,
 estado text not null default 'pendiente' check(estado in ('pendiente','confirmada','lista_espera','cancelada','rechazada','finalizada')),
 estado_pago text not null default 'pendiente' check(estado_pago in ('pendiente','parcial','pagado','devuelto')),
 importe_pagado numeric(10,2) not null default 0, metodo_pago text, referencia_pago text, observaciones_socio text, observaciones_admin text,
 created_at timestamptz default now(), updated_at timestamptz default now(), unique(travel_id,socio_id)
);
create table if not exists public.travel_companions (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.travel_bookings(id) on delete cascade,
 nombre text not null, apellidos text, dni text, telefono text, created_at timestamptz default now()
);
create index if not exists travel_events_fecha_idx on public.travel_events(fecha_salida);
create index if not exists travel_bookings_travel_idx on public.travel_bookings(travel_id);
create index if not exists travel_bookings_socio_idx on public.travel_bookings(socio_id);

create or replace function public.fc_is_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.admin_profiles where user_id=auth.uid() and coalesce(activo,true)=true); $$;
create or replace function public.fc_member_id() returns uuid language sql stable security definer set search_path=public as $$
 select id from public.socios where auth_user_id=auth.uid() limit 1; $$;
create or replace function public.fc_travel_occupied(p_id uuid) returns integer language sql stable security definer set search_path=public as $$
 select coalesce(sum(total_plazas),0)::int from public.travel_bookings where travel_id=p_id and estado in ('pendiente','confirmada'); $$;

create or replace view public.travel_event_summary with (security_invoker=true) as
select e.*, public.fc_travel_occupied(e.id) plazas_ocupadas, greatest(e.plazas_totales-public.fc_travel_occupied(e.id),0) plazas_disponibles,
 count(b.id) filter(where b.estado='pendiente') reservas_pendientes, count(b.id) filter(where b.estado='confirmada') reservas_confirmadas,
 count(b.id) filter(where b.estado='lista_espera') reservas_espera, coalesce(sum(b.importe_pagado),0) importe_cobrado
from public.travel_events e left join public.travel_bookings b on b.travel_id=e.id group by e.id;

create or replace function public.create_travel_booking(p_travel_id uuid,p_companions jsonb default '[]'::jsonb,p_notes text default null)
returns public.travel_bookings language plpgsql security definer set search_path=public as $$
declare ev public.travel_events%rowtype; mid uuid; n int; occ int; st text; rec public.travel_bookings%rowtype; x jsonb;
begin
 mid:=public.fc_member_id(); if mid is null then raise exception 'Cuenta no vinculada a un socio'; end if;
 select * into ev from public.travel_events where id=p_travel_id for update; if not found then raise exception 'Viaje no encontrado'; end if;
 if ev.estado not in ('abierto','completo') or not ev.visible then raise exception 'Reservas cerradas'; end if;
 if ev.apertura is not null and now()<ev.apertura then raise exception 'El plazo todavía no ha comenzado'; end if;
 if ev.cierre is not null and now()>ev.cierre then raise exception 'El plazo ha finalizado'; end if;
 if exists(select 1 from public.travel_bookings where travel_id=p_travel_id and socio_id=mid) then raise exception 'Ya tienes una reserva'; end if;
 n:=1+coalesce(jsonb_array_length(p_companions),0); if n>ev.max_plazas_por_socio then raise exception 'Supera el máximo de plazas'; end if;
 occ:=public.fc_travel_occupied(ev.id); st:=case when occ+n<=ev.plazas_totales then 'pendiente' else 'lista_espera' end;
 insert into public.travel_bookings(travel_id,socio_id,acompanantes,total_plazas,importe_total,estado,observaciones_socio)
 values(ev.id,mid,n-1,n,ev.precio_socio+(n-1)*ev.precio_acompanante,st,nullif(trim(p_notes),'')) returning * into rec;
 for x in select * from jsonb_array_elements(coalesce(p_companions,'[]'::jsonb)) loop
  insert into public.travel_companions(booking_id,nombre,apellidos,dni,telefono) values(rec.id,coalesce(nullif(trim(x->>'nombre'),''),'Acompañante'),nullif(trim(x->>'apellidos'),''),nullif(trim(x->>'dni'),''),nullif(trim(x->>'telefono'),''));
 end loop;
 if st='lista_espera' then update public.travel_events set estado='completo' where id=ev.id and estado='abierto'; end if; return rec;
end $$;

create or replace function public.cancel_my_travel_booking(p_booking_id uuid) returns public.travel_bookings language plpgsql security definer set search_path=public as $$
declare r public.travel_bookings%rowtype; begin
 update public.travel_bookings set estado='cancelada',updated_at=now() where id=p_booking_id and socio_id=public.fc_member_id() and estado in ('pendiente','lista_espera') returning * into r;
 if not found then raise exception 'La reserva no puede cancelarse'; end if; return r; end $$;

alter table public.travel_events enable row level security; alter table public.travel_bookings enable row level security; alter table public.travel_companions enable row level security;
drop policy if exists travel_events_admin on public.travel_events; create policy travel_events_admin on public.travel_events for all using(public.fc_is_admin()) with check(public.fc_is_admin());
drop policy if exists travel_events_member on public.travel_events; create policy travel_events_member on public.travel_events for select using(public.fc_is_admin() or (visible and estado in ('abierto','completo','cerrado','finalizado')));
drop policy if exists travel_bookings_admin on public.travel_bookings; create policy travel_bookings_admin on public.travel_bookings for all using(public.fc_is_admin()) with check(public.fc_is_admin());
drop policy if exists travel_bookings_member on public.travel_bookings; create policy travel_bookings_member on public.travel_bookings for select using(socio_id=public.fc_member_id());
drop policy if exists travel_companions_admin on public.travel_companions; create policy travel_companions_admin on public.travel_companions for all using(public.fc_is_admin()) with check(public.fc_is_admin());
drop policy if exists travel_companions_member on public.travel_companions; create policy travel_companions_member on public.travel_companions for select using(exists(select 1 from public.travel_bookings b where b.id=booking_id and b.socio_id=public.fc_member_id()));
grant execute on function public.create_travel_booking(uuid,jsonb,text) to authenticated; grant execute on function public.cancel_my_travel_booking(uuid) to authenticated;
commit;
select 'Commit 19 instalado correctamente' resultado;
