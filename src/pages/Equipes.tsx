import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import Filtros from "../components/Filtros";
import { Card, CountUp, Vazio } from "../components/ui";
import { Anel, BarrasH } from "../components/graficos";
import { useDados } from "../store/derivados";
import { useFiltros } from "../store/filtros";
import { equipesDoFiltro, ranking, visitas, visitasPorEquipe } from "../lib/analytics";

function Lista({ itens, vazio }: { itens: { p: string; n: number; sub: string }[]; vazio: string }) {
  const [q, setQ] = useState("");
  const l = itens.filter(i => !q || i.p.toLowerCase().includes(q.toLowerCase()));
  const max = Math.max(1, ...itens.map(i => i.n));
  return (
    <>
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3.5 top-[13px] text-black/35" />
        <input className="campo !h-10 !pl-10 !text-[13px]" placeholder="Buscar equipe" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <ul className="rolagem max-h-[520px] space-y-0.5 overflow-y-auto pr-1">
        {l.map(i => (
          <li key={i.p} className="grid grid-cols-[1fr_64px_28px] items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-vinho-50">
            <div className="min-w-0"><div className="truncate font-mono text-[12.5px] font-bold text-vinho-900">{i.p}</div><div className="truncate text-[10.5px] font-semibold text-black/40">{i.sub}</div></div>
            <span className="h-2 overflow-hidden rounded-full bg-black/[.05]"><span className="block h-full rounded-full bg-vinho-600" style={{ width: `${(i.n / max) * 100}%` }} /></span>
            <span className="num text-right text-[13px] font-extrabold text-vinho-900">{i.n}</span>
          </li>
        ))}
        {!l.length && <Vazio texto={vazio} />}
      </ul>
    </>
  );
}

export default function Equipes() {
  const { f, filtradas, equipes } = useDados();
  const set = useFiltros(s => s.set);

  const universo = useMemo(() => equipesDoFiltro(equipes, f), [equipes, f]);
  const porEq = useMemo(() => visitasPorEquipe(filtradas), [filtradas]);
  const nVisitas = useMemo(() => visitas(filtradas), [filtradas]);
  const visitadasSet = useMemo(() => new Set(filtradas.map(x => x.equipe)), [filtradas]);
  const nomes = useMemo(() => new Map(universo.map(e => [e.p, e])), [universo]);

  const mais = useMemo(() => [...porEq].map(([p, s]) => ({ p, n: s.size, sub: nomes.get(p) ? `${nomes.get(p)!.pr} · ${nomes.get(p)!.b}` : "fora do cadastro" })).sort((a, b) => b.n - a.n), [porEq, nomes]);
  const nao = useMemo(() => universo.filter(e => !visitadasSet.has(e.p)).map(e => ({ p: e.p, n: 0, sub: `${e.pr} · ${e.b}` })).sort((a, b) => a.p.localeCompare(b.p)), [universo, visitadasSet]);
  const cobertas = universo.length - nao.length;
  const taxa = universo.length ? cobertas / universo.length : 0;

  const visBase = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const x of filtradas) (m.get(x.base) ?? m.set(x.base, new Set()).get(x.base)!).add(`${x.chapa}|${x.equipe}|${x.q}`);
    return [...m].map(([nome, s]) => ({ nome, valor: s.size })).sort((a, b) => b.valor - a.valor);
  }, [filtradas]);
  const acoesBase = useMemo(() => ranking(filtradas, x => x.base), [filtradas]);

  return (
    <>
      <Filtros semAcao />
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr_1fr]">
        <div className="space-y-5 xl:col-span-1">
          <Card titulo="Taxa de contato" sub="equipes visitadas ÷ equipes ativas">
            <div className="flex items-center gap-6">
              <Anel pct={taxa} tam={148}><div className="text-center"><div className="display text-[44px] leading-none text-vinho-900"><CountUp valor={Math.round(taxa * 100)} />%</div></div></Anel>
              <dl className="space-y-3 text-[13px] font-semibold text-black/55">
                <div><dt className="eyebrow !text-[10px]">visitas</dt><dd className="display text-[36px] leading-none text-vinho-800"><CountUp valor={nVisitas} /></dd></div>
                <div><dt className="eyebrow !text-[10px]">equipes visitadas</dt><dd className="display text-[36px] leading-none text-vinho-800"><CountUp valor={cobertas} /><span className="text-[18px] text-black/35"> / {universo.length}</span></dd></div>
              </dl>
            </div>
          </Card>
          <Card titulo="Visitas por Base" sub="observador × equipe × dia">
            <BarrasH itens={visBase} ativo={f.base} onClick={n => set({ base: n })} />
            <p className="mt-4 text-[11.5px] font-semibold leading-relaxed text-black/40">
              Ações no período: {acoesBase.reduce((a, b) => a + b.valor, 0)}. Várias ações do mesmo observador na mesma equipe/dia contam como uma única visita.
            </p>
          </Card>
        </div>
        <Card titulo="Equipes mais visitadas" sub="nº de visitas no período" delay={0.05}><Lista itens={mais} vazio="Nenhuma visita no recorte." /></Card>
        <Card titulo="Equipes não visitadas" sub={`${nao.length} sem nenhuma visita`} delay={0.1}><Lista itens={nao} vazio="Todas as equipes foram visitadas" /></Card>
      </div>
    </>
  );
}
