-- V13.3.0 · Comprobación de RLS para el módulo de socios
-- Solo comprueba; no cambia permisos.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname='public' and tablename in ('socios','member_history','member_guardians');

select policyname, tablename, cmd, roles, qual, with_check
from pg_policies
where schemaname='public' and tablename in ('socios','member_history','member_guardians')
order by tablename, policyname;
