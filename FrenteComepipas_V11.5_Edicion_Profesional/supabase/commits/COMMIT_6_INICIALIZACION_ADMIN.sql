-- Frente Comepipas V22 · Commit 6
-- Inicialización y sincronización segura del administrador.
-- Ejecutar una sola vez en Supabase > SQL Editor.

create or replace function public.sincronizar_perfil_administrador()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_admin_role text;
  v_admin_count integer;
  v_bootstrap boolean := false;
begin
  if v_uid is null then
    raise exception 'Se requiere una sesión autenticada';
  end if;

  -- Evita que dos primeros accesos se promocionen simultáneamente.
  perform pg_advisory_xact_lock(hashtext('frente_comepipas_bootstrap_admin'));

  select email into v_email
  from auth.users
  where id = v_uid;

  select count(*) into v_admin_count
  from public.admin_profiles
  where activo = true;

  select rol into v_admin_role
  from public.admin_profiles
  where user_id = v_uid
    and activo = true;

  -- Instalación nueva: el primer usuario autenticado se convierte en superadmin.
  if v_admin_count = 0 then
    insert into public.admin_profiles (user_id, nombre, rol, activo)
    values (v_uid, coalesce(v_email, 'Administrador principal'), 'superadmin', true)
    on conflict (user_id) do update
      set nombre = excluded.nombre,
          rol = 'superadmin',
          activo = true;

    v_admin_role := 'superadmin';
    v_bootstrap := true;
  end if;

  -- Los usuarios del panel administrativo deben ser administradores también
  -- en public.perfiles, que es la tabla utilizada por las políticas RLS nuevas.
  if v_admin_role in ('superadmin','presidente','secretario','tesorero','viajes','editor') then
    insert into public.perfiles (id, socio_id, rol, nombre_mostrado, activo)
    values (v_uid, null, 'administrador'::public.rol_usuario,
            coalesce(v_email, 'Administrador'), true)
    on conflict (id) do update
      set rol = 'administrador'::public.rol_usuario,
          nombre_mostrado = coalesce(public.perfiles.nombre_mostrado, excluded.nombre_mostrado),
          activo = true,
          updated_at = now();
  else
    -- Un usuario normal nunca se promociona si ya existe algún administrador.
    insert into public.perfiles (id, socio_id, rol, nombre_mostrado, activo)
    values (v_uid, null, 'socio'::public.rol_usuario,
            coalesce(v_email, 'Usuario'), true)
    on conflict (id) do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'bootstrap', v_bootstrap,
    'admin_role', v_admin_role
  );
end;
$$;

revoke all on function public.sincronizar_perfil_administrador() from public;
grant execute on function public.sincronizar_perfil_administrador() to authenticated;
