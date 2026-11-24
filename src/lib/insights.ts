import type { Colab, Equipe } from "./types";
import { equipesDoFiltro, porColaborador, quartasDoFiltro, visitas, type Cfg, type Filtros, type Linha } from "./analytics";
import { ACAO_CURTA, MESES, agora, brDataCurta, quartasDoAno } from "./dates";

export type Tom = "bom" | "atencao" | "info";
export interface Card { tom: Tom; icone: "trend" | "ritmo" | "adesao" | "cobertura" | "mix" | "destaque" | "alerta" | "dados" | "prazo"; titulo: string; valor: string; texto: string }

const pct = (x: number) => `${Math.round(x * 100)}%`;
const media = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

/** Todos os números e séries da aba Insights, a partir do recorte filtrado. */
export function calcularInsights(filtradas: Linha[], todas: Linha[], f: Filtros, colabs: Colab[], equipes: Equipe[], catalogo: Equipe[], cfg: Cfg) {
  const hoje = agora().d;
  const quartas = quartasDoFiltro(f);
  const porQ = new Map<string, Linha[]>();
  for (const x of filtradas) (porQ.get(x.q) ?? porQ.set(x.q, []).get(x.q)!).push(x);

  // ——— volume por quarta + média móvel ———
  const serie = quartas.map((q, i, arr) => {
    const acoes = porQ.get(q)?.length ?? 0;
    const janela = arr.slice(Math.max(0, i - 3), i + 1).map(d => porQ.get(d)?.length ?? 0);
    return { q, dia: brDataCurta(q), Ações: acoes, "Média 4 quartas": Math.round(media(janela)), Visitas: visitas(porQ.get(q) ?? []) };
  });

  // ——— adesão das lideranças por quarta ———
  const ehLider = (c: Colab) =>
    c.l === 1 && c.s === "A" && (!f.base || c.b === f.base) && (!f.gerencia || c.g === f.gerencia) && (!f.grupo || c.gr === f.grupo) && (!f.processo || c.p === f.processo);
  const lideres = colabs.filter(ehLider);
  const cont = new Map<string, number>(); // chapa|q -> ações
  for (const x of filtradas) cont.set(`${x.chapa}|${x.q}`, (cont.get(`${x.chapa}|${x.q}`) ?? 0) + 1);
  const adesao = quartas.map(q => {
    const esperados = lideres.filter(c => !cfg.dispensas?.[c.c]?.[q]);
    const soma = esperados.reduce((s, c) => { const m = cfg.metas[c.c] ?? cfg.meta; const n = cont.get(`${c.c}|${q}`) ?? 0; return s + (m ? Math.min(1, n / m) : 1); }, 0);
    return { dia: brDataCurta(q), q, Adesão: esperados.length ? Math.round((soma / esperados.length) * 100) : 0 };
  });

  // ——— mix de ações por mês ———
  const mix = new Map<number, Record<string, number>>();
  for (const x of filtradas) {
    const m = mix.get(x.mes) ?? {};
    m[ACAO_CURTA[x.acao]] = (m[ACAO_CURTA[x.acao]] ?? 0) + 1;
    mix.set(x.mes, m);
  }
  const mixMes = [...mix].sort((a, b) => a[0] - b[0]).map(([m, v]) => ({ mes: MESES[m - 1], ...v }));

  // ——— cobertura de equipes ———
  const universo = equipesDoFiltro(equipes, f);
  const visitadas = new Set(filtradas.map(x => x.equipe));
  const cobBase = new Map<string, { t: number; v: number }>();
  for (const e of universo) {
    const c = cobBase.get(e.b) ?? { t: 0, v: 0 };
    c.t++; if (visitadas.has(e.p)) c.v++;
    cobBase.set(e.b, c);
  }
  const coberturaBase = [...cobBase].map(([nome, c]) => ({ nome, valor: Math.round((c.v / c.t) * 100), extra: `${c.v}/${c.t}` })).sort((a, b) => b.valor - a.valor);
  const nuncaVisitadas = universo.filter(e => !visitadas.has(e.p)).length;
  const coberturaTotal = universo.length ? (universo.length - nuncaVisitadas) / universo.length : 0;

  // ——— lideranças: aderência ———
  const lista = porColaborador(filtradas, colabs, f, cfg).filter(x => x.c.s === "A");
  const faixas = [
    { nome: "Sem ação", valor: lista.filter(x => x.acoes === 0).length },
    { nome: "1–39%", valor: lista.filter(x => x.acoes > 0 && x.aderencia < 0.4).length },
    { nome: "40–79%", valor: lista.filter(x => x.aderencia >= 0.4 && x.aderencia < 0.8).length },
    { nome: "80–100%", valor: lista.filter(x => x.aderencia >= 0.8).length },
  ];
  const porGer = new Map<string, number[]>();
  for (const x of lista) (porGer.get(x.c.g) ?? porGer.set(x.c.g, []).get(x.c.g)!).push(x.aderencia);
  const aderenciaGerencia = [...porGer].map(([nome, v]) => ({ nome, valor: Math.round(media(v) * 100), extra: `${v.length} obs.` })).sort((a, b) => b.valor - a.valor);
  const aderMedia = media(lista.map(x => x.aderencia));

  // ——— pontualidade e horário ———
  let naQuarta = 0, naQuinta = 0, outros = 0;
  const horas = new Map<number, number>();
  for (const x of filtradas) {
    const dow = new Date(`${x.d}T00:00:00Z`).getUTCDay();
    if (dow === 3) naQuarta++; else if (dow === 4) naQuinta++; else outros++;
    const h = +x.t.slice(0, 2); horas.set(h, (horas.get(h) ?? 0) + 1);
  }
  const pontualidade = [{ nome: "Quarta", valor: naQuarta }, { nome: "Quinta", valor: naQuinta }, { nome: "Outros dias", valor: outros }];
  const porHora = Array.from({ length: 14 }, (_, i) => i + 6).map(h => ({ hora: `${h}h`, Ações: horas.get(h) ?? 0 }));
  const horaPico = [...horas].sort((a, b) => b[1] - a[1])[0];

  // ——— dados ———
  const cadastro = new Set(catalogo.map(e => e.p));
  const foraCadastro = filtradas.filter(x => !cadastro.has(x.equipe)).length;

  // ——— alertas: lideranças sem ação nas últimas 4 quartas ———
  const ultimas4 = quartasDoAno(f.ano, hoje).slice(-4);
  const ativas4 = new Set(todas.filter(x => x.ano === f.ano && ultimas4.includes(x.q)).map(x => x.chapa));
  const inativos = ultimas4.length === 4 ? lideres.filter(c => !ativas4.has(c.c)) : [];

  // ——— destaques ———
  const total = filtradas.length;
  const comDados = serie.filter(s => s.Ações > 0);
  const completas = comDados.filter(s => s.q < hoje); // a quarta de hoje ainda está em andamento
  const ultima = completas.at(-1);
  const anteriores = completas.slice(-9, -1).map(s => s.Ações);
  const variacao = ultima && anteriores.length ? ultima.Ações / media(anteriores) - 1 : null;
  const porAcao = new Map<number, number>();
  for (const x of filtradas) porAcao.set(x.acao, (porAcao.get(x.acao) ?? 0) + 1);
  const acaoTop = [...porAcao].sort((a, b) => b[1] - a[1])[0];
  const preventivas = [2, 3, 4].reduce((s, i) => s + (porAcao.get(i) ?? 0), 0);
  const baseTop = Object.entries(filtradas.reduce<Record<string, number>>((m, x) => ((m[x.base] = (m[x.base] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1])[0];
  const topObs = lista[0];

  const quartasAno = quartasDoAno(f.ano, `${f.ano}-12-31`).length;
  const somaCompletas = completas.reduce((a, x) => a + x.Ações, 0);
  const mediaQ = completas.length ? somaCompletas / completas.length : 0;
  const projecao = !f.mes && !f.semana && f.ano === +hoje.slice(0, 4) && completas.length ? Math.round(somaCompletas + mediaQ * Math.max(0, quartasAno - completas.length)) : null;

  const cards: Card[] = [];
  if (ultima) cards.push({
    tom: variacao == null ? "info" : variacao >= 0 ? "bom" : "atencao", icone: "trend", titulo: "Última quarta-feira",
    valor: `${ultima.Ações} ações`,
    texto: variacao == null ? `em ${ultima.dia}.` : `${variacao >= 0 ? "+" : ""}${Math.round(variacao * 100)}% frente à média das ${anteriores.length} quartas anteriores (${Math.round(media(anteriores))}).`,
  });
  if (completas.length) cards.push({
    tom: "info", icone: "ritmo", titulo: "Ritmo do programa", valor: `${Math.round(mediaQ)} por quarta`,
    texto: projecao ? `Mantido o ritmo, o ano fecha em torno de ${projecao.toLocaleString("pt-BR")} ações (${quartasAno} quartas).` : `${somaCompletas.toLocaleString("pt-BR")} ações em ${completas.length} quartas encerradas.`,
  });
  if (lideres.length) cards.push({
    tom: aderMedia >= 0.8 ? "bom" : aderMedia >= 0.5 ? "info" : "atencao", icone: "adesao", titulo: "Adesão das lideranças", valor: pct(aderMedia),
    texto: `${faixas[3].valor} de ${lista.length} lideranças ativas cumprem 80% ou mais da meta; ${faixas[0].valor} não registraram nenhuma ação no período.`,
  });
  if (universo.length) cards.push({
    tom: coberturaTotal >= 0.7 ? "bom" : coberturaTotal >= 0.4 ? "info" : "atencao", icone: "cobertura", titulo: "Cobertura de equipes", valor: pct(coberturaTotal),
    texto: `${universo.length - nuncaVisitadas} de ${universo.length} equipes receberam visita; ${nuncaVisitadas} ainda sem nenhuma.`,
  });
  if (acaoTop) cards.push({
    tom: "info", icone: "mix", titulo: "Mix de ações", valor: ACAO_CURTA[acaoTop[0]],
    texto: `${pct(acaoTop[1] / total)} do total. Inspeções (EPI/EPC, veicular, ferramentas) somam ${pct(preventivas / total)}.`,
  });
  if (baseTop && topObs) cards.push({
    tom: "bom", icone: "destaque", titulo: "Destaques", valor: baseTop[0],
    texto: `Base com mais ações (${baseTop[1].toLocaleString("pt-BR")}). Maior observador: ${topObs.c.n} com ${topObs.acoes}.`,
  });
  if (total) cards.push({
    tom: naQuarta / total >= 0.85 ? "bom" : "atencao", icone: "prazo", titulo: "Lançamento no dia", valor: pct(naQuarta / total),
    texto: `${naQuinta.toLocaleString("pt-BR")} ações foram lançadas na quinta e ${outros.toLocaleString("pt-BR")} em outros dias${horaPico ? `; pico às ${horaPico[0]}h` : ""}.`,
  });
  if (inativos.length) cards.push({
    tom: "atencao", icone: "alerta", titulo: "Atenção: lideranças paradas", valor: `${inativos.length}`,
    texto: `sem nenhuma ação nas últimas 4 quartas: ${inativos.slice(0, 5).map(c => c.n).join(", ")}${inativos.length > 5 ? "…" : ""}.`,
  });
  if (total) cards.push({
    tom: foraCadastro / total <= 0.02 ? "bom" : "atencao", icone: "dados", titulo: "Qualidade dos dados", valor: pct(1 - foraCadastro / total),
    texto: foraCadastro ? `${foraCadastro} lançamentos com equipe fora do cadastro. Corrija em Configurações > Equipes.` : "Todas as equipes lançadas existem no cadastro.",
  });

  // quartas depois do último lançamento (dados ainda não recebidos) não entram nas séries
  let fim = serie.length;
  while (fim > 0 && serie[fim - 1].Ações === 0) fim--;
  return { cards, serie: serie.slice(0, fim), adesao: adesao.slice(0, fim), mixMes, coberturaBase, faixas, aderenciaGerencia, pontualidade, porHora, inativos, total };
}
