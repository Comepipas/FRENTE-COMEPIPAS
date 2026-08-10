-- Commit 40.5: ficha definitiva para depuración manual del censo.
alter table public.socios add column if not exists sector_codigo_club text;
alter table public.socios add column if not exists gestion_abono_preferida text not null default 'por_confirmar';
alter table public.socios add column if not exists continuidad_estado text not null default 'por_confirmar';

update public.socios set cuenta_activada=true where auth_user_id is not null and cuenta_activada is distinct from true;

create or replace function public.commit405_sync_web_account_state()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  new.cuenta_activada := new.auth_user_id is not null;
  return new;
end $$;
drop trigger if exists commit405_sync_web_account_state on public.socios;
create trigger commit405_sync_web_account_state before insert or update of auth_user_id
on public.socios for each row execute function public.commit405_sync_web_account_state();

alter table public.socios drop constraint if exists socios_gestion_abono_preferida_check;
alter table public.socios add constraint socios_gestion_abono_preferida_check
check (gestion_abono_preferida in ('por_confirmar','pena','club','no_renueva'));
alter table public.socios drop constraint if exists socios_continuidad_estado_check;
alter table public.socios add constraint socios_continuidad_estado_check
check (continuidad_estado in ('por_confirmar','continua','baja_confirmada','pendiente_pago'));

create or replace function public.commit405_set_definitive_member_number(p_socio_id uuid,p_numero integer)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.c402_is_admin() then raise exception 'Acceso reservado a administradores'; end if;
  if p_numero is null or p_numero<1 then raise exception 'Número de socio no válido'; end if;
  if exists(select 1 from socios where numero_socio=p_numero and id<>p_socio_id) then
    raise exception 'Ese número definitivo ya pertenece a otro socio';
  end if;
  update socios set numero_socio=p_numero,numero_socio_estado='asignado' where id=p_socio_id;
  return jsonb_build_object('ok',true,'numero',p_numero);
end $$;
grant execute on function public.commit405_set_definitive_member_number(uuid,integer) to authenticated;

-- Un gestor puede tener cualquier número de familiares. Añadir uno nunca elimina los anteriores.
create or replace function public.family_admin_link(p_gestor uuid,p_gestionado uuid,p_tipo text,p_observaciones text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_family uuid;
begin
  if not public.c402_is_admin() then raise exception 'Acceso reservado a administradores'; end if;
  if p_gestor=p_gestionado then raise exception 'Selecciona dos socios diferentes'; end if;
  select fm.familia_id into v_family from familias_miembros fm
   where fm.socio_id=p_gestor and fm.estado='confirmado' and fm.tipo_vinculo='responsable_pago'
   order by fm.confirmado_at nulls last limit 1;
  if v_family is null then
    insert into familias_socios(nombre,responsable_socio_id) values('Familia administrada',p_gestor) returning id into v_family;
    insert into familias_miembros(familia_id,socio_id,relacion,tipo_vinculo,puede_pagar,puede_gestionar_renovacion,estado,confirmado_por,confirmado_at)
    values(v_family,p_gestor,'gestor','responsable_pago',true,true,'confirmado',auth.uid(),now()) on conflict do nothing;
  end if;
  insert into familias_miembros(familia_id,socio_id,relacion,tipo_vinculo,puede_pagar,puede_gestionar_renovacion,estado,confirmado_por,confirmado_at,observaciones)
  values(v_family,p_gestionado,p_tipo,p_tipo,true,true,'confirmado',auth.uid(),now(),p_observaciones)
  on conflict(familia_id,socio_id) do update set relacion=excluded.relacion,tipo_vinculo=excluded.tipo_vinculo,
    puede_pagar=true,puede_gestionar_renovacion=true,estado='confirmado',confirmado_por=auth.uid(),confirmado_at=now(),observaciones=excluded.observaciones;
  return jsonb_build_object('ok',true,'familia_id',v_family);
end $$;

create or replace function public.commit405_family_list(p_socio_id uuid)
returns table(familia_id uuid,socio_id uuid,numero_socio integer,nombre text,apellidos text,relacion text,tipo_vinculo text,puede_gestionar boolean)
language plpgsql security definer set search_path=public as $$
begin
  if not public.c402_is_admin() then raise exception 'Acceso reservado a administradores'; end if;
  return query select fm.familia_id,s.id,s.numero_socio,s.nombre,s.apellidos,fm.relacion,fm.tipo_vinculo,fm.puede_gestionar_renovacion
  from familias_miembros fm join socios s on s.id=fm.socio_id
  where fm.estado='confirmado' and fm.familia_id in(select x.familia_id from familias_miembros x where x.socio_id=p_socio_id)
  order by s.apellidos,s.nombre;
end $$;
grant execute on function public.commit405_family_list(uuid) to authenticated;

create or replace function public.commit405_family_unlink(p_familia_id uuid,p_socio_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.c402_is_admin() then raise exception 'Acceso reservado a administradores'; end if;
  update familias_miembros set estado='revocado',puede_pagar=false,puede_gestionar_renovacion=false
  where familia_id=p_familia_id and socio_id=p_socio_id;
end $$;
grant execute on function public.commit405_family_unlink(uuid,uuid) to authenticated;

comment on column public.socios.gestion_abono_preferida is 'Preferencia informativa: Peña, club, no renueva o pendiente de confirmar.';
comment on column public.socios.continuidad_estado is 'Situación comprobada durante la depuración manual del censo.';
