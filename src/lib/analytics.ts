import type { Colab, Equipe, Reg } from "./types";
import { agora, quartaDe, quartasDoAno, semanaDoMes } from "./dates";

export interface Filtros {
  ano: number;
  mes: number; // 0 = todos
  semana: number; // 0 = todas
  base: string;
  gerencia: string;
  grupo: string;
  acao: number; // -1 = todas
  processo: string;
}
export const filtrosIniciais = (ano: number, mes = 0): Filtros => ({
  ano, mes, semana: 0, base: "", gerencia: "", grupo: "", acao: -1, processo: "",
});

export interface Linha extends Reg {
  ano: number; mes: number; sem: number; q: string;
  base: string; gerencia: string; grupo: string; processo: string; nome: string;
}

export function enriquecer(regs: Reg[], colabs: Map<number, Colab>): Linha[] {
  return regs.map(r => {
    const c = colabs.get(r.chapa);
    const q = quartaDe(r.d);
    return {
      ...r, q,
      ano: +r.d.slice(0, 4), mes: +r.d.slice(5, 7), sem: semanaDoMes(q),
      base: c?.b ?? "—", gerencia: c?.g ?? "—", grupo: c?.gr ?? "—", processo: c?.p ?? "—", nome: c?.n ?? String(r.chapa),
    };
  });
}

export const aplicar = (l: Linha[], f: Filtros) =>
  l.filter(x =>
    x.ano === f.ano &&
    (!f.mes || x.mes === f.mes) &&
    (!f.semana || x.sem === f.semana) &&
    (!f.base || x.base === f.base) &&
    (!f.gerencia || x.gerencia === f.gerencia) &&
    (!f.grupo || x.grupo === f.grupo) &&
    (!f.processo || x.processo === f.processo) &&
    (f.acao < 0 || x.acao === f.acao));

export const contar = <T,>(a: T[], k: (x: T) => string | number) => {
  const m = new Map<string | number, number>();
  for (const x of a) m.set(k(x), (m.get(k(x)) ?? 0) + 1);
  return m;
};
export const ranking = <T,>(a: T[], k: (x: T) => string | number) =>
  [...contar(a, k)].map(([nome, valor]) => ({ nome: String(nome), valor })).sort((x, y) => y.valor - x.valor);

/** Visita = observador × equipe × quarta-feira. 3 ações na mesma equipe no mesmo dia = 1 visita; 3 equipes = 3 visitas. */
export const visitas = (l: Linha[]) => new Set(l.map(x => `${x.chapa}|${x.equipe}|${x.q}`)).size;

export function visitasPorEquipe(l: Linha[]) {
  const m = new Map<string, Set<string>>();
  for (const x of l) {
    if (!m.has(x.equipe)) m.set(x.equipe, new Set());
    m.get(x.equipe)!.add(`${x.chapa}|${x.q}`);
  }
  return m;
}

/** Quartas-feiras (já ocorridas) dentro do filtro — base da meta de 1 ação por observador por quarta. */
export function quartasDoFiltro(f: Filtros) {
  const hoje = agora().d;
  return quartasDoAno(f.ano, hoje).filter(d => (!f.mes || +d.slice(5, 7) === f.mes) && (!f.semana || semanaDoMes(d) === f.semana));
}

export interface Cfg { meta: number; metas: Record<number, number> }

/** Meta = N ações por quarta (padrão 1). Aderência = média, por quarta do período, de min(ações ÷ meta, 1). */
export function porColaborador(l: Linha[], colabs: Colab[], f: Filtros, cfg: Cfg) {
  const nQuartas = quartasDoFiltro(f).length;
  const por = new Map<number, Linha[]>();
  for (const x of l) {
    const a = por.get(x.chapa);
    if (a) a.push(x); else por.set(x.chapa, [x]);
  }
  const visivel = (c: Colab) =>
    (!f.base || c.b === f.base) && (!f.gerencia || c.g === f.gerencia) && (!f.grupo || c.gr === f.grupo) && (!f.processo || c.p === f.processo);
  return colabs
    .filter(c => c.l === 1 && (c.s === "A" || por.has(c.c)) && visivel(c))
    .map(c => {
      const rs = por.get(c.c) ?? [];
      const metaQ = cfg.metas[c.c] ?? cfg.meta;
      const porQ = new Map<string, number>();
      for (const r of rs) porQ.set(r.q, (porQ.get(r.q) ?? 0) + 1);
      let soma = 0, cumpridas = 0;
      for (const n of porQ.values()) { soma += metaQ ? Math.min(1, n / metaQ) : 1; if (n >= metaQ) cumpridas++; }
      return {
        c, acoes: rs.length, visitas: visitas(rs), dias: cumpridas, meta: nQuartas, metaQ,
        metaTotal: nQuartas * metaQ, aderencia: nQuartas ? Math.min(1, soma / nQuartas) : 0,
      };
    })
    .sort((a, b) => b.acoes - a.acoes || a.c.n.localeCompare(b.c.n));
}

export const equipesDoFiltro = (equipes: Equipe[], f: Filtros) =>
  equipes.filter(e => e.y.includes(f.ano) && (!f.base || e.b === f.base) && (!f.gerencia || e.g === f.gerencia) && (!f.processo || e.pr === f.processo));
