-- Frente Comepipas · V22 Commit 16
-- Base segura de socios, cuotas por edad y vinculación con Supabase Auth.
-- Ejecutar una sola vez en el Editor SQL de Supabase con un usuario propietario.

begin;

create extension if not exists pgcrypto;

-- Perfiles de administración existentes.
create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol text not null check (rol in ('superadmin','presidente','secretario','tesorero','viajes','editor')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ampliación no destructiva de la tabla real de socios.
alter table public.socios add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;
alter table public.socios add column if not exists numero_socio integer;
alter table public.socios add column if not exists fecha_nacimiento date;
alter table public.socios add column if not exists categoria text;
alter table public.socios add column if not exists fecha_alta date default current_date;
alter table public.socios add column if not exists cuenta_activada boolean not null default false;
alter table public.socios add column if not exists cuota_al_dia boolean not null default false;
alter table public.socios add column if not exists updated_at timestamptz not null default now();

-- El número es permanente y no se reutiliza. La secuencia empieza después del máximo existente.
create sequence if not exists public.socios_numero_seq;
select setval('public.socios_numero_seq', greatest(coalesce((select max(numero_socio) from public.socios),0),1), true);
alter table public.socios alter column numero_socio set default nextval('public.socios_numero_seq');
create unique index if not exists socios_numero_socio_uidx on public.socios(numero_socio) where numero_socio is not null;
create unique index if not exists socios_auth_user_uidx on public.socios(auth_user_id) where auth_user_id is not null;
create index if not exists socios_fecha_nacimiento_idx on public.socios(fecha_nacimiento);

-- Configuración de campañas y tramos de cuota. No se codifican importes en la web.
create table if not exists public.fee_campaigns (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  temporada text not null,
  fecha_referencia date not null,
  fecha_inicio date,
  fecha_fin date,
  activa boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(temporada)
);

create table if not exists public.fee_brackets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.fee_campaigns(id) on delete cascade,
  nombre text not null,
  edad_min integer,
  edad_max integer,
  importe numeric(10,2) not null default 0 check (importe >= 0),
  prioridad integer not null default 100,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  check (edad_min is null or edad_min >= 0),
  check (edad_max is null or edad_max >= 0),
  check (edad_min is null or edad_max is null or edad_min <= edad_max)
);
create index if not exists fee_brackets_campaign_idx on public.fee_brackets(campaign_id,prioridad);

-- Historial protegido para cambios sensibles.
create table if not exists public.member_sensitive_history (
  id uuid primary key default gen_random_uuid(),
  socio_id uuid not null references public.socios(id) on delete cascade,
  campo text not null,
  valor_anterior text,
  valor_nuevo text,
  realizado_por uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create or replace function public.is_active_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.admin_profiles p where p.user_id=auth.uid() and p.activo=true);
$$;

create or replace function public.has_management_role()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.admin_profiles p where p.user_id=auth.uid() and p.activo=true
    and p.rol in ('superadmin','presidente','secretario','tesorero'));
$$;

create or replace function public.calculate_age(p_birth date, p_reference date default current_date)
returns integer language sql immutable as $$
  select case when p_birth is null then null
    else extract(year from age(p_reference,p_birth))::integer end;
$$;

create or replace function public.member_fee_for_campaign(p_member uuid,p_campaign uuid)
returns table(categoria text, edad integer, importe numeric) language sql stable security definer set search_path=public as $$
  with base as (
    select s.fecha_nacimiento,c.fecha_referencia
    from public.socios s cross join public.fee_campaigns c
    where s.id=p_member and c.id=p_campaign
  ), calc as (
    select public.calculate_age(fecha_nacimiento,fecha_referencia) edad from base
  )
  select b.nombre,c.edad,b.importe
  from calc c join public.fee_brackets b on b.campaign_id=p_campaign and b.activo=true
   and (b.edad_min is null or c.edad>=b.edad_min)
   and (b.edad_max is null or c.edad<=b.edad_max)
  order by b.prioridad,b.edad_min nulls first limit 1;
$$;

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
    if new.auth_user_id is distinct from old.auth_user_id and not public.has_management_role() then
      raise exception 'La vinculación de cuenta solo puede realizarla la directiva autorizada.';
    end if;
    new.updated_at=now();
  end if;
  return new;
end; $$;

drop trigger if exists trg_socios_protect_identity on public.socios;
create trigger trg_socios_protect_identity before update on public.socios
for each row execute function public.protect_member_identity_fields();

-- RLS: se eliminan políticas antiguas conocidas, incluida la permisiva para authenticated.
alter table public.socios enable row level security;
alter table public.fee_campaigns enable row level security;
alter table public.fee_brackets enable row level security;
alter table public.member_sensitive_history enable row level security;

drop policy if exists socios_select_authenticated on public.socios;
drop policy if exists socios_insert_authenticated on public.socios;
drop policy if exists socios_update_authenticated on public.socios;
drop policy if exists socios_board_select on public.socios;
drop policy if exists socios_board_insert on public.socios;
drop policy if exists socios_board_update on public.socios;
drop policy if exists socios_admin_all_c16 on public.socios;
drop policy if exists socios_member_read_own_c16 on public.socios;
drop policy if exists socios_member_update_own_c16 on public.socios;

create policy socios_admin_all_c16 on public.socios for all to authenticated
using (public.is_active_admin()) with check (public.has_management_role());

create policy socios_member_read_own_c16 on public.socios for select to authenticated
using (auth_user_id=auth.uid());

-- El socio solo puede cambiar datos de contacto. El trigger bloquea identidad sensible.
create policy socios_member_update_own_c16 on public.socios for update to authenticated
using (auth_user_id=auth.uid()) with check (auth_user_id=auth.uid());

create policy fee_campaigns_read_c16 on public.fee_campaigns for select to authenticated using (true);
create policy fee_campaigns_admin_c16 on public.fee_campaigns for all to authenticated using (public.is_active_admin()) with check (public.has_management_role());
create policy fee_brackets_read_c16 on public.fee_brackets for select to authenticated using (true);
create policy fee_brackets_admin_c16 on public.fee_brackets for all to authenticated using (public.is_active_admin()) with check (public.has_management_role());
create policy sensitive_history_admin_read_c16 on public.member_sensitive_history for select to authenticated using (public.is_active_admin());

-- Vista segura para el futuro Área del Socio: nunca expone observaciones internas de otros.
create or replace view public.my_member_profile with (security_invoker=true) as
select id,numero_socio,nombre,apellidos,fecha_nacimiento,
       public.calculate_age(fecha_nacimiento,current_date) as edad_actual,
       telefono,email,direccion,foto_url,fecha_alta,estado,categoria,
       cuenta_activada,cuota_al_dia,sector,fila,asiento,tipo_abono,numero_abonado_malaga
from public.socios where auth_user_id=auth.uid();

grant select on public.my_member_profile to authenticated;
grant execute on function public.calculate_age(date,date) to authenticated;
grant execute on function public.member_fee_for_campaign(uuid,uuid) to authenticated;

commit;
