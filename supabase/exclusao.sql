-- Dia da Segurança Ativa · exclusão de registros pela aba "Banco de dados" do relatório.
-- A chave pública do site NÃO recebe permissão de apagar: a exclusão passa por uma função que confere
-- usuário e senha de administrador NO SERVIDOR (bcrypt). Rode no SQL Editor; pode repetir.
-- Depois rode também o arquivo supabase/exclusao-senha.sql (gerado localmente por `bun run sql:admin`) para cadastrar a senha.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.dsa_admin (
  usuario text primary key,
  hash    text not null
);
alter table public.dsa_admin enable row level security;   -- sem políticas: a chave pública não lê nem grava
revoke all on public.dsa_admin from anon, authenticated;

create table if not exists public.dsa_exclusoes (        -- trilha de auditoria de tudo que foi apagado
  id         bigint generated always as identity primary key,
  em         timestamptz not null default now(),
  usuario    text not null,
  registro   jsonb not null
);
alter table public.dsa_exclusoes enable row level security;
revoke all on public.dsa_exclusoes from anon, authenticated;

create or replace function public.dsa_excluir_registros(p_usuario text, p_senha text, p_ids uuid[])
returns integer
language plpgsql security definer
set search_path = public, extensions
as $$
declare n integer;
begin
  if not exists (select 1 from public.dsa_admin a where a.usuario = lower(p_usuario) and a.hash = crypt(p_senha, a.hash)) then
    perform pg_sleep(2);                                  -- freia tentativa de adivinhar a senha
    raise exception 'Usuário ou senha incorretos';
  end if;
  insert into public.dsa_exclusoes (usuario, registro)
    select lower(p_usuario), to_jsonb(r) from public.dsa_registros r where r.id = any(p_ids);
  delete from public.dsa_registros where id = any(p_ids);
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.dsa_excluir_registros(text, text, uuid[]) from public;
grant execute on function public.dsa_excluir_registros(text, text, uuid[]) to anon;
