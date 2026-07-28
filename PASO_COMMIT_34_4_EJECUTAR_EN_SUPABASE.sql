-- FRENTE COMEPIPAS · COMMIT 34.4
-- Consolidación automática de cuotas por temporada.
-- Ejecutar una sola vez en Supabase > SQL Editor.

begin;

-- La función comprueba la existencia antes de insertar y no duplica cuotas.

-- Genera únicamente las cuotas que falten. Puede ejecutarse varias veces sin duplicar.
create or replace function public.commit344_sync_cuotas_temporada(p_temporada_id uuid default null)
returns table(generadas integer, existentes integer, socios_activos integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_temporada_id uuid;
  v_generadas integer := 0;
  v_existentes integer := 0;
  v_socios integer := 0;
begin
  select coalesce(
    p_temporada_id,
    (select id from public.temporadas where activa is true order by nombre desc limit 1)
  ) into v_temporada_id;

  if v_temporada_id is null then
    raise exception 'No existe una temporada activa.';
  end if;

  select count(*) into v_socios
  from public.socios
  where lower(coalesce(estado::text, '')) = 'activo'
    and coalesce(es_registro_prueba, false) is false;

  select count(*) into v_existentes
  from public.cuotas_socios
  where temporada_id = v_temporada_id;

  insert into public.cuotas_socios (
    socio_id,
    temporada_id,
    categoria_cuota_id,
    importe,
    estado,
    fecha_pago,
    metodo_pago,
    referencia,
    observaciones
  )
  select
    s.id,
    v_temporada_id,
    cc.id,
    case when coalesce(cc.exenta, false) then 0 else coalesce(cc.importe, 0) end,
    case when coalesce(cc.exenta, false) then 'pagada' else 'pendiente' end,
    case when coalesce(cc.exenta, false) then current_date else null end,
    case when coalesce(cc.exenta, false) then 'Exenta' else null end,
    null,
    case when coalesce(cc.exenta, false) then 'Cuota exenta generada automáticamente' else 'Cuota generada automáticamente' end
  from public.socios s
  left join lateral (
    select c.*
    from public.categorias_cuota c
    where c.temporada_id = v_temporada_id
      and coalesce(c.activa, true) is true
      and lower(trim(coalesce(c.codigo, c.nombre, ''))) = lower(trim(coalesce(s.categoria, '')))
    order by c.orden nulls last, c.created_at nulls last
    limit 1
  ) cc on true
  where lower(coalesce(s.estado::text, '')) = 'activo'
    and coalesce(s.es_registro_prueba, false) is false
    and not exists (
      select 1 from public.cuotas_socios q
      where q.socio_id = s.id and q.temporada_id = v_temporada_id
    );

  get diagnostics v_generadas = row_count;
  return query select v_generadas, v_existentes, v_socios;
end;
$$;

grant execute on function public.commit344_sync_cuotas_temporada(uuid) to authenticated;

-- Mantiene el indicador de la ficha del socio sincronizado con la temporada activa.
create or replace function public.commit344_refresh_member_fee_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_socio uuid;
  v_ok boolean;
begin
  v_socio := coalesce(new.socio_id, old.socio_id);

  select coalesce(bool_and(q.estado in ('pagada','anulada')), false)
  into v_ok
  from public.cuotas_socios q
  join public.temporadas t on t.id = q.temporada_id and t.activa is true
  where q.socio_id = v_socio;

  update public.socios
  set cuota_al_dia = v_ok,
      updated_at = now()
  where id = v_socio;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_commit344_refresh_member_fee_status on public.cuotas_socios;
create trigger trg_commit344_refresh_member_fee_status
after insert or update of estado or delete on public.cuotas_socios
for each row execute function public.commit344_refresh_member_fee_status();

-- Genera las cuotas al crear o activar una temporada.
create or replace function public.commit344_sync_on_season()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.activa is true and (tg_op = 'INSERT' or old.activa is distinct from new.activa) then
    perform public.commit344_sync_cuotas_temporada(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_commit344_sync_on_season on public.temporadas;
create trigger trg_commit344_sync_on_season
after insert or update of activa on public.temporadas
for each row execute function public.commit344_sync_on_season();

-- Sincroniza ahora la temporada activa.
select * from public.commit344_sync_cuotas_temporada(null);

commit;

-- Comprobación final por temporada.
select
  t.nombre as temporada,
  count(q.id) as cuotas,
  count(*) filter (where q.estado = 'pagada') as pagadas,
  count(*) filter (where q.estado = 'pendiente') as pendientes,
  coalesce(sum(q.importe) filter (where q.estado = 'pagada'), 0) as ingresos
from public.temporadas t
left join public.cuotas_socios q on q.temporada_id = t.id
where t.activa is true
group by t.id, t.nombre;
