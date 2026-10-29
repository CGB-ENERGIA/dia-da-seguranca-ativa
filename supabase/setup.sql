-- Dia da Segurança Ativa · criação das tabelas (prefixo dsa_, não mexe em nenhuma tabela existente)
-- SQL Editor > New query > cole tudo > Run. Pode rodar mais de uma vez.

-- ───────── colaboradores ─────────
create table if not exists public.dsa_colaboradores (
  chapa      integer primary key,
  nome       text not null,
  nome_curto text,
  funcao     text,
  base       text,
  processo   text,
  gerencia   text,
  grupo      text,
  gerente    text,
  situacao   text default 'ATIVO',
  lider      boolean default false
);

-- ───────── registros (ações lançadas no app) ─────────
create table if not exists public.dsa_registros (
  id         uuid primary key,
  chapa      integer not null,
  equipe     text not null,
  acao       text not null,
  data       date not null,
  hora       text not null,
  lat        double precision,
  lon        double precision,
  local      text,
  foto_path  text,
  criado_em  timestamptz not null default now()
);
create index if not exists dsa_registros_data_idx  on public.dsa_registros (data);
create index if not exists dsa_registros_chapa_idx on public.dsa_registros (chapa);

-- ───────── configurações (meta e edições do cadastro) ─────────
create table if not exists public.dsa_config (
  chave text primary key,
  valor jsonb not null
);

-- ───────── permissões ─────────
alter table public.dsa_colaboradores enable row level security;
alter table public.dsa_registros     enable row level security;
alter table public.dsa_config        enable row level security;

grant usage on schema public to anon;
grant select on public.dsa_colaboradores to anon;
grant select, insert on public.dsa_registros to anon;
grant select, insert, update on public.dsa_config to anon;

drop policy if exists "dsa ler colaboradores" on public.dsa_colaboradores;
create policy "dsa ler colaboradores" on public.dsa_colaboradores for select to anon using (true);

drop policy if exists "dsa ler registros" on public.dsa_registros;
drop policy if exists "dsa inserir registros" on public.dsa_registros;
create policy "dsa ler registros"     on public.dsa_registros for select to anon using (true);
create policy "dsa inserir registros" on public.dsa_registros for insert to anon with check (true);

drop policy if exists "dsa ler config" on public.dsa_config;
drop policy if exists "dsa gravar config" on public.dsa_config;
drop policy if exists "dsa alterar config" on public.dsa_config;
create policy "dsa ler config"     on public.dsa_config for select to anon using (true);
create policy "dsa gravar config"  on public.dsa_config for insert to anon with check (true);
create policy "dsa alterar config" on public.dsa_config for update to anon using (true) with check (true);

-- ───────── fotos carimbadas ─────────
insert into storage.buckets (id, name, public) values ('dsa-evidencias', 'dsa-evidencias', false)
  on conflict (id) do nothing;
drop policy if exists "dsa enviar fotos" on storage.objects;
drop policy if exists "dsa ler fotos" on storage.objects;
create policy "dsa enviar fotos" on storage.objects for insert to anon with check (bucket_id = 'dsa-evidencias');
create policy "dsa ler fotos"    on storage.objects for select to anon using (bucket_id = 'dsa-evidencias');
