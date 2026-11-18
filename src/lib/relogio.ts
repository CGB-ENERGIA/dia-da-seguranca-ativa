import { kvGet, kvSet } from "./db";

/**
 * Relógio confiável: o horário do aparelho pode ser alterado pelo usuário, então com internet usamos a hora do SERVIDOR
 * (cabeçalho HTTP "Date" do próprio site — de outro domínio o navegador não deixa ler). Sem internet, usa o relógio
 * do aparelho corrigido pelo último desvio conhecido. O banco ainda valida data/hora no envio (supabase/regras-quarta.sql).
 */
let desvio = 0; // ms a somar ao relógio do aparelho
let sincronizado = false;

const base = import.meta.env.BASE_URL;

export const agoraConfiavel = () => new Date(Date.now() + desvio);
export const relogioDoServidor = () => sincronizado;

export async function carregarRelogio() {
  const s = await kvGet<{ desvio: number }>("relogio");
  if (s && Number.isFinite(s.desvio)) desvio = s.desvio;
}

export async function sincronizarRelogio(): Promise<boolean> {
  if (!navigator.onLine) return false;
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), 4000);
  try {
    const t0 = Date.now();
    // URL com parâmetro único: não é atendida pelo cache do service worker nem pelo do navegador
    const r = await fetch(`${base}favicon.png?_=${t0}`, { method: "HEAD", cache: "no-store", signal: c.signal });
    const t1 = Date.now();
    const h = r.headers.get("date");
    if (!r.ok || !h) return false;
    const servidor = Date.parse(h) + 500 + (t1 - t0) / 2; // "Date" vem truncado em segundos; compensa metade da latência
    desvio = servidor - t1;
    sincronizado = true;
    void kvSet("relogio", { desvio, em: t1 });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
