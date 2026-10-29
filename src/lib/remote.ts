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
