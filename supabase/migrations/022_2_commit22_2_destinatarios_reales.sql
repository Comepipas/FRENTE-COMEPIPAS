-- COMMIT 22.2 · DESTINATARIOS REALES DE COMUNICACIONES
-- Corrige el origen del email: usa socios.email y, como respaldo, auth.users.email.
-- También considera activo cualquier socio que no esté marcado expresamente como baja/inactivo.

create or replace function public.c22_prepare_recipients(p_communication_id uuid)
returns integer
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  c public.communications;
  n integer := 0;
begin
  if not public.fc_is_admin() then
    raise exception 'Acceso denegado';
  end if;

  select * into c
  from public.communications
  where id = p_communication_id;

  if not found then
    raise exception 'Comunicación no encontrada';
  end if;

  delete from public.communication_recipients where communication_id = c.id;
  delete from public.member_notices where communication_id = c.id;

  insert into public.communication_recipients(
    communication_id, socio_id, email, nombre, estado
  )
  select
    c.id,
    s.id,
    nullif(trim(coalesce(s.email, au.email, '')), ''),
    trim(concat_ws(' ', s.nombre, s.apellidos)),
    case
      when c.canal = 'interno' then 'omitido'
      when nullif(trim(coalesce(s.email, au.email, '')), '') is null then 'omitido'
      else 'pendiente'
    end
  from public.socios s
  left join auth.users au on au.id = s.auth_user_id
  where
    (
      c.segmento = 'todos'
      or (
        c.segmento = 'activos'
        and lower(trim(coalesce(s.estado::text, 'activo'))) not in
          ('baja','inactivo','inactiva','baja temporal','expulsado','expulsada')
      )
      or (c.segmento = 'cuota_al_dia' and coalesce(s.cuota_al_dia, false))
      or (c.segmento = 'adultos' and lower(trim(coalesce(s.categoria::text, ''))) like '%adult%')
      or (c.segmento = 'jovenes' and lower(trim(coalesce(s.categoria::text, ''))) like '%jov%')
      or (c.segmento = 'infantiles' and lower(trim(coalesce(s.categoria::text, ''))) like '%inf%')
      or (c.segmento = 'seleccion' and s.id = any(coalesce(c.destinatarios_ids, '{}'::uuid[])))
    )
    and (
      c.canal in ('interno','ambos')
      or nullif(trim(coalesce(s.email, au.email, '')), '') is not null
    );

  get diagnostics n = row_count;

  update public.communications
  set total_destinatarios = n,
      enviados_ok = 0,
      enviados_error = 0,
      ultimo_error = null,
      updated_at = now()
  where id = c.id;

  if c.canal in ('interno','ambos') then
    insert into public.member_notices(
      communication_id, socio_id, titulo, cuerpo_html, importante
    )
    select c.id, r.socio_id, c.titulo, c.cuerpo_html, c.importante
    from public.communication_recipients r
    where r.communication_id = c.id and r.socio_id is not null;
  end if;

  return n;
end;
$$;

grant execute on function public.c22_prepare_recipients(uuid) to authenticated;

-- DIAGNÓSTICO: muestra de dónde salen los correos y cuántos socios reconoce.
select
  count(*) as total_socios,
  count(*) filter (
    where lower(trim(coalesce(s.estado::text,'activo'))) not in
      ('baja','inactivo','inactiva','baja temporal','expulsado','expulsada')
  ) as socios_activos,
  count(*) filter (where nullif(trim(coalesce(s.email,'')),'') is not null) as email_en_ficha,
  count(*) filter (where nullif(trim(coalesce(au.email,'')),'') is not null) as email_en_auth,
  count(*) filter (where nullif(trim(coalesce(s.email,au.email,'')),'') is not null) as destinatarios_con_email
from public.socios s
left join auth.users au on au.id=s.auth_user_id;
