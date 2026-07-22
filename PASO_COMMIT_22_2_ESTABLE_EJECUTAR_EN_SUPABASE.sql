-- FRENTE COMEPIPAS · V22 · COMMIT 22.2 ESTABLE
-- Corrección definitiva de preparación de destinatarios.
-- Esta versión coincide con la función comprobada en producción.

create or replace function public.c22_prepare_recipients(
  p_communication_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_comunicacion public.communications%rowtype;
  v_total integer := 0;
begin
  select *
  into v_comunicacion
  from public.communications
  where id = p_communication_id;

  if not found then
    raise exception 'Comunicación no encontrada';
  end if;

  delete from public.communication_recipients
  where communication_id = p_communication_id;

  delete from public.member_notices
  where communication_id = p_communication_id;

  insert into public.communication_recipients (
    communication_id,
    socio_id,
    email,
    nombre,
    estado
  )
  select
    p_communication_id,
    s.id,
    coalesce(
      nullif(trim(s.email), ''),
      nullif(trim(au.email), '')
    ),
    trim(concat_ws(' ', s.nombre, s.apellidos)),
    case
      when lower(trim(v_comunicacion.canal)) = 'interno' then 'omitido'
      when coalesce(
        nullif(trim(s.email), ''),
        nullif(trim(au.email), '')
      ) is null then 'omitido'
      else 'pendiente'
    end
  from public.socios s
  left join auth.users au
    on au.id = s.auth_user_id
  where
    (
      lower(trim(v_comunicacion.segmento)) = 'todos'
      or (
        lower(trim(v_comunicacion.segmento)) = 'activos'
        and lower(trim(coalesce(s.estado::text, ''))) = 'activo'
      )
      or (
        lower(trim(v_comunicacion.segmento)) = 'seleccion'
        and s.id = any(
          coalesce(v_comunicacion.destinatarios_ids, '{}'::uuid[])
        )
      )
    )
    and (
      lower(trim(v_comunicacion.canal)) in ('interno', 'ambos')
      or coalesce(
        nullif(trim(s.email), ''),
        nullif(trim(au.email), '')
      ) is not null
    );

  select count(*)
  into v_total
  from public.communication_recipients
  where communication_id = p_communication_id;

  update public.communications
  set
    total_destinatarios = v_total,
    enviados_ok = 0,
    enviados_error = 0,
    ultimo_error = null,
    updated_at = now()
  where id = p_communication_id;

  return v_total;
end;
$$;

revoke all on function public.c22_prepare_recipients(uuid) from public;
revoke all on function public.c22_prepare_recipients(uuid) from anon;
grant execute on function public.c22_prepare_recipients(uuid) to authenticated;

-- Comprobación de instalación.
select pg_get_functiondef('public.c22_prepare_recipients(uuid)'::regprocedure);
