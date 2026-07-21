-- V22 Commit 11: métodos de pago configurables y registro completo de cobros
create table if not exists public.metodos_pago_renovacion (codigo text primary key,nombre text not null,activo boolean not null default false,predeterminado boolean not null default false,orden integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
insert into public.metodos_pago_renovacion (codigo,nombre,activo,predeterminado,orden) values ('tarjeta','Pago con tarjeta',true,true,1),('transferencia','Transferencia bancaria',true,false,2),('ingreso_cuenta','Ingreso en cuenta',true,false,3),('bizum','Bizum',false,false,4),('efectivo','Efectivo',false,false,5),('tpv','TPV presencial',false,false,6),('otro','Otro',false,false,7) on conflict (codigo) do nothing;
alter table public.renovaciones add column if not exists importe_pagado numeric(10,2) not null default 0;
alter table public.renovaciones add column if not exists pagado boolean not null default false;
alter table public.renovaciones add column if not exists metodo_pago text;
alter table public.renovaciones add column if not exists referencia_pago text;
alter table public.renovaciones add column if not exists notas_pago text;
alter table public.renovaciones add column if not exists fecha_pago date;
alter table public.metodos_pago_renovacion enable row level security;
drop policy if exists "commit11 authenticated read payment methods" on public.metodos_pago_renovacion;drop policy if exists "commit11 directors manage payment methods" on public.metodos_pago_renovacion;
create policy "commit11 authenticated read payment methods" on public.metodos_pago_renovacion for select to authenticated using (true);
create policy "commit11 directors manage payment methods" on public.metodos_pago_renovacion for all to authenticated using (public.es_directivo()) with check (public.es_directivo());
