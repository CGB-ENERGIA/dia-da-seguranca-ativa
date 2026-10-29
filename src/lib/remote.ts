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

export async function enviarReg(r: Reg, foto?: Blob) {
  let foto_path: string | null = null;
  if (foto && r.fotoId) {
    foto_path = `${r.d}/${r.chapa}-${r.fotoId}.jpg`;
    const up = await fetch(`${BASE}/storage/v1/object/evidencias/${foto_path}`, {
      method: "POST",
      headers: { ...H(), "Content-Type": "image/jpeg", "x-upsert": "true" },
      body: foto,
    });
    if (!up.ok) throw new Error(`upload ${up.status}`);
  }
  const res = await fetch(`${BASE}/rest/v1/registros?on_conflict=id`, {
    method: "POST",
    headers: { ...H(), "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({
      id: r.id, chapa: r.chapa, equipe: r.equipe, acao: ACOES[r.acao],
      data: r.d, hora: r.t, lat: r.lat ?? null, lon: r.lon ?? null, local: r.local ?? null, foto_path,
    }),
  });
  if (!res.ok) throw new Error(`registro ${res.status}`);
}

export async function baixarRegs(): Promise<Reg[]> {
  const out: Reg[] = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${BASE}/rest/v1/registros?select=id,chapa,equipe,acao,data,hora,lat,lon,local&order=data.asc`, {
      headers: { ...H(), Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`leitura ${res.status}`);
    const rows = (await res.json()) as any[];
    for (const x of rows)
      out.push({ id: x.id, d: x.data, t: String(x.hora).slice(0, 5), chapa: x.chapa, equipe: x.equipe,
        acao: Math.max(0, ACOES.indexOf(x.acao)), origem: "app", sync: "synced", lat: x.lat, lon: x.lon, local: x.local });
    if (rows.length < 1000) break;
  }
  return out;
}

/* ——— configuração compartilhada (metas e edições do cadastro) ——— */
export async function lerConfig<T>(chave: string): Promise<T | null> {
  const res = await fetch(`${BASE}/rest/v1/config?chave=eq.${encodeURIComponent(chave)}&select=valor`, { headers: H() });
  if (!res.ok) throw new Error(`config ${res.status}`);
  const rows = (await res.json()) as { valor: T }[];
  return rows[0]?.valor ?? null;
}
export async function gravarConfig(chave: string, valor: unknown) {
  const res = await fetch(`${BASE}/rest/v1/config?on_conflict=chave`, {
    method: "POST",
    headers: { ...H(), "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ chave, valor }),
  });
  if (!res.ok) throw new Error(`config ${res.status}`);
}

/** Lê a tabela `colaboradores` que já existe no Supabase, aceitando variações comuns de nome de coluna. */
export async function lerColaboradoresRemotos(): Promise<Partial<import("./types").Colab>[]> {
  const res = await fetch(`${BASE}/rest/v1/colaboradores?select=*&limit=5000`, { headers: H() });
  if (!res.ok) throw new Error(`colaboradores ${res.status}`);
  const rows = (await res.json()) as Record<string, any>[];
  const pega = (r: Record<string, any>, ...ks: string[]) => { for (const k of ks) if (r[k] != null && r[k] !== "") return String(r[k]); return ""; };
  return rows.map(r => ({
    c: Number(pega(r, "chapa", "matricula", "CHAPA")),
    nome: pega(r, "nome", "NOME"),
    f: pega(r, "funcao", "função", "FUNÇÃO", "cargo"),
    b: pega(r, "base", "secao", "seção", "BASE"),
    p: pega(r, "processo", "PROCESSO"),
    g: pega(r, "gerencia", "gerência", "GERENCIA"),
    s: /DESLIG|INATIV/i.test(pega(r, "situacao", "situação", "SITUAÇÃO", "status")) ? "D" : "A",
  })).filter(c => c.c && c.nome) as Partial<import("./types").Colab>[];
}
