-- Frente Comepipas · V22 Commit 17
-- Activación segura, acceso y área privada del socio.
-- Ejecutar UNA sola vez después del SQL del Commit 16.

begin;

create table if not exists public.member_account_events (
  id uuid primary key default gen_random_uuid(),
  socio_id uuid references public.socios(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  evento text not null,
  detalle jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.member_account_events enable row level security;
drop policy if exists member_account_events_admin_c17 on public.member_account_events;
create policy member_account_events_admin_c17 on public.member_account_events
for select to authenticated using (public.is_active_admin());

-- El trigger del Commit 16 permite la vinculación únicamente dentro de la función segura.
create or replace function public.protect_member_identity_fields()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='UPDATE' then
    if new.numero_socio is distinct from old.numero_socio then
      if not public.has_management_role() then raise exception 'El número de socio solo puede modificarlo la directiva autorizada.'; end if;
      insert into public.member_sensitive_history(socio_id,campo,valor_anterior,valor_nuevo)
      values(old.id,'numero_socio',old.numero_socio::text,new.numero_socio::text);
    end if;
    if new.fecha_nacimiento is distinct from old.fecha_nacimiento then
      if not public.has_management_role() then raise exception 'La fecha de nacimiento solo puede modificarla la directiva autorizada.'; end if;
      insert into public.member_sensitive_history(socio_id,campo,valor_anterior,valor_nuevo)
      values(old.id,'fecha_nacimiento',old.fecha_nacimiento::text,new.fecha_nacimiento::text);
    end if;
    if new.auth_user_id is distinct from old.auth_user_id
       and not public.has_management_role()
       and coalesce(current_setting('app.member_claim',true),'') <> 'allowed' then
      raise exception 'La vinculación de cuenta solo puede realizarla la directiva o el proceso seguro de activación.';
    end if;
    new.updated_at=now();
  end if;
  return new;
end; $$;

-- Vincula al usuario autenticado con un socio existente.
-- La verificación acepta el teléfono completo o sus 4 últimas cifras.
create or replace function public.claim_member_account(
  p_numero_socio integer,
  p_verificacion text
) returns jsonb
language plpgsql security definer set search_path=public,auth as $$
declare
  v_user auth.users%rowtype;
  v_socio public.socios%rowtype;
  v_check text := regexp_replace(coalesce(p_verificacion,''),'[^0-9A-Za-z]','','g');
  v_phone text;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión para activar la cuenta.'; end if;
  select * into v_user from auth.users where id=auth.uid();
  if v_user.id is null then raise exception 'No se encuentra el usuario autenticado.'; end if;

  select * into v_socio from public.socios where numero_socio=p_numero_socio for update;
  if v_socio.id is null then raise exception 'No existe ningún socio con ese número.'; end if;
  if v_socio.auth_user_id is not null and v_socio.auth_user_id<>auth.uid() then
    raise exception 'Esta ficha ya tiene una cuenta activada.';
  end if;
  if coalesce(lower(v_socio.estado),'activo') not in ('activo','activa','alta') then
    raise exception 'La ficha no está activa. Contacta con la directiva.';
  end if;

  v_phone := regexp_replace(coalesce(v_socio.telefono,''),'[^0-9A-Za-z]','','g');
  if length(v_check)<4 or not (v_check=v_phone or right(v_phone,4)=right(v_check,4)) then
    raise exception 'El dato de verificación no coincide con la ficha del socio.';
  end if;
  if v_socio.email is not null and trim(v_socio.email)<>'' and lower(trim(v_socio.email))<>lower(v_user.email) then
    raise exception 'El correo no coincide con el registrado. La directiva debe corregirlo antes de activar la cuenta.';
  end if;

  perform set_config('app.member_claim','allowed',true);
  update public.socios set
    auth_user_id=auth.uid(), cuenta_activada=true,
    email=coalesce(nullif(trim(email),''),v_user.email), updated_at=now()
  where id=v_socio.id;

  insert into public.member_account_events(socio_id,auth_user_id,evento,detalle)
  values(v_socio.id,auth.uid(),'cuenta_activada',jsonb_build_object('email',v_user.email));

  return jsonb_build_object('ok',true,'socio_id',v_socio.id,'numero_socio',v_socio.numero_socio,
    'nombre',trim(concat_ws(' ',v_socio.nombre,v_socio.apellidos)));
end; $$;

grant execute on function public.claim_member_account(integer,text) to authenticated;

-- Perfil privado sin exponer campos internos ni permitir modificar identidad.
create or replace view public.my_member_profile with (security_invoker=true) as
select id,numero_socio,nombre,apellidos,fecha_nacimiento,
       public.calculate_age(fecha_nacimiento,current_date) edad_actual,
       telefono,email,direccion,foto_url,fecha_alta,estado,categoria,
       cuenta_activada,cuota_al_dia,sector,fila,asiento,tipo_abono,numero_abonado_malaga
from public.socios where auth_user_id=auth.uid();
grant select on public.my_member_profile to authenticated;

commit;
