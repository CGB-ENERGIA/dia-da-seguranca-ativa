/** Normaliza o nome digitado da equipe para o prefixo do cadastro (ex.: "Pdse001m" -> "MA-PDS-E001M"). */
export interface EquipeCad { p: string }
const chave = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

export type Metodo = "exato" | "corrigido" | "ambiguo" | "desconhecido";

export function criarNormalizador(catalogo: EquipeCad[]) {
  const porChave = new Map(catalogo.map(e => [chave(e.p), e.p]));
  // (base, nº de 3 dígitos) -> prefixos; usado quando a letra do tipo foi esquecida
  const porBaseNum = new Map<string, string[]>();
  for (const e of catalogo) {
    const m = e.p.match(/^MA-([A-Z]{3})-[A-Z](\d{3})M$/);
    if (m) { const k = m[1] + m[2]; porBaseNum.set(k, [...(porBaseNum.get(k) ?? []), e.p]); }
  }
  const achar = (k: string) => porChave.get(k) ?? porChave.get("MA" + k);

  return (bruto: string): { prefixo: string; metodo: Metodo; candidatos?: string[] } => {
    const u = chave(bruto);
    if (porChave.has(u)) return { prefixo: porChave.get(u)!, metodo: "exato" };
    const c0 = u.replace(/MA$/, "").replace(/^MA(?=[A-Z]{3})/, ""); // tira "MA" do começo/fim
    const variantes = new Set<string>();
    for (const c of [c0, c0.replace(/T$/, "M"), c0 + "M", c0.replace(/T$/, "") + "M", c0.replace(/([A-Z])(\d{2})(M?)$/, "$10$2$3")]) variantes.add(c);
    for (const v of variantes) { const r = achar(v); if (r) return { prefixo: r, metodo: "corrigido" }; }
    for (const v of variantes) {
      const m = v.match(/^([A-Z]{3})(\d{3})M?$/); // sem a letra do tipo
      if (!m) continue;
      const cand = porBaseNum.get(m[1] + m[2]) ?? [];
      if (cand.length === 1) return { prefixo: cand[0], metodo: "corrigido" };
      if (cand.length > 1) return { prefixo: bruto.trim().toUpperCase(), metodo: "ambiguo", candidatos: cand };
    }
    // não está no cadastro: ao menos padroniza o formato (MA-XXX-L000M)
    const f = u.replace(/MA$/, "").replace(/^MA(?=[A-Z]{3})/, "").match(/^([A-Z]{3})([A-Z]\d{3})[MT]$/);
    return { prefixo: f ? `MA-${f[1]}-${f[2]}M` : bruto.trim().toUpperCase(), metodo: "desconhecido" };
  };
}
