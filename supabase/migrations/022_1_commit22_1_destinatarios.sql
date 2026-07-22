-- COMMIT 22.1 · CORRECCIÓN DE DESTINATARIOS DE COMUNICACIONES
-- Ejecutar una sola vez en Supabase > SQL Editor después del Commit 22.
-- Es seguro volver a ejecutarlo: sustituye únicamente la función de preparación.

create or replace function public.c22_prepare_recipients(p_communication_id uuid)
returns integer
language plpgsql
security definer
set search_path=public
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

  -- Una nueva preparación debe reconstruir completamente los destinatarios.
  delete from public.communication_recipients
  where communication_id = c.id;

  -- También se eliminan avisos previos para que un cambio de segmento no deje
  -- notificaciones antiguas a socios que ya no pertenecen a la selección.
  delete from public.member_notices
  where communication_id = c.id;

  insert into public.communication_recipients(
    communication_id,
    socio_id,
    email,
    nombre,
    estado
  )
  select
    c.id,
    s.id,
    nullif(trim(coalesce(s.email, '')), ''),
    trim(concat_ws(' ', s.nombre, s.apellidos)),
    case
      -- En los avisos internos no existe un envío de correo pendiente.
      when c.canal = 'interno' then 'omitido'
      -- En el canal combinado, un socio sin email recibe el aviso interno,
      -- pero se marca como omitido para el envío por Brevo.
      when nullif(trim(coalesce(s.email, '')), '') is null then 'omitido'
      else 'pendiente'
    end
  from public.socios s
  where
    (
      c.segmento = 'todos'
      or (
        c.segmento = 'activos'
        and lower(trim(coalesce(s.estado::text, ''))) in ('activo', 'activa', 'alta')
      )
      or (
        c.segmento = 'cuota_al_dia'
        and coalesce(s.cuota_al_dia, false) = true
      )
      or (
        c.segmento = 'adultos'
        and lower(trim(coalesce(s.categoria::text, ''))) like '%adult%'
      )
      or (
        c.segmento = 'jovenes'
        and lower(trim(coalesce(s.categoria::text, ''))) like '%jov%'
      )
      or (
        c.segmento = 'infantiles'
        and lower(trim(coalesce(s.categoria::text, ''))) like '%inf%'
      )
      or (
        c.segmento = 'seleccion'
        and s.id = any(coalesce(c.destinatarios_ids, '{}'::uuid[]))
      )
    )
    -- Los canales que envían correo necesitan email. El canal interno y el
    -- combinado conservan al socio para poder crear su aviso privado.
    and (
      c.canal in ('interno', 'ambos')
      or nullif(trim(coalesce(s.email, '')), '') is not null
    );

  get diagnostics n = row_count;

  update public.communications
  set
    total_destinatarios = n,
    enviados_ok = 0,
    enviados_error = 0,
    ultimo_error = null,
    updated_at = now()
  where id = c.id;

  if c.canal in ('interno', 'ambos') then
    insert into public.member_notices(
      communication_id,
      socio_id,
      titulo,
      cuerpo_html,
      importante
    )
    select
      c.id,
      r.socio_id,
      c.titulo,
      c.cuerpo_html,
      c.importante
    from public.communication_recipients r
    where r.communication_id = c.id
      and r.socio_id is not null;
  end if;

  return n;
end;
$$;

grant execute on function public.c22_prepare_recipients(uuid) to authenticated;

-- Comprobación informativa: debe devolver la definición actualizada.
select pg_get_functiondef('public.c22_prepare_recipients(uuid)'::regprocedure);
