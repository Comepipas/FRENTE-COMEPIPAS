-- COMMIT 40.10.4
-- Corrige la verificacion privada de nombres en ON TOUR cuando existen
-- tildes, dieresis, eñe, guiones, puntos o diferencias de espacios/mayusculas.
-- El DNI completo (incluida su letra) sigue siendo obligatorio y se compara.

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
