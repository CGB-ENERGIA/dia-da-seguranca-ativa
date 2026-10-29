-- Dia da Segurança Ativa · esquema para o Supabase (SQL Editor > New query > Run)

create table if not exists public.registros (
  id         uuid primary key,
  chapa      integer not null,
  equipe     text    not null,
  acao       text    not null check (acao in
             ('BLITZ','DDS/DSS','INSPEÇÃO DE FERRAMENTAS','INSPEÇÃO EPI/EPC','INSPEÇÃO VEICULAR','TREINAMENTO')),
  data       date    not null,
  hora       text    not null,
  lat        double precision,
  lon        double precision,
  local      text,
  foto_path  text,
  criado_em  timestamptz not null default now()
);
create index if not exists registros_data_idx  on public.registros (data);
create index if not exists registros_chapa_idx on public.registros (chapa);

-- Regra de negócio: só quartas-feiras (a data é a do aparelho em America/Fortaleza; SESMT pode liberar fora da quarta
-- inserindo via painel do Supabase). Descomente para travar no banco:
-- alter table public.registros add constraint so_quarta check (extract(dow from data) in (3,4,5));

alter table public.registros enable row level security;
-- Sem login por usuário (acesso por matrícula): a chave anon pode inserir e ler.
-- Para endurecer, troque por Supabase Auth / uma Edge Function que valide a matrícula.
create policy "inserir" on public.registros for insert to anon with check (true);
create policy "ler"     on public.registros for select to anon using (true);

-- Fotos carimbadas
insert into storage.buckets (id, name, public) values ('evidencias', 'evidencias', false)
  on conflict (id) do nothing;
create policy "enviar fotos" on storage.objects for insert to anon with check (bucket_id = 'evidencias');
create policy "ler fotos"    on storage.objects for select to anon using (bucket_id = 'evidencias');

-- Cadastro de colaboradores (opcional). Se o seu projeto já tem uma tabela de colaboradores,
-- ignore este bloco e aponte o app para ela (campos usados: chapa, nome, funcao, base, processo, gerencia, situacao).
create table if not exists public.colaboradores (
  chapa    integer primary key,
  nome     text not null,
  funcao   text,
  base     text,
  processo text,
  gerencia text,
  situacao text
);
alter table public.colaboradores enable row level security;
create policy "ler colaboradores" on public.colaboradores for select to anon using (true);
