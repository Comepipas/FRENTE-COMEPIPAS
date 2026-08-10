-- Commit 40.7: categorías automáticas del censo a partir de las reglas de campaña.
-- No elimina datos, cuentas ni históricos.

create or replace function public.commit407_category_for_birth(
  p_campaign uuid,
  p_birth date,
  p_director boolean default false
) returns text
language sql stable set search_path=public as $$
  select lower(c.nombre)
  from public.campanas_categorias c
  where c.campana_id=p_campaign
    and c.activa=true
    and (
      (coalesce(p_director,false)=true and lower(c.nombre)='directivo')
      or
      (coalesce(p_director,false)=false and lower(c.nombre)<>'directivo'
       and p_birth is not null
       and c.nacimiento_desde is not null and c.nacimiento_hasta is not null
       and p_birth between c.nacimiento_desde and c.nacimiento_hasta)
    )
  order by case when lower(c.nombre)='directivo' then 0 else c.orden end
  limit 1;
$$;

create or replace function public.commit407_current_rules_campaign()
returns uuid
language sql stable set search_path=public as $$
  select c.id
  from public.campanas_abonados c
  where c.tipo<>'piloto' and coalesce(c.modo_pruebas,false)=false
    and c.estado in ('abierta','revision','borrador','historica','cerrada')
  order by
    case c.estado when 'abierta' then 0 when 'revision' then 1 when 'borrador' then 2 else 3 end,
    c.temporada desc,
    c.updated_at desc nulls last
  limit 1;
$$;

create or replace function public.commit407_sync_one_member_category()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_campaign uuid; v_category text;
begin
  v_campaign:=public.commit407_current_rules_campaign();
  if v_campaign is not null then
    v_category:=public.commit407_category_for_birth(v_campaign,new.fecha_nacimiento,coalesce(new.es_directivo,false));
    if v_category is not null then new.categoria:=v_category; end if;
  end if;
  return new;
end $$;

drop trigger if exists commit407_sync_member_category on public.socios;
create trigger commit407_sync_member_category
before insert or update of fecha_nacimiento,es_directivo
on public.socios for each row execute function public.commit407_sync_one_member_category();

create or replace function public.commit407_refresh_census_categories(p_campaign uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_campaign uuid; v_count integer;
begin
  if not public.c402_is_admin() then raise exception 'Acceso reservado a administradores'; end if;
  v_campaign:=coalesce(p_campaign,public.commit407_current_rules_campaign());
  if v_campaign is null then raise exception 'No existe una campaña real con reglas de categoría'; end if;
  update public.socios s
  set categoria=public.commit407_category_for_birth(v_campaign,s.fecha_nacimiento,coalesce(s.es_directivo,false)),
      updated_at=now()
  where coalesce(s.es_registro_prueba,false)=false
    and public.commit407_category_for_birth(v_campaign,s.fecha_nacimiento,coalesce(s.es_directivo,false)) is not null;
  get diagnostics v_count=row_count;
  return jsonb_build_object('ok',true,'campaign_id',v_campaign,'updated',v_count);
end $$;
grant execute on function public.commit407_refresh_census_categories(uuid) to authenticated;

-- Aplica una primera sincronización solo si ya existe una campaña real utilizable.
do $$
declare v_campaign uuid;
begin
  v_campaign:=public.commit407_current_rules_campaign();
  if v_campaign is not null then
    update public.socios s
    set categoria=public.commit407_category_for_birth(v_campaign,s.fecha_nacimiento,coalesce(s.es_directivo,false))
    where coalesce(s.es_registro_prueba,false)=false
      and public.commit407_category_for_birth(v_campaign,s.fecha_nacimiento,coalesce(s.es_directivo,false)) is not null;
  end if;
end $$;

comment on function public.commit407_refresh_census_categories(uuid) is
  'Recalcula la categoría visible del censo con los rangos de una campaña real; no modifica históricos.';
