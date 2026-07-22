-- COMMIT 24.0 · Noticias publicadas desde el panel de administración
-- Ejecutar una sola vez en Supabase → SQL Editor.

create table if not exists public.news (
  id text primary key,
  titulo text not null,
  categoria text not null default 'Peña',
  fecha date not null default current_date,
  imagen text not null default 'temporada.jpg',
  destacada boolean not null default false,
  resumen text not null default '',
  contenido jsonb not null default '[]'::jsonb,
  estado text not null default 'Borrador' check (estado in ('Borrador','Publicada','Programada')),
  programada_para timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.news enable row level security;

drop policy if exists "news_public_read" on public.news;
create policy "news_public_read"
on public.news for select
to anon, authenticated
using (
  estado = 'Publicada'
  or (estado = 'Programada' and programada_para is not null and programada_para <= now())
  or public.c23_is_admin()
);

drop policy if exists "news_admin_insert" on public.news;
create policy "news_admin_insert"
on public.news for insert
to authenticated
with check (public.c23_is_admin());

drop policy if exists "news_admin_update" on public.news;
create policy "news_admin_update"
on public.news for update
to authenticated
using (public.c23_is_admin())
with check (public.c23_is_admin());

drop policy if exists "news_admin_delete" on public.news;
create policy "news_admin_delete"
on public.news for delete
to authenticated
using (public.c23_is_admin());

create index if not exists news_fecha_idx on public.news (fecha desc);
create index if not exists news_estado_idx on public.news (estado);
create index if not exists news_programada_idx on public.news (programada_para);

insert into public.news (id,titulo,categoria,fecha,imagen,destacada,resumen,contenido,estado)
values
('nueva-temporada','Nueva temporada, nuevas ilusiones','Peña','2026-07-01','temporada.jpg',true,'La peña comienza una nueva temporada con actividades, viajes y novedades.','["Arrancamos una nueva temporada con más ganas que nunca.","Durante los próximos meses iremos anunciando viajes, encuentros y actividades para todos los socios.","La web seguirá creciendo para convertirse en el centro de información de Frente Comepipas."]'::jsonb,'Publicada'),
('proximo-viaje','Reservas abiertas para el próximo viaje','Viajes','2026-07-05','viaje.jpg',false,'Ya puedes reservar tu plaza para el siguiente desplazamiento.','["La reserva está abierta para socios.","Las plazas son limitadas y se asignarán por orden de inscripción.","Consulta horarios, precio y disponibilidad en la sección de viajes."]'::jsonb,'Publicada'),
('renovacion-socios','Renovación de socios 2026/27','Socios','2026-07-08','socios.jpg',false,'Comienza el periodo de renovación de cuotas para la nueva temporada.','["Los socios ya pueden consultar su estado de cuota.","Más adelante se habilitará el pago online desde la zona privada.","Para cualquier duda puedes usar el formulario de contacto."]'::jsonb,'Publicada'),
('comida-pena','Próxima comida de la peña','Eventos','2026-07-12','evento.jpg',false,'Jornada de convivencia para socios, familiares y amigos.','["Celebraremos una nueva comida de convivencia.","La información definitiva se publicará cuando se confirme el lugar.","La inscripción podrá hacerse desde la web."]'::jsonb,'Publicada')
on conflict (id) do nothing;
