-- COMMIT 40.10.10
-- Corrige la validacion de socios activos cuando socios.estado es un enum.
-- No modifica datos existentes.

do $$
declare
  fn text;
begin
  select pg_get_functiondef(
    'public.create_on_tour_request(uuid,jsonb,jsonb,text,boolean)'::regprocedure
  ) into fn;

  if position('coalesce(estado,'''')' in fn) = 0 then
    raise exception 'No se encontro la version 40.10.9 de create_on_tour_request';
  end if;

  fn := replace(
    fn,
    'coalesce(estado,'''')',
    'coalesce(estado::text,'''')'
  );

  execute fn;
end;
$$;

grant execute on function public.create_on_tour_request(uuid,jsonb,jsonb,text,boolean) to authenticated;

