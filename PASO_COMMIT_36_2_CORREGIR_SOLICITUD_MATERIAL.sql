-- FRENTE COMEPIPAS · COMMIT 36.2
-- Corrección de solicitudes de material: "column reference id is ambiguous"

create or replace function public.submit_material_request(
 p_material_id uuid,
 p_nombre text,
 p_telefono text,
 p_email text default null,
 p_cantidad integer default 1,
 p_variante text default null,
 p_preferencia_contacto text default 'WhatsApp',
 p_observaciones text default null
) returns table(id uuid, referencia text, estado text, created_at timestamptz)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_item public.material_items%rowtype;
  v_socio uuid;
  v_row public.material_requests%rowtype;
begin
  select mi.*
    into v_item
    from public.material_items as mi
   where mi.id = p_material_id
     and mi.visible = true;

  if not found then
    raise exception 'El material no está disponible en el catálogo';
  end if;

  if v_item.disponibilidad = 'No disponible' then
    raise exception 'Este material figura como no disponible';
  end if;

  if nullif(trim(p_nombre),'') is null
     or nullif(trim(p_telefono),'') is null then
    raise exception 'Nombre y teléfono son obligatorios';
  end if;

  if p_cantidad < 1 or p_cantidad > 20 then
    raise exception 'Cantidad no válida';
  end if;

  v_socio := public.fc_current_member_id();

  insert into public.material_requests as mr (
    socio_id,
    material_id,
    nombre,
    telefono,
    email,
    cantidad,
    variante,
    preferencia_contacto,
    observaciones_socio
  ) values (
    v_socio,
    p_material_id,
    trim(p_nombre),
    trim(p_telefono),
    nullif(trim(p_email),''),
    p_cantidad,
    nullif(trim(p_variante),''),
    p_preferencia_contacto,
    nullif(trim(p_observaciones),'')
  )
  returning mr.* into v_row;

  return query
  select
    v_row.id,
    v_row.referencia,
    v_row.estado,
    v_row.created_at;
end;
$$;

grant execute on function public.submit_material_request(uuid,text,text,text,integer,text,text,text)
to anon, authenticated;
