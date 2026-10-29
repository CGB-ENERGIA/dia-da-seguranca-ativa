import { useMemo } from "react";
import { FilterX } from "lucide-react";
import { Select } from "./ui";
import { useFiltros } from "../store/filtros";
import { todosRegistros, useData } from "../store/data";
import { MESES_LONGO, SEMANAS_LONGO } from "../lib/dates";

/** Barra de filtros fixa; todas as páginas reagem ao mesmo estado. */
export default function Filtros({ semAcao }: { semAcao?: boolean }) {
  const { f, set, limpar } = useFiltros();
  const colabs = useData(s => s.colabs);
  const { historico, remotos, locais } = useData();
  const anos = useMemo(() => [...new Set(todosRegistros({ historico, remotos, locais }).map(r => +r.d.slice(0, 4)))].sort(), [historico, remotos, locais]);
  const opc = useMemo(() => {
    const u = (k: "b" | "g" | "gr" | "p") => [...new Set(colabs.map(c => c[k]).filter(Boolean))].sort();
    return { b: u("b"), g: u("g"), gr: u("gr"), p: u("p") };
  }, [colabs]);
  const sujo = f.mes || f.semana || f.base || f.gerencia || f.grupo || f.processo || (!semAcao && f.acao >= 0);

  return (
    <div className="rolagem z-20 -mx-4 mb-5 flex flex-nowrap items-end gap-2.5 overflow-x-auto sm:sticky sm:top-0 sm:flex-wrap sm:overflow-visible bg-canvas/85 px-4 pb-3 pt-1 backdrop-blur-md sm:-mx-8 sm:px-8">
      <Select neutro rotulo="Ano" valor={f.ano} onChange={v => set({ ano: +v })} opcoes={anos.map(a => ({ v: a, t: String(a) }))} />
      <Select rotulo="Mês" valor={f.mes} onChange={v => set({ mes: +v })}
        opcoes={[{ v: 0, t: "Todos" }, ...MESES_LONGO.map((m, i) => ({ v: i + 1, t: m }))]} />
      <Select rotulo="Quarta-feira" valor={f.semana} onChange={v => set({ semana: +v })}
        opcoes={[{ v: 0, t: "Todas" }, ...SEMANAS_LONGO.map((m, i) => ({ v: i + 1, t: m }))]} />
      <Select rotulo="Base" valor={f.base} onChange={v => set({ base: v })} opcoes={[{ v: "", t: "Todas" }, ...opc.b.map(x => ({ v: x, t: x }))]} />
      <Select rotulo="Gerência" valor={f.gerencia} onChange={v => set({ gerencia: v })} opcoes={[{ v: "", t: "Todas" }, ...opc.g.map(x => ({ v: x, t: x }))]} />
      <Select rotulo="Grupo" valor={f.grupo} onChange={v => set({ grupo: v })} opcoes={[{ v: "", t: "Todos" }, ...opc.gr.map(x => ({ v: x, t: x[0] + x.slice(1).toLowerCase() }))]} />
      <Select rotulo="Processo" valor={f.processo} onChange={v => set({ processo: v })} className="hidden md:block" opcoes={[{ v: "", t: "Todos" }, ...opc.p.map(x => ({ v: x, t: x }))]} />
      {sujo ? (
        <button onClick={limpar} className="flex h-[52px] shrink-0 items-center gap-2 rounded-2xl bg-vinho-700 px-4 text-[13px] font-bold text-white shadow-md transition hover:bg-vinho-800">
          <FilterX size={16} /> Limpar
        </button>
      ) : null}
    </div>
  );
}
