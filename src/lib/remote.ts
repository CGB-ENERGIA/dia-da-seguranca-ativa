import type { Reg } from "./types";
import { ACOES } from "./dates";

/**
 * Backend opcional (Supabase). Sem as variáveis abaixo o app funciona 100% local:
 * os lançamentos ficam no aparelho (IndexedDB) e a fila de envio espera o backend.
 * Esquema SQL em supabase/schema.sql.
 */
const BASE = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const remotoAtivo = Boolean(BASE && KEY);

const H = () => ({ apikey: KEY!, Authorization: `Bearer ${KEY}` });

/** Recusa definitiva do banco (regra de negócio ou permissão): não adianta tentar de novo. */
export class RegistroRecusado extends Error {}

export async function enviarReg(r: Reg, foto?: Blob) {
  let foto_path: string | null = null;
  if (foto && r.fotoId) {
    foto_path = `${r.d}/${r.chapa}-${r.fotoId}.jpg`;
    const up = await fetch(`${BASE}/storage/v1/object/dsa-evidencias/${foto_path}`, {
      method: "POST",
      headers: { ...H(), "Content-Type": "image/jpeg", "x-upsert": "true" },
      body: foto,
    });
    if (!up.ok) throw new Error(`upload ${up.status}`);
  }
  const corpo = {
    id: r.id, chapa: r.chapa, equipe: r.equipe, acao: ACOES[r.acao],
    data: r.d, hora: r.t, lat: r.lat ?? null, lon: r.lon ?? null, local: r.local ?? null, foto_path,
  };
  const enviar = (c: object) => fetch(`${BASE}/rest/v1/dsa_registros?on_conflict=id`, {
    method: "POST",
    headers: { ...H(), "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(c),
  });
  let res = await enviar({ ...corpo, origem: "app" });
  if (res.status === 400) {
    const txt = await res.clone().text();
    if (/origem/i.test(txt) && /(column|coluna)/i.test(txt)) res = await enviar(corpo); // banco ainda sem as regras de quarta-feira
  }
  if (!res.ok) {
    let msg = `registro ${res.status}`, code = "";
    try { const j = await res.json(); msg = j.message ?? msg; code = j.code ?? ""; } catch { /* sem corpo */ }
    if (code === "P0001" || code === "42501") throw new RegistroRecusado(msg);
    throw new Error(msg);
  }
}

export async function baixarRegs(): Promise<Reg[]> {
  const out: Reg[] = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${BASE}/rest/v1/dsa_registros?select=id,chapa,equipe,acao,data,hora,lat,lon,local,foto_path,origem,criado_em&order=data.asc`, {
      headers: { ...H(), Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`leitura ${res.status}`);
    const rows = (await res.json()) as any[];
    for (const x of rows)
      out.push({ id: x.id, d: x.data, t: String(x.hora).slice(0, 5), chapa: x.chapa, equipe: x.equipe,
        acao: Math.max(0, ACOES.indexOf(x.acao)), origem: "app", sync: "synced", lat: x.lat, lon: x.lon, local: x.local, foto: x.foto_path ?? undefined, orig: x.origem, criado: x.criado_em });
    if (rows.length < 1000) break;
  }
  return out;
}

/* ——— configuração compartilhada (metas e edições do cadastro) ——— */
export async function lerConfig<T>(chave: string): Promise<T | null> {
  const res = await fetch(`${BASE}/rest/v1/dsa_config?chave=eq.${encodeURIComponent(chave)}&select=valor`, { headers: H() });
  if (!res.ok) throw new Error(`config ${res.status}`);
  const rows = (await res.json()) as { valor: T }[];
  return rows[0]?.valor ?? null;
}
export async function gravarConfig(chave: string, valor: unknown) {
  const res = await fetch(`${BASE}/rest/v1/dsa_config?on_conflict=chave`, {
    method: "POST",
    headers: { ...H(), "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ chave, valor }),
  });
  if (!res.ok) throw new Error(`config ${res.status}`);
}

/** Cadastro de colaboradores no Supabase (tabela dsa_colaboradores). Vazio = usa o cadastro importado. */
export async function lerColaboradoresRemotos(): Promise<Partial<import("./types").Colab>[]> {
  const res = await fetch(`${BASE}/rest/v1/dsa_colaboradores?select=*&limit=5000`, { headers: H() });
  if (!res.ok) throw new Error(`colaboradores ${res.status}`);
  const rows = (await res.json()) as Record<string, any>[];
  return rows.filter(x => x.chapa && x.nome).map(x => ({
    c: Number(x.chapa), nome: String(x.nome), n: x.nome_curto || undefined, f: x.funcao ?? "", b: x.base ?? "", p: x.processo ?? "",
    g: x.gerencia ?? "", gr: x.grupo ?? "", ger: x.gerente ?? "", s: /DESLIG|INATIV/i.test(x.situacao ?? "") ? "D" : "A", l: x.lider ? 1 : 0,
  })) as Partial<import("./types").Colab>[];
}

/* ——— evidências (fotos) e exclusão — usadas pela aba Banco de dados ——— */
const cacheFotos = new Map<string, string>();
/** Baixa a foto (bucket privado) e devolve uma URL local. Miniatura pelo redimensionador do Storage quando disponível. */
export async function fotoUrl(path: string, largura?: number): Promise<string> {
  const chave = `${path}|${largura ?? 0}`;
  const c = cacheFotos.get(chave);
  if (c) return c;
  const tentar = async (u: string) => { const res = await fetch(u, { headers: H() }); return res.ok ? URL.createObjectURL(await res.blob()) : null; };
  let url: string | null = null;
  if (largura) url = await tentar(`${BASE}/storage/v1/render/image/authenticated/dsa-evidencias/${path}?width=${largura}&quality=70`).catch(() => null);
  url ??= await tentar(`${BASE}/storage/v1/object/dsa-evidencias/${path}`);
  if (!url) throw new Error("foto indisponível");
  cacheFotos.set(chave, url);
  return url;
}

/** Exclui registros pela função do banco, que confere usuário/senha de administrador no servidor. */
export async function excluirRegistros(usuario: string, senha: string, ids: string[]): Promise<number> {
  const res = await fetch(`${BASE}/rest/v1/rpc/dsa_excluir_registros`, {
    method: "POST",
    headers: { ...H(), "Content-Type": "application/json" },
    body: JSON.stringify({ p_usuario: usuario, p_senha: senha, p_ids: ids }),
  });
  if (res.ok) return Number(await res.json());
  let msg = `erro ${res.status}`;
  try { const j = await res.json(); msg = j.code === "PGRST202" ? "Função de exclusão não instalada no banco (rode supabase/exclusao.sql)." : (j.message ?? msg); } catch { /* sem corpo */ }
  throw new Error(msg);
}

/* ——— usuários e acesso (funções do banco; tudo conferido no servidor) ——— */
export class RpcAusente extends Error {}
export interface PerfilRemoto {
  usuario: string; nome: string; chapa: number | null; funcao: string | null; base: string | null;
  processo: string | null; gerencia: string | null; nivel: "admin" | "gestor" | "consulta" | "observador"; ativo?: boolean; trocar_senha?: boolean;
}

async function rpc<T>(nome: string, corpo: object): Promise<T> {
  const res = await fetch(`${BASE}/rest/v1/rpc/${nome}`, { method: "POST", headers: { ...H(), "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  if (res.ok) return (await res.json()) as T;
  let j: { code?: string; message?: string } = {};
  try { j = await res.json(); } catch { /* sem corpo */ }
  if (j.code === "PGRST202" || res.status === 404) throw new RpcAusente("Funções de usuários não instaladas no banco (rode supabase/usuarios.sql).");
  throw new Error(j.message ?? `erro ${res.status}`);
}
export const loginUsuario = (usuario: string, senha: string) => rpc<PerfilRemoto>("dsa_login", { p_usuario: usuario, p_senha: senha });
export const loginChapa = (chapa: number, senha: string) => rpc<PerfilRemoto>("dsa_login_chapa", { p_chapa: chapa, p_senha: senha });
export const usuariosPublicos = () => rpc<{ chapa: number; nome: string; funcao: string | null; base: string | null }[]>("dsa_usuarios_publicos", {});
export const alterarSenha = (usuario: string, atual: string, nova: string) => rpc<boolean>("dsa_alterar_senha", { p_usuario: usuario, p_senha_atual: atual, p_senha_nova: nova });
export const usuariosListar = (admin: string, senha: string) => rpc<PerfilRemoto[]>("dsa_usuarios_listar", { p_admin: admin, p_senha: senha });
export const usuarioExcluir = (admin: string, senha: string, usuario: string) => rpc<boolean>("dsa_usuario_excluir", { p_admin: admin, p_senha: senha, p_usuario: usuario });
export const usuarioSalvar = (admin: string, senha: string, d: {
  anterior: string | null; usuario: string; nome: string; chapa: number | null; funcao: string; base: string; processo: string; gerencia: string;
  nivel: string; ativo: boolean; novaSenha: string;
}) => rpc<PerfilRemoto>("dsa_usuario_salvar", {
  p_admin: admin, p_senha: senha, p_usuario: d.usuario, p_anterior: d.anterior, p_nome: d.nome, p_chapa: d.chapa, p_funcao: d.funcao || null,
  p_base: d.base || null, p_processo: d.processo || null, p_gerencia: d.gerencia || null, p_nivel: d.nivel, p_ativo: d.ativo, p_nova_senha: d.novaSenha || null,
});
