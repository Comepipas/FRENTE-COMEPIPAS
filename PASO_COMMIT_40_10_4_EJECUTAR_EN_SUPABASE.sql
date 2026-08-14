-- FRENTE COMEPIPAS - COMMIT 40.10.4
-- Ejecutar una sola vez en Supabase > SQL Editor > New query > Run.

create or replace function public.on_tour_normalize(v text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    translate(
      upper(coalesce(v, '')),
      'ÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇ',
      'AAAAAAEEEEIIIIOOOOOUUUUNC'
    ),
    '[^A-Z0-9]',
    '',
    'g'
  )
$$;

comment on function public.on_tour_normalize(text) is
  'Normaliza DNI, numero de abonado y nombres sin perder letras por tildes; ON TOUR 40.10.4.';
