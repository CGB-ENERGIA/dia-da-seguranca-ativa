-- TESTE · libera lançamentos do app em 24/11/2026 (terça-feira) para validar o registro em campo.
-- SQL Editor > New query > cole tudo > Run.
-- Para DESFAZER depois do teste: rode novamente supabase/regras-quarta.sql (recoloca "só quartas-feiras").

create or replace function public.dsa_validar_registro() returns trigger
language plpgsql as $$
declare
  agora_local timestamp := (now() at time zone 'America/Fortaleza');
  ts_local timestamp;
begin
  if new.origem = 'app' then
    if extract(dow from new.data) <> 3 and new.data <> date '2026-11-24' then   -- 24/11/2026: dia de teste liberado
      raise exception 'Lançamentos só são aceitos nas quartas-feiras';
    end if;
    ts_local := (new.data::text || ' ' || new.hora)::timestamp;
    if ts_local > agora_local + interval '10 minutes' then
      raise exception 'Data/hora do lançamento está no futuro';
    end if;
    if ts_local < agora_local - interval '4 days' then
      raise exception 'Lançamento enviado depois do prazo (4 dias)';
    end if;
    if new.foto_path is null or new.lat is null or new.lon is null then
      raise exception 'Foto e localização são obrigatórias';
    end if;
    if new.fotos is not null and array_length(new.fotos, 1) > 5 then
      raise exception 'No máximo 5 fotos por lançamento';
    end if;
  end if;
  return new;
end $$;
