-- FRENTE COMEPIPAS · COMMIT 34.2
-- Normalización del censo, numeración de la Peña pendiente y limpieza segura de pruebas.
-- Ejecutar en Supabase > SQL Editor después de publicar los archivos del Commit 34.2.

begin;

-- 1) Adulto/adulto, Joven/joven e Infantil/infantil pasan a ser una sola categoría.
update public.socios
set categoria = case lower(trim(categoria))
  when 'adulto' then 'adulto'
  when 'joven' then 'joven'
  when 'infantil' then 'infantil'
  else nullif(lower(trim(categoria)), '')
end
where categoria is distinct from case lower(trim(categoria))
  when 'adulto' then 'adulto'
  when 'joven' then 'joven'
  when 'infantil' then 'infantil'
  else nullif(lower(trim(categoria)), '')
end;

-- 2) El número de socio de la Peña queda pendiente para todo el censo migrado.
-- El número de abonado del club permanece únicamente en numero_abonado_malaga.
update public.socios
set numero_socio = null,
    numero_socio_estado = 'pendiente',
    updated_at = now()
where migration_source in ('commit33','commit34_censo_pena')
   or numero_socio_estado = 'pendiente';

-- 3) Eliminar solo registros expresamente marcados como pruebas.
-- No se borran socios por nombre, correo o apariencia para evitar falsos positivos.
drop trigger if exists trg_socios_impedir_delete on public.socios;
delete from public.socios where es_registro_prueba is true;

-- Restaurar el bloqueo de borrado ordinario si existe la función del proyecto.
do $$
begin
 if to_regprocedure('public.impedir_borrado_socios()') is not null then
  execute 'create trigger trg_socios_impedir_delete before delete on public.socios for each row execute function public.impedir_borrado_socios()';
 elsif to_regprocedure('public.impedir_delete_socios()') is not null then
  execute 'create trigger trg_socios_impedir_delete before delete on public.socios for each row execute function public.impedir_delete_socios()';
 end if;
end $$;

commit;

-- COMPROBACIÓN FINAL
select
 count(*) filter (where es_registro_prueba is not true) as socios_oficiales,
 count(*) filter (where lower(trim(estado::text))='activo' and es_registro_prueba is not true) as activos,
 count(*) filter (where cuenta_activada is true and es_registro_prueba is not true) as cuentas_activadas,
 count(*) filter (where cuenta_activada is not true and es_registro_prueba is not true) as pendientes_activar,
 count(*) filter (where lower(trim(categoria))='infantil' and es_registro_prueba is not true) as infantiles,
 count(*) filter (where lower(trim(categoria))='joven' and es_registro_prueba is not true) as jovenes,
 count(*) filter (where lower(trim(categoria))='adulto' and es_registro_prueba is not true) as adultos,
 count(*) filter (where categoria is null and es_registro_prueba is not true) as sin_categoria,
 count(*) filter (where numero_socio is not null and es_registro_prueba is not true) as numeros_pena_asignados
from public.socios;
