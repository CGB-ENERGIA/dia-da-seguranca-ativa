-- Dia da Segurança Ativa · usuários, senhas e níveis de acesso (tudo conferido NO SERVIDOR; senha guardada só como hash bcrypt).
-- SQL Editor > New query > cole tudo > Run. Pode rodar mais de uma vez.
-- Depois rode supabase/usuarios-seed.sql (gerado localmente por `bun run sql:usuarios`) para carregar os usuários da planilha.
--
-- Níveis:  admin     = tudo (relatório, configurações, banco de dados com exclusão, usuários)
--          gestor    = relatório + configurações + banco de dados (somente leitura)
--          consulta  = relatório (painel, insights, colaboradores, equipes)
--          observador= apenas o registro de ações (não abre o relatório)

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.dsa_usuarios (
  usuario        text primary key,                       -- sempre minúsculo, ex.: @marcusqueiros
  chapa          integer,
  nome           text not null,
  funcao         text,
  base           text,
  processo       text,
  gerencia       text,
  nivel          text not null default 'observador' check (nivel in ('admin', 'gestor', 'consulta', 'observador')),
  ativo          boolean not null default true,
  trocar_senha   boolean not null default true,          -- obriga a redefinir a senha no próximo acesso
  hash           text not null,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
alter table public.dsa_usuarios add column if not exists trocar_senha boolean not null default true;
create index if not exists dsa_usuarios_chapa_idx on public.dsa_usuarios (chapa);
alter table public.dsa_usuarios enable row level security;     -- sem políticas: a chave pública não lê nem grava direto
revoke all on public.dsa_usuarios from anon, authenticated;

-- ───────── funções internas ─────────
create or replace function public.dsa__autenticar(p_usuario text, p_senha text)
returns public.dsa_usuarios
language plpgsql security definer set search_path = public, extensions as $$
declare u public.dsa_usuarios;
begin
  select * into u from public.dsa_usuarios where usuario = lower(trim(p_usuario)) and ativo;
  if not found or u.hash <> crypt(coalesce(p_senha, ''), u.hash) then
    perform pg_sleep(2);                                   -- freia tentativa de adivinhar senha
    raise exception 'Usuário ou senha incorretos';
  end if;
  return u;
end $$;
revoke all on function public.dsa__autenticar(text, text) from public, anon, authenticated;

create or replace function public.dsa__perfil(u public.dsa_usuarios) returns jsonb
language sql immutable as $$
  select jsonb_build_object('usuario', u.usuario, 'nome', u.nome, 'chapa', u.chapa, 'funcao', u.funcao,
                            'base', u.base, 'processo', u.processo, 'gerencia', u.gerencia, 'nivel', u.nivel, 'ativo', u.ativo, 'trocar_senha', u.trocar_senha)
$$;
revoke all on function public.dsa__perfil(public.dsa_usuarios) from public, anon, authenticated;

create or replace function public.dsa__exigir_admin(p_usuario text, p_senha text)
returns public.dsa_usuarios
language plpgsql security definer set search_path = public, extensions as $$
declare u public.dsa_usuarios;
begin
  u := public.dsa__autenticar(p_usuario, p_senha);
  if u.trocar_senha then raise exception 'Redefina sua senha antes de continuar'; end if;
  if u.nivel <> 'admin' then raise exception 'Acesso restrito ao administrador'; end if;
  return u;
end $$;
revoke all on function public.dsa__exigir_admin(text, text) from public, anon, authenticated;

create or replace function public.dsa__garantir_admin() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.dsa_usuarios where nivel = 'admin' and ativo) then
    raise exception 'Deve existir ao menos um administrador ativo';
  end if;
end $$;
revoke all on function public.dsa__garantir_admin() from public, anon, authenticated;

-- ───────── funções públicas (chamadas pelo aplicativo) ─────────
create or replace function public.dsa_login(p_usuario text, p_senha text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  return public.dsa__perfil(public.dsa__autenticar(p_usuario, p_senha));
end $$;

create or replace function public.dsa_login_chapa(p_chapa integer, p_senha text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v text;
begin
  select usuario into v from public.dsa_usuarios where chapa = p_chapa and ativo order by usuario limit 1;
  if v is null then perform pg_sleep(2); raise exception 'Usuário ou senha incorretos'; end if;
  return public.dsa__perfil(public.dsa__autenticar(v, p_senha));
end $$;

-- lista de nomes para o autocomplete do login do registro (sem usuário, senha ou nível)
create or replace function public.dsa_usuarios_publicos() returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('chapa', chapa, 'nome', nome, 'funcao', funcao, 'base', base) order by nome), '[]'::jsonb)
  from public.dsa_usuarios where ativo and chapa is not null
$$;

