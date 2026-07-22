-- Frente Comepipas · Commit 18
-- Solicitudes de entradas conectadas a Supabase
-- Ejecutar una sola vez en Supabase > SQL Editor

begin;

create table if not exists public.ticket_matches (
  id uuid primary key default gen_random_uuid(),
  rival text not null,
  titulo text not null,
  competicion text,
  fecha_partido timestamptz not null,
  estadio text,
  local_visitante text not null default 'visitante' check (local_visitante in ('local','visitante','neutral')),
  precio numeric(10,2) not null default 0 check (precio >= 0),
  cupo integer not null default 0 check (cupo >= 0),
  max_por_socio integer not null default 1 check (max_por_socio between 1 and 10),
  apertura timestamptz,
  cierre timestamptz,
  estado text not null default 'borrador' check (estado in ('borrador','abierto','cerrado','finalizado','cancelado')),
  observaciones text,
  creado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_requests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.ticket_matches(id) on delete cascade,
  socio_id uuid not null references public.socios(id) on delete restrict,
  cantidad integer not null default 1 check (cantidad between 1 and 10),
  concedidas integer not null default 0 check (concedidas >= 0),
  estado text not null default 'pendiente' check (estado in ('pendiente','admitida','lista_espera','rechazada','cancelada','entregada')),
  pago text not null default 'pendiente' check (pago in ('pendiente','pagado','no_procede')),
  observaciones_socio text,
  observaciones_admin text,
  fecha_solicitud timestamptz not null default now(),
  fecha_resolucion timestamptz,
  fecha_entrega timestamptz,
  gestionado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(match_id, socio_id)
);

create index if not exists ticket_matches_fecha_idx on public.ticket_matches(fecha_partido);
create index if not exists ticket_requests_match_idx on public.ticket_requests(match_id);
create index if not exists ticket_requests_socio_idx on public.ticket_requests(socio_id);
create index if not exists ticket_requests_estado_idx on public.ticket_requests(estado);

create or replace function public.touch_ticket_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); return new; end $$;

drop trigger if exists trg_ticket_matches_updated on public.ticket_matches;
create trigger trg_ticket_matches_updated before update on public.ticket_matches
for each row execute function public.touch_ticket_updated_at();
drop trigger if exists trg_ticket_requests_updated on public.ticket_requests;
create trigger trg_ticket_requests_updated before update on public.ticket_requests
for each row execute function public.touch_ticket_updated_at();

create or replace function public.my_socio_id()
returns uuid language sql stable security definer set search_path=public,auth as $$
  select id from public.socios where auth_user_id=auth.uid() limit 1
$$;

create or replace function public.request_ticket(p_match_id uuid, p_cantidad integer, p_observaciones text default null)
returns public.ticket_requests
language plpgsql security definer set search_path=public,auth as $$
declare v_socio uuid; v_match public.ticket_matches; v_result public.ticket_requests;
begin
  v_socio:=public.my_socio_id();
  if v_socio is null then raise exception 'No existe una ficha de socio vinculada'; end if;
  select * into v_match from public.ticket_matches where id=p_match_id;
  if not found then raise exception 'El partido no existe'; end if;
  if v_match.estado <> 'abierto' then raise exception 'Las solicitudes no están abiertas'; end if;
  if v_match.apertura is not null and now()<v_match.apertura then raise exception 'El plazo todavía no ha comenzado'; end if;
  if v_match.cierre is not null and now()>v_match.cierre then raise exception 'El plazo ha terminado'; end if;
  if p_cantidad<1 or p_cantidad>v_match.max_por_socio then raise exception 'Cantidad no permitida'; end if;
  insert into public.ticket_requests(match_id,socio_id,cantidad,observaciones_socio)
  values(p_match_id,v_socio,p_cantidad,nullif(trim(p_observaciones),''))
  returning * into v_result;
  return v_result;
exception when unique_violation then
  raise exception 'Ya has enviado una solicitud para este partido';
end $$;

grant execute on function public.my_socio_id() to authenticated;
grant execute on function public.request_ticket(uuid,integer,text) to authenticated;

alter table public.ticket_matches enable row level security;
alter table public.ticket_requests enable row level security;

drop policy if exists ticket_matches_member_read on public.ticket_matches;
create policy ticket_matches_member_read on public.ticket_matches for select to authenticated
using (estado in ('abierto','cerrado','finalizado') or public.is_active_admin());
drop policy if exists ticket_matches_admin_all on public.ticket_matches;
create policy ticket_matches_admin_all on public.ticket_matches for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists ticket_requests_member_read on public.ticket_requests;
create policy ticket_requests_member_read on public.ticket_requests for select to authenticated
using (socio_id=public.my_socio_id() or public.is_active_admin());
drop policy if exists ticket_requests_member_cancel on public.ticket_requests;
create policy ticket_requests_member_cancel on public.ticket_requests for update to authenticated
using (socio_id=public.my_socio_id() and estado='pendiente')
with check (socio_id=public.my_socio_id() and estado='cancelada');
drop policy if exists ticket_requests_admin_all on public.ticket_requests;
create policy ticket_requests_admin_all on public.ticket_requests for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

create or replace view public.ticket_match_summary with (security_invoker=true) as
select m.*,
 count(r.id)::integer as solicitudes,
 coalesce(sum(r.cantidad) filter(where r.estado<>'cancelada'),0)::integer as entradas_solicitadas,
 coalesce(sum(r.concedidas),0)::integer as entradas_asignadas,
 greatest(m.cupo-coalesce(sum(r.concedidas),0),0)::integer as cupo_restante
from public.ticket_matches m left join public.ticket_requests r on r.match_id=m.id
group by m.id;
grant select on public.ticket_match_summary to authenticated;

commit;

select 'Commit 18 instalado' as resultado,
 (select count(*) from public.ticket_matches) as partidos,
 (select count(*) from public.ticket_requests) as solicitudes;
