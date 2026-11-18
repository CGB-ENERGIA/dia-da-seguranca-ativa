-- Dia da Segurança Ativa · regras que o BANCO impõe (não dependem do aplicativo nem do relógio do celular).
-- SQL Editor > New query > cole tudo > Run. Pode rodar mais de uma vez.
--
-- O que passa a valer para lançamentos feitos pelo app (origem = 'app'):
--   1. só em quarta-feira (data do lançamento);
--   2. data/hora não pode estar no futuro, nem mais de 4 dias no passado (cobre envio atrasado de quem estava sem sinal);
--   3. foto e localização (lat/lon) obrigatórias;
--   4. a chave pública (anon) só consegue inserir com origem = 'app' — não dá mais para gravar "histórico" pela API.
-- Cargas de histórico passam a ser feitas aqui no SQL Editor (que ignora essas regras).

alter table public.dsa_registros add column if not exists origem text not null default 'historico';

create or replace function public.dsa_validar_registro() returns trigger
language plpgsql as $$
declare
  agora_local timestamp := (now() at time zone 'America/Fortaleza');
  ts_local timestamp;
begin
  if new.origem = 'app' then
    if extract(dow from new.data) <> 3 then
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
  end if;
  return new;
end $$;

drop trigger if exists dsa_validar_registro on public.dsa_registros;
create trigger dsa_validar_registro before insert on public.dsa_registros
  for each row execute function public.dsa_validar_registro();

-- a chave anon só insere registros do app
drop policy if exists "dsa inserir registros" on public.dsa_registros;
create policy "dsa inserir registros" on public.dsa_registros for insert to anon with check (origem = 'app');
