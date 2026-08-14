-- FRENTE COMEPIPAS - COMMIT 40.9.8 - ACOMPANANTES ON TOUR
-- Ejecutar completo en Supabase > SQL Editor.
begin;

-- Permite volver a solicitar el mismo viaje tras cancelar una solicitud.
alter table public.travel_bookings
  drop constraint if exists travel_bookings_travel_id_socio_id_key;
drop index if exists public.travel_bookings_travel_id_socio_id_active_uidx;
create unique index travel_bookings_travel_id_socio_id_active_uidx
  on public.travel_bookings(travel_id,socio_id)
  where estado <> 'cancelada';

-- Una cancelacion, incluida la realizada por un administrador, libera a todos.
create or replace function public.release_on_tour_people_after_cancel()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.estado='cancelada' and old.estado is distinct from new.estado then
    delete from public.on_tour_people where booking_id=new.id;
  end if;
  return new;
end $$;
drop trigger if exists trg_release_on_tour_people_after_cancel on public.travel_bookings;
create trigger trg_release_on_tour_people_after_cancel
after update of estado on public.travel_bookings
for each row execute function public.release_on_tour_people_after_cancel();

create or replace function public.my_on_tour_participations()
returns table(travel_id uuid, booking_id uuid, rol text, estado text, responsable text)
language sql stable security definer set search_path=public,auth as $$
  select p.travel_id,p.booking_id,p.rol,b.estado,
    case when p.rol='solicitante' then 'Tu'
    else concat_ws(' ',s.nombre,left(coalesce(s.apellidos,''),1)||case when coalesce(s.apellidos,'')<>'' then '.' else '' end) end
  from public.on_tour_people p
  join public.travel_bookings b on b.id=p.booking_id
  join public.socios s on s.id=b.socio_id
  where p.socio_id=public.fc_member_id() and b.estado<>'cancelada';
$$;
grant execute on function public.my_on_tour_participations() to authenticated;

create or replace function public.cancel_my_travel_booking(p_booking_id uuid)
returns public.travel_bookings language plpgsql security definer set search_path=public as $$
declare r public.travel_bookings%rowtype;
begin
  update public.travel_bookings set estado='cancelada',updated_at=now()
  where id=p_booking_id and socio_id=public.fc_member_id()
    and estado in ('pendiente','lista_espera') returning * into r;
  if not found then raise exception 'La solicitud no puede cancelarse'; end if;
  delete from public.on_tour_people where booking_id=p_booking_id;
  return r;
end $$;
grant execute on function public.cancel_my_travel_booking(uuid) to authenticated;

commit;
select 'Commit 40.9.8 ON TOUR instalado correctamente' resultado;
