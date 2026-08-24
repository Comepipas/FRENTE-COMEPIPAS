-- COMMIT 40.2 · Familia privada y campaña piloto 2027/28
create extension if not exists pgcrypto;

alter table public.familias_miembros add column if not exists estado text not null default 'confirmado';
alter table public.familias_miembros add column if not exists tipo_vinculo text not null default 'familiar';
alter table public.familias_miembros add column if not exists puede_gestionar_renovacion boolean not null default false;
alter table public.familias_miembros add column if not exists confirmado_por uuid references auth.users(id);
alter table public.familias_miembros add column if not exists confirmado_at timestamptz;
alter table public.familias_miembros add column if not exists observaciones text;

create table if not exists public.vinculos_codigos (
  id uuid primary key default gen_random_uuid(),
  socio_id uuid not null references public.socios(id) on delete cascade,
  codigo_hash text not null unique,
  caduca_at timestamptz not null,
  usado_at timestamptz,
  revocado_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.campanas_ordenes_pago (
  id uuid primary key default gen_random_uuid(),
  campana_id uuid not null references public.campanas_abonados(id) on delete cascade,
  pagador_socio_id uuid not null references public.socios(id),
  referencia text not null unique,
  metodo text not null check (metodo in ('tarjeta_prueba','transferencia')),
  importe_abonos numeric(10,2) not null default 0,
  importe_cuotas numeric(10,2) not null default 0,
  importe_total numeric(10,2) generated always as (importe_abonos + importe_cuotas) stored,
  estado text not null default 'pendiente' check (estado in ('pendiente','pagado_prueba','conciliado','cancelado','incidencia')),
  detalle jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table public.vinculos_codigos enable row level security;
alter table public.campanas_ordenes_pago enable row level security;
drop policy if exists c28_authenticated_all on public.familias_socios;
drop policy if exists c28_authenticated_all on public.familias_miembros;
create or replace function public.c402_can_access_family(p_familia uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from familias_miembros fm join socios s on s.id=fm.socio_id where fm.familia_id=p_familia and s.auth_user_id=auth.uid() and fm.estado='confirmado');
$$;
drop policy if exists c402_family_group_read on public.familias_socios;
create policy c402_family_group_read on public.familias_socios for select to authenticated using(c402_can_access_family(id));
drop policy if exists c402_family_member_read on public.familias_miembros;
create policy c402_family_member_read on public.familias_miembros for select to authenticated using(c402_can_access_family(familia_id));
drop policy if exists c402_member_codes on public.vinculos_codigos;
create policy c402_member_codes on public.vinculos_codigos for select to authenticated
using (socio_id in (select id from public.socios where auth_user_id=auth.uid()));
drop policy if exists c402_member_orders on public.campanas_ordenes_pago;
create policy c402_member_orders on public.campanas_ordenes_pago for select to authenticated
using (pagador_socio_id in (select id from public.socios where auth_user_id=auth.uid()));
drop policy if exists c402_member_orders_insert on public.campanas_ordenes_pago;
create policy c402_member_orders_insert on public.campanas_ordenes_pago for insert to authenticated
with check (pagador_socio_id in (select id from public.socios where auth_user_id=auth.uid()));

create or replace function public.family_create_link_code()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_socio uuid; v_code text; v_until timestamptz;
begin
  select id into v_socio from socios where auth_user_id=auth.uid() limit 1;
  if v_socio is null then raise exception 'Cuenta sin socio vinculado'; end if;
  update vinculos_codigos set revocado_at=now() where socio_id=v_socio and usado_at is null and revocado_at is null;
  v_code := upper(substr(encode(gen_random_bytes(6),'hex'),1,10)); v_until:=now()+interval '30 minutes';
  insert into vinculos_codigos(socio_id,codigo_hash,caduca_at) values(v_socio,crypt(v_code,gen_salt('bf')),v_until);
  return jsonb_build_object('codigo',v_code,'caduca_at',v_until);
end $$;

create or replace function public.family_accept_link_code(p_codigo text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_me uuid; v_target uuid; v_code_id uuid; v_family uuid;
begin
  select id into v_me from socios where auth_user_id=auth.uid() limit 1;
  if v_me is null then raise exception 'Cuenta sin socio vinculado'; end if;
  select id,socio_id into v_code_id,v_target from vinculos_codigos
   where usado_at is null and revocado_at is null and caduca_at>now() and codigo_hash=crypt(upper(trim(p_codigo)),codigo_hash) limit 1;
  if v_target is null or v_target=v_me then return jsonb_build_object('ok',false,'message','El código no es válido o ha caducado.'); end if;
  select fm.familia_id into v_family from familias_miembros fm where fm.socio_id=v_target limit 1;
  if v_family is null then
    insert into familias_socios(nombre,responsable_socio_id) values('Grupo familiar privado',v_target) returning id into v_family;
    insert into familias_miembros(familia_id,socio_id,relacion,tipo_vinculo,puede_pagar,puede_gestionar_renovacion,estado,confirmado_at)
    values(v_family,v_target,'titular','titular',true,true,'confirmado',now()) on conflict do nothing;
  end if;
  insert into familias_miembros(familia_id,socio_id,relacion,tipo_vinculo,puede_pagar,puede_gestionar_renovacion,estado,confirmado_at)
  values(v_family,v_me,'familiar autorizado','familiar',true,true,'confirmado',now())
  on conflict(familia_id,socio_id) do update set puede_pagar=true,puede_gestionar_renovacion=true,estado='confirmado',confirmado_at=now();
  update vinculos_codigos set usado_at=now() where id=v_code_id;
  return jsonb_build_object('ok',true,'message','Vínculo familiar confirmado.');
end $$;

create or replace function public.family_my_authorized_members()
returns table(socio_id uuid,nombre text,apellidos text,numero_socio integer,tipo_vinculo text,puede_gestionar boolean)
language sql security definer set search_path=public as $$
  with me as (select id from socios where auth_user_id=auth.uid() limit 1), fam as (
    select familia_id from familias_miembros where socio_id=(select id from me) and estado='confirmado'
  )
  select s.id,s.nombre,s.apellidos,s.numero_socio,fm.tipo_vinculo,fm.puede_gestionar_renovacion
  from familias_miembros fm join socios s on s.id=fm.socio_id
  where fm.familia_id in(select familia_id from fam) and fm.estado='confirmado'
    and (fm.socio_id=(select id from me) or fm.puede_gestionar_renovacion=true);
$$;

grant execute on function public.family_create_link_code() to authenticated;
grant execute on function public.family_accept_link_code(text) to authenticated;
grant execute on function public.family_my_authorized_members() to authenticated;

create or replace function public.c402_is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from admin_profiles where user_id=auth.uid() and activo=true) $$;
create or replace function public.family_admin_search(p_query text)
returns table(id uuid,numero_socio integer,nombre text,apellidos text,fecha_nacimiento date) language plpgsql security definer set search_path=public as $$
begin if not c402_is_admin() then raise exception 'Acceso reservado a administradores'; end if;
return query select s.id,s.numero_socio,s.nombre,s.apellidos,s.fecha_nacimiento from socios s where s.estado<>'baja' and (s.numero_socio::text=trim(p_query) or lower(coalesce(s.dni,''))=lower(trim(p_query)) or lower(s.nombre||' '||s.apellidos) like '%'||lower(trim(p_query))||'%') order by s.apellidos,s.nombre limit 20; end $$;
create or replace function public.family_admin_link(p_gestor uuid,p_gestionado uuid,p_tipo text,p_observaciones text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_family uuid; begin if not c402_is_admin() then raise exception 'Acceso reservado a administradores'; end if; if p_gestor=p_gestionado then raise exception 'Selecciona dos socios diferentes'; end if;
select familia_id into v_family from familias_miembros where socio_id=p_gestor and estado='confirmado' limit 1;
if v_family is null then insert into familias_socios(nombre,responsable_socio_id) values('Grupo familiar administrado',p_gestor) returning id into v_family; insert into familias_miembros(familia_id,socio_id,relacion,tipo_vinculo,puede_pagar,puede_gestionar_renovacion,estado,confirmado_por,confirmado_at) values(v_family,p_gestor,'gestor','responsable_pago',true,true,'confirmado',auth.uid(),now()); end if;
insert into familias_miembros(familia_id,socio_id,relacion,tipo_vinculo,puede_pagar,puede_gestionar_renovacion,estado,confirmado_por,confirmado_at,observaciones) values(v_family,p_gestionado,p_tipo,p_tipo,true,true,'confirmado',auth.uid(),now(),p_observaciones) on conflict(familia_id,socio_id) do update set relacion=excluded.relacion,tipo_vinculo=excluded.tipo_vinculo,puede_pagar=true,puede_gestionar_renovacion=true,estado='confirmado',confirmado_por=auth.uid(),confirmado_at=now(),observaciones=excluded.observaciones; return jsonb_build_object('ok',true); end $$;
grant execute on function public.family_admin_search(text) to authenticated;
grant execute on function public.family_admin_link(uuid,uuid,text,text) to authenticated;

insert into public.campanas_abonados(temporada,nombre,tipo,estado,fecha_corte,fecha_apertura,fecha_cierre,pago_online_activo,modo_pruebas,altas_post_cierre,texto_socio,configuracion)
values('2027/28','Simulación completa 2027/28','piloto','abierta','2027-06-30','2027-05-15 09:00+02','2027-06-30 23:59+02',true,true,true,
'Prueba completa de renovación. Ningún pago ni transferencia de esta campaña es real.',
'{"demo":true,"iban_demo":"ES00 0000 0000 0000 0000 0000","cuotas":{"infantil":0,"joven":10,"adulto":20}}'::jsonb)
on conflict(temporada,tipo) do update set nombre=excluded.nombre,estado='abierta',modo_pruebas=true,pago_online_activo=true,texto_socio=excluded.texto_socio,configuracion=excluded.configuracion;

insert into public.campanas_categorias(campana_id,nombre,edad_min,edad_max,cuota,orden,activa)
select c.id,x.nombre,x.edad_min,x.edad_max,x.cuota,x.orden,true from campanas_abonados c
cross join(values('Infantil',0,13,0::numeric,1),('Joven',14,25,10::numeric,2),('Adulto',26,null::integer,20::numeric,3))x(nombre,edad_min,edad_max,cuota,orden)
where c.temporada='2027/28' and c.tipo='piloto' on conflict(campana_id,nombre) do update set cuota=excluded.cuota,edad_min=excluded.edad_min,edad_max=excluded.edad_max,activa=true;
