-- V13.3.0 · Arquitectura de socios
-- Esta migración ya fue ejecutada durante el desarrollo. Se conserva en el proyecto como historial.

-- Objetos esperados:
-- public.member_history
-- public.member_guardians
-- public.registrar_historial_socio()
-- public.impedir_borrado_fisico_socio()
-- triggers trg_socios_historial y trg_socios_impedir_delete

select table_name from information_schema.tables
where table_schema='public' and table_name in ('member_history','member_guardians')
order by table_name;
