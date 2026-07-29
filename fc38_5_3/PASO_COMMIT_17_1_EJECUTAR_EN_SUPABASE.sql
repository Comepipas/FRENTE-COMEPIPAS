-- Frente Comepipas · V22 Commit 17.1
-- Reparación definitiva de activación, vinculación y estado de acceso.
-- Ejecutar una sola vez después de los Commit 16 y 17.
begin;

alter table public.socios add column if not exists access_status text not null default 'sin_acceso';
alter table public.socios add column if not exists invited_at timestamptz;
alter table public.socios add column if not exists activated_at timestamptz;
alter table public.socios add column if not exists last_access_at timestamptz;

update public.socios set access_status=case when auth_user_id is not null or cuenta_activada then 'activo' else 'sin_acceso' end
where access_status is null or access_status='sin_acceso';

create or replace function public.link_member_identity(
  p_auth_user_id uuid,p_email text,p_member_number integer,p_verification text
) returns uuid language plpgsql security definer set search_path=public,auth as $$
declare v public.socios%rowtype; v_phone text; v_check text;
begin
 if p_auth_user_id is null then raise exception 'Usuario no válido.'; end if;
 v_check:=regexp_replace(coalesce(p_verification,''),'[^0-9A-Za-z]','','g');
 select * into v from public.socios where numero_socio=p_member_number for update;
 if v.id is null then raise exception 'No existe ningún socio con ese número.'; end if;
 if lower(coalesce(v.estado,'activo')) not in ('activo','activa','alta') then raise exception 'La ficha de socio no está activa.'; end if;
 if v.auth_user_id is not null and v.auth_user_id<>p_auth_user_id then raise exception 'Esta ficha ya está vinculada con otra cuenta.'; end if;
 if trim(coalesce(v.email,''))='' or lower(trim(v.email))<>lower(trim(p_email)) then raise exception 'El correo no coincide con el registrado en la ficha.'; end if;
 v_phone:=regexp_replace(coalesce(v.telefono,''),'[^0-9A-Za-z]','','g');
 if length(v_check)<4 or not(v_check=v_phone or right(v_phone,4)=right(v_check,4)) then raise exception 'El teléfono de verificación no coincide.'; end if;
 perform set_config('app.member_claim','allowed',true);
 update public.socios set auth_user_id=p_auth_user_id,cuenta_activada=false,access_status=case when exists(select 1 from auth.users au where au.id=p_auth_user_id and au.invited_at is not null) then 'invitado' else 'pendiente_confirmacion' end,updated_at=now() where id=v.id;
 insert into public.member_account_events(socio_id,auth_user_id,evento,detalle) values(v.id,p_auth_user_id,'cuenta_vinculada_17_1',jsonb_build_object('email',p_email));
 return v.id;
end;$$;

-- Se ejecuta después de crear un usuario mediante activación propia o invitación.
create or replace function public.handle_member_auth_created()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare n integer; v text; sid uuid;
begin
 n:=nullif(new.raw_user_meta_data->>'member_number','')::integer;
 v:=new.raw_user_meta_data->>'member_verification';
 if n is not null and v is not null then
   sid:=public.link_member_identity(new.id,new.email,n,v);
 end if;
 return new;
exception when others then
 raise exception 'No se pudo vincular la ficha de socio: %',sqlerrm;
end;$$;

drop trigger if exists trg_link_member_auth_created on auth.users;
create trigger trg_link_member_auth_created after insert on auth.users for each row execute function public.handle_member_auth_created();

create or replace function public.complete_member_link()
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare u auth.users%rowtype; sid uuid; n integer; v text;
begin
 if auth.uid() is null then raise exception 'No hay una sesión iniciada.'; end if;
 select * into u from auth.users where id=auth.uid();
 if exists(select 1 from public.socios where auth_user_id=auth.uid()) then
   update public.socios set last_access_at=now(),access_status='activo',cuenta_activada=true where auth_user_id=auth.uid();
   return jsonb_build_object('ok',true,'already_linked',true);
 end if;
 n:=nullif(u.raw_user_meta_data->>'member_number','')::integer; v:=u.raw_user_meta_data->>'member_verification';
 if n is null or v is null then raise exception 'Esta cuenta no contiene los datos necesarios para vincularla. Contacta con la directiva.'; end if;
 sid:=public.link_member_identity(u.id,u.email,n,v);
 update public.socios set last_access_at=now() where id=sid;
 return jsonb_build_object('ok',true,'socio_id',sid);
end;$$;
grant execute on function public.complete_member_link() to authenticated;

-- Permite a la directiva vincular un usuario Auth ya existente usando el mismo correo.
create or replace function public.admin_link_existing_auth_user(p_socio_id uuid)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare s public.socios%rowtype; u auth.users%rowtype;
begin
 if not public.has_management_role() then raise exception 'Acceso reservado a la directiva autorizada.'; end if;
 select * into s from public.socios where id=p_socio_id for update;
 if s.id is null then raise exception 'Socio no encontrado.'; end if;
 if trim(coalesce(s.email,''))='' then raise exception 'El socio no tiene correo registrado.'; end if;
 select * into u from auth.users where lower(email)=lower(trim(s.email)) order by created_at desc limit 1;
 if u.id is null then raise exception 'No existe ningún usuario de Authentication con ese correo.'; end if;
 if exists(select 1 from public.socios where auth_user_id=u.id and id<>s.id) then raise exception 'Ese usuario ya está vinculado con otro socio.'; end if;
 perform set_config('app.member_claim','allowed',true);
 update public.socios set auth_user_id=u.id,cuenta_activada=(u.email_confirmed_at is not null),access_status=case when u.email_confirmed_at is not null then 'activo' when u.invited_at is not null then 'invitado' else 'pendiente_confirmacion' end,activated_at=case when u.email_confirmed_at is not null then coalesce(activated_at,u.email_confirmed_at) else activated_at end,updated_at=now() where id=s.id;
 insert into public.member_account_events(socio_id,auth_user_id,evento,detalle) values(s.id,u.id,'usuario_existente_vinculado_17_1',jsonb_build_object('email',u.email));
 return jsonb_build_object('ok',true,'auth_user_id',u.id,'confirmed',u.email_confirmed_at is not null);
end;$$;
grant execute on function public.admin_link_existing_auth_user(uuid) to authenticated;

-- Estado resumido para la directiva.
create or replace function public.member_access_summary(p_socio_id uuid)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare s public.socios%rowtype; u auth.users%rowtype;
begin
 if not public.is_active_admin() then raise exception 'Acceso reservado a la directiva.'; end if;
 select * into s from public.socios where id=p_socio_id;
 if s.id is null then raise exception 'Socio no encontrado.'; end if;
 if s.auth_user_id is not null then select * into u from auth.users where id=s.auth_user_id; end if;
 return jsonb_build_object('status',s.access_status,'email',s.email,'invited_at',s.invited_at,'activated_at',s.activated_at,'last_access_at',coalesce(u.last_sign_in_at,s.last_access_at),'confirmed_at',u.email_confirmed_at,'auth_user_id',s.auth_user_id);
end;$$;
grant execute on function public.member_access_summary(uuid) to authenticated;

commit;