create or replace function public.dsa_alterar_senha(p_usuario text, p_senha_atual text, p_senha_nova text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare u public.dsa_usuarios;
begin
  u := public.dsa__autenticar(p_usuario, p_senha_atual);
  if length(coalesce(p_senha_nova, '')) < 6 then raise exception 'A nova senha precisa ter ao menos 6 caracteres'; end if;
  if p_senha_nova = p_senha_atual then raise exception 'A nova senha deve ser diferente da atual'; end if;
  update public.dsa_usuarios set hash = crypt(p_senha_nova, gen_salt('bf')), trocar_senha = false, atualizado_em = now() where usuario = u.usuario;
  return true;
end $$;

create or replace function public.dsa_usuarios_listar(p_admin text, p_senha text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.dsa__exigir_admin(p_admin, p_senha);
  return coalesce((select jsonb_agg(public.dsa__perfil(u) order by u.nome) from public.dsa_usuarios u), '[]'::jsonb);
end $$;

-- cria (p_anterior nulo) ou edita (p_anterior = usuário atual; permite trocar o próprio usuário). Senha nova opcional na edição.
create or replace function public.dsa_usuario_salvar(
  p_admin text, p_senha text, p_usuario text, p_anterior text, p_nome text, p_chapa integer, p_funcao text,
  p_base text, p_processo text, p_gerencia text, p_nivel text, p_ativo boolean, p_nova_senha text
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare novo text := lower(trim(p_usuario)); r public.dsa_usuarios;
begin
  perform public.dsa__exigir_admin(p_admin, p_senha);
  if novo = '' or p_nome is null or trim(p_nome) = '' then raise exception 'Informe usuário e nome'; end if;
  if p_nivel not in ('admin', 'gestor', 'consulta', 'observador') then raise exception 'Nível de acesso inválido'; end if;
  if p_anterior is null then
    if length(coalesce(p_nova_senha, '')) < 6 then raise exception 'A senha precisa ter ao menos 6 caracteres'; end if;
    if exists (select 1 from public.dsa_usuarios where usuario = novo) then raise exception 'Já existe um usuário com esse login'; end if;
    insert into public.dsa_usuarios (usuario, chapa, nome, funcao, base, processo, gerencia, nivel, ativo, hash)
      values (novo, p_chapa, trim(p_nome), p_funcao, p_base, p_processo, p_gerencia, p_nivel, coalesce(p_ativo, true), crypt(p_nova_senha, gen_salt('bf')))
      returning * into r;
  else
    if novo <> lower(trim(p_anterior)) and exists (select 1 from public.dsa_usuarios where usuario = novo) then
      raise exception 'Já existe um usuário com esse login';
    end if;
    update public.dsa_usuarios set usuario = novo, chapa = p_chapa, nome = trim(p_nome), funcao = p_funcao, base = p_base,
      processo = p_processo, gerencia = p_gerencia, nivel = p_nivel, ativo = coalesce(p_ativo, true), atualizado_em = now(),
      hash = case when coalesce(p_nova_senha, '') <> '' then crypt(p_nova_senha, gen_salt('bf')) else hash end,
      trocar_senha = case when coalesce(p_nova_senha, '') <> '' then true else trocar_senha end   -- senha definida pelo admin: a pessoa redefine no próximo acesso
      where usuario = lower(trim(p_anterior)) returning * into r;
    if not found then raise exception 'Usuário não encontrado'; end if;
    if coalesce(p_nova_senha, '') <> '' and length(p_nova_senha) < 6 then raise exception 'A senha precisa ter ao menos 6 caracteres'; end if;
  end if;
  perform public.dsa__garantir_admin();                    -- se violar, a transação inteira é desfeita
  return public.dsa__perfil(r);
end $$;

create or replace function public.dsa_usuario_excluir(p_admin text, p_senha text, p_usuario text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare a public.dsa_usuarios;
begin
  a := public.dsa__exigir_admin(p_admin, p_senha);
  if lower(trim(p_usuario)) = a.usuario then raise exception 'Você não pode excluir o próprio usuário'; end if;
  delete from public.dsa_usuarios where usuario = lower(trim(p_usuario));
  perform public.dsa__garantir_admin();
  return true;
end $$;

-- a exclusão de registros (aba Banco de dados) agora exige um usuário admin desta tabela
create table if not exists public.dsa_exclusoes (id bigint generated always as identity primary key, em timestamptz not null default now(), usuario text not null, registro jsonb not null);
alter table public.dsa_exclusoes enable row level security;
revoke all on public.dsa_exclusoes from anon, authenticated;

create or replace function public.dsa_excluir_registros(p_usuario text, p_senha text, p_ids uuid[]) returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare a public.dsa_usuarios; n integer;
begin
  a := public.dsa__exigir_admin(p_usuario, p_senha);
  insert into public.dsa_exclusoes (usuario, registro) select a.usuario, to_jsonb(r) from public.dsa_registros r where r.id = any(p_ids);
  delete from public.dsa_registros where id = any(p_ids);
  get diagnostics n = row_count;
  return n;
end $$;

-- permissões de execução (só estas ficam acessíveis à chave pública)
revoke all on function public.dsa_login(text, text), public.dsa_login_chapa(integer, text), public.dsa_usuarios_publicos(),
  public.dsa_alterar_senha(text, text, text), public.dsa_usuarios_listar(text, text),
  public.dsa_usuario_salvar(text, text, text, text, text, integer, text, text, text, text, text, boolean, text),
  public.dsa_usuario_excluir(text, text, text), public.dsa_excluir_registros(text, text, uuid[]) from public;
grant execute on function public.dsa_login(text, text), public.dsa_login_chapa(integer, text), public.dsa_usuarios_publicos(),
  public.dsa_alterar_senha(text, text, text), public.dsa_usuarios_listar(text, text),
  public.dsa_usuario_salvar(text, text, text, text, text, integer, text, text, text, text, text, boolean, text),
  public.dsa_usuario_excluir(text, text, text), public.dsa_excluir_registros(text, text, uuid[]) to anon;
