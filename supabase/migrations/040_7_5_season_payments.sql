-- Commit 40.7.5: revisión económica por temporada y declaración de pago directo al club.
-- No elimina socios, cuentas, cuotas, familias ni históricos.

alter table public.campanas_registros
  add column if not exists pago_club_declarado_at timestamptz,
  add column if not exists pago_club_verificado_at timestamptz;

alter table public.campanas_registros drop constraint if exists campanas_registros_forma_pago_check;
alter table public.campanas_registros add constraint campanas_registros_forma_pago_check
  check (forma_pago is null or forma_pago in ('transferencia','tarjeta','efectivo','club','pago_online'));

-- Aplica a cada registro la cuota configurada para su categoría y temporada.
update public.campanas_registros r
set cuota_base=coalesce(c.cuota,0),
    cuota_final=case when coalesce(r.es_directivo,s.es_directivo,false) then 0 else coalesce(c.cuota,0) end,
    categoria_pena=coalesce(nullif(r.categoria_pena,''),s.categoria),
    updated_at=now()
from public.socios s, public.campanas_categorias c
where r.socio_id=s.id
  and c.campana_id=r.campana_id
  and lower(c.nombre)=case when coalesce(r.es_directivo,s.es_directivo,false) then 'directivo' else lower(s.categoria) end
  and c.activa=true;

create or replace function public.commit4075_sync_record_fee()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_category text; v_director boolean; v_fee numeric(10,2);
begin
  select lower(categoria),coalesce(es_directivo,false) into v_category,v_director
  from socios where id=new.socio_id;
  if v_director then v_category:='directivo'; end if;
  select cuota into v_fee from campanas_categorias
  where campana_id=new.campana_id and activa=true and lower(nombre)=v_category
  order by orden limit 1;
  if v_fee is not null then
    new.categoria_pena:=v_category;
    new.cuota_base:=v_fee;
    new.cuota_final:=case when v_director then 0 else v_fee end;
  end if;
  return new;
end $$;

drop trigger if exists commit4075_sync_record_fee on public.campanas_registros;
create trigger commit4075_sync_record_fee
before insert or update of socio_id,campana_id,categoria_pena
on public.campanas_registros for each row execute function public.commit4075_sync_record_fee();

create or replace function public.commit4075_member_category_changed()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  update campanas_registros
  set categoria_pena=case when coalesce(new.es_directivo,false) then 'directivo' else lower(new.categoria) end
  where socio_id=new.id;
  return new;
end $$;
drop trigger if exists commit4075_member_category_changed on public.socios;
create trigger commit4075_member_category_changed
after update of fecha_nacimiento,es_directivo,categoria
on public.socios for each row execute function public.commit4075_member_category_changed();

create or replace function public.commit4075_refresh_campaign_fees(p_campaign uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  if not public.c402_is_admin() then raise exception 'Acceso reservado a administradores'; end if;
  update campanas_registros r
  set categoria_pena=case when coalesce(r.es_directivo,s.es_directivo,false) then 'directivo' else lower(s.categoria) end,
      cuota_base=c.cuota,
      cuota_final=case when coalesce(r.es_directivo,s.es_directivo,false) then 0 else c.cuota end,
      updated_at=now()
  from socios s, campanas_categorias c
  where r.campana_id=p_campaign and r.socio_id=s.id and c.campana_id=r.campana_id and c.activa=true
    and lower(c.nombre)=case when coalesce(r.es_directivo,s.es_directivo,false) then 'directivo' else lower(s.categoria) end;
  get diagnostics v_count=row_count;
  return v_count;
end $$;
grant execute on function public.commit4075_refresh_campaign_fees(uuid) to authenticated;

notify pgrst, 'reload schema';
