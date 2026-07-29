-- COMMIT 33.3 · Corrección segura de parentescos familiares
-- Ejecutar una sola vez en Supabase SQL Editor.
begin;

-- Normaliza la restricción para que coincida con los valores usados por la aplicación.
alter table public.member_guardians drop constraint if exists member_guardians_parentesco_check;
alter table public.member_guardians add constraint member_guardians_parentesco_check
check (parentesco in ('padre','madre','tutor_legal'));

create or replace function public.commit33_link_guardians(p_links jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare x jsonb;mid uuid;gid uuid;n int:=0;rel text;
begin
 if not public.has_management_role() then raise exception 'No autorizado.';end if;
 for x in select * from jsonb_array_elements(p_links) loop
  select id into mid from public.socios where upper(regexp_replace(coalesce(dni,''),'[^A-Za-z0-9]','','g'))=upper(regexp_replace(x->>'minor_key','[^A-Za-z0-9]','','g')) or numero_abonado_malaga=x->>'minor_key' limit 1;
  select id into gid from public.socios where upper(regexp_replace(coalesce(dni,''),'[^A-Za-z0-9]','','g'))=upper(regexp_replace(x->>'guardian_key','[^A-Za-z0-9]','','g')) or numero_abonado_malaga=x->>'guardian_key' limit 1;
  rel:=lower(coalesce(nullif(x->>'parentesco',''),'tutor_legal'));
  if rel not in ('padre','madre','tutor_legal') then rel:='tutor_legal'; end if;
  if mid is not null and gid is not null and mid<>gid then
   insert into public.member_guardians(tutor_id,menor_id,parentesco,es_principal,activo) values(gid,mid,rel,true,true)
   on conflict do nothing;n:=n+1;
  end if;
 end loop;return jsonb_build_object('linked',n);
end $$;
grant execute on function public.commit33_link_guardians(jsonb) to authenticated;
commit;
