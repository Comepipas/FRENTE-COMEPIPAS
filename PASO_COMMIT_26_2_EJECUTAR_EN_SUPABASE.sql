-- FRENTE COMEPIPAS · COMMIT 26.2 · ON TOUR PROFESIONAL
-- Ejecutar completo en Supabase > SQL Editor
begin;

alter table public.travel_events
  add column if not exists temporada text default '2026/27',
  add column if not exists archivado boolean not null default false,
  add column if not exists maps_url text;

update public.travel_events set temporada='2026/27' where temporada is null or trim(temporada)='';

create index if not exists travel_events_temporada_idx on public.travel_events(temporada);
create index if not exists travel_events_archivado_idx on public.travel_events(archivado);

create or replace view public.travel_event_summary with (security_invoker=true) as
select e.*,
 public.fc_travel_occupied(e.id) plazas_ocupadas,
 greatest(e.plazas_totales-public.fc_travel_occupied(e.id),0) plazas_disponibles,
 count(b.id) filter(where b.estado='pendiente') reservas_pendientes,
 count(b.id) filter(where b.estado='confirmada') reservas_confirmadas,
 count(b.id) filter(where b.estado='lista_espera') reservas_espera,
 coalesce(sum(b.importe_pagado),0) importe_cobrado
from public.travel_events e
left join public.travel_bookings b on b.travel_id=e.id
group by e.id;

commit;
select 'Commit 26.2 instalado correctamente' resultado;
