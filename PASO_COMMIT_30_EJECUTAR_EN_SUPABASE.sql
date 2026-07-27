-- FRENTE COMEPIPAS · COMMIT 30.0
-- Motor inteligente de renovaciones. Script incremental y seguro.

alter table if exists public.campanas_registros
  add column if not exists ajuste_individual numeric(10,2) not null default 0;

alter table if exists public.campanas_registros
  add column if not exists precio_esperado numeric(10,2);

alter table if exists public.campanas_registros
  add column if not exists diferencia_precio numeric(10,2);

create index if not exists idx_c30_registros_campana_estado
  on public.campanas_registros(campana_id, estado);

create index if not exists idx_c30_registros_campana_gestion
  on public.campanas_registros(campana_id, gestion_abono);

-- Inicializa la diferencia de los registros que ya tengan precio esperado.
update public.campanas_registros
set diferencia_precio = precio_abono - precio_esperado
where precio_esperado is not null;
