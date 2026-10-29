import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { clsx } from "clsx";
import { Crown, Search } from "lucide-react";
import Filtros from "../components/Filtros";
import { Card, CountUp, Vazio } from "../components/ui";
import { Anel } from "../components/graficos";
import { useDados } from "../store/derivados";
import { porColaborador } from "../lib/analytics";

type Ordem = "acoes" | "aderencia" | "nome";

export default function Colaboradores() {
  const { f, filtradas, colabs, cfg } = useDados();
  const [q, setQ] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("acoes");

  const lista = useMemo(() => porColaborador(filtradas, colabs, f, cfg), [filtradas, colabs, f, cfg]);
  const vis = useMemo(() => {
    const t = q.trim().toLowerCase();
    const l = lista.filter(x => !t || x.c.nome.toLowerCase().includes(t) || x.c.n.toLowerCase().includes(t) || String(x.c.c).includes(t));
    return [...l].sort((a, b) => ordem === "nome" ? a.c.n.localeCompare(b.c.n) : ordem === "aderencia" ? b.aderencia - a.aderencia || b.acoes - a.acoes : b.acoes - a.acoes);
  }, [lista, q, ordem]);
  const max = Math.max(1, ...lista.map(x => x.acoes));
  const podio = lista.slice(0, 3);
  const meta = lista[0]?.meta ?? 0;
  const zerados = lista.filter(x => x.acoes === 0).length;
  const mediaAd = lista.length ? lista.reduce((a, x) => a + x.aderencia, 0) / lista.length : 0;

  return (
    <>
      <Filtros semAcao />
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            {podio.map((p, i) => (
              <motion.div key={p.c.c} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className={clsx("relative overflow-hidden rounded-[22px] p-5", i === 0 ? "bg-vinho-900 text-white md:-mt-2" : "card")}>
                {i === 0 && <div className="aurora absolute inset-0" />}
                <div className="relative flex items-start justify-between">
                  <span className={clsx("display text-[54px] leading-none", i === 0 ? "text-ambar" : "text-vinho-300")}>{i + 1}º</span>
                  {i === 0 && <Crown size={22} className="text-ambar" />}
                </div>
                <div className="relative mt-3 truncate text-[17px] font-extrabold">{p.c.n}</div>
                <div className={clsx("relative text-[12px] font-semibold", i === 0 ? "text-white/60" : "text-ink/45")}>{p.c.b} · {p.c.g}</div>
                <div className="relative mt-3 flex items-baseline gap-2">
                  <span className="display num text-[44px] leading-none"><CountUp valor={p.acoes} /></span>
                  <span className={clsx("text-[12px] font-bold", i === 0 ? "text-white/60" : "text-ink/45")}>ações · {p.visitas} visitas</span>
                </div>
              </motion.div>
            ))}
            {!podio.length && <Card className="md:col-span-3"><Vazio /></Card>}
          </div>

          <Card titulo="Relatório de ações por colaborador" sub={`meta: ${cfg.meta} ação(ões) por quarta · ${meta} quarta${meta === 1 ? "" : "s"} no período`}
            direita={
              <div className="flex rounded-xl bg-ink/5 p-1 text-[12px] font-extrabold">
                {([["acoes", "Ações"], ["aderencia", "Meta"], ["nome", "A–Z"]] as [Ordem, string][]).map(([k, t]) => (
                  <button key={k} onClick={() => setOrdem(k)} className={clsx("rounded-lg px-3 py-1.5 transition", ordem === k ? "bg-field text-brand shadow" : "text-ink/45")}>{t}</button>
                ))}
              </div>
            }>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3.5 top-[14px] text-ink/35" />
              <input className="campo !h-11 !pl-10" placeholder="Buscar por nome ou matrícula" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <ul className="rolagem max-h-[640px] space-y-1 overflow-y-auto pr-1">
              {vis.map(x => (
                <li key={x.c.c} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 rounded-xl px-2 py-2 transition hover:bg-soft sm:grid-cols-[minmax(120px,190px)_1fr_64px_96px]">
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-extrabold text-brand">{x.c.n}</div>
                    <div className="truncate text-[11.5px] font-semibold text-ink/40">{x.c.b} · {x.c.p}</div>
                  </div>
                  <div className="order-3 col-span-2 h-[10px] overflow-hidden rounded-full bg-ink/[.05] sm:order-none sm:col-span-1">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-vinho-800 to-vinho-500 dark:from-vinho-600 dark:to-vinho-400" initial={{ width: 0 }} animate={{ width: `${(x.acoes / max) * 100}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
                  </div>
                  <div className="num text-right text-[18px] font-extrabold text-brand">{x.acoes}</div>
                  <div className="hidden text-right sm:block">
                    <span className={clsx("rounded-full px-2.5 py-1 text-[11.5px] font-extrabold", x.aderencia >= 0.8 ? "bg-oliva/15 text-oliva" : x.aderencia >= 0.4 ? "bg-ambar/25 text-[#7a5200]" : "bg-soft2 text-brand")}>
                      {x.dias}/{x.meta} · {Math.round(x.aderencia * 100)}%
                    </span>
                  </div>
                </li>
              ))}
              {!vis.length && <Vazio texto="Nenhum colaborador encontrado." />}
            </ul>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card titulo="Aderência à meta" sub="quartas com ao menos 1 ação">
            <div className="flex items-center gap-5">
              <Anel pct={mediaAd} tam={132}><span className="display text-[38px] leading-none text-brand"><CountUp valor={Math.round(mediaAd * 100)} />%</span></Anel>
              <div className="text-[13px] font-semibold leading-relaxed text-ink/55">
                média dos <b className="text-brand">{lista.length}</b> observadores ativos no recorte atual.
              </div>
            </div>
          </Card>
          <Card titulo="Sem nenhuma ação" sub="observadores com zero no período">
            <div className="display num text-[64px] leading-none text-brand"><CountUp valor={zerados} /></div>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {lista.filter(x => x.acoes === 0).slice(0, 18).map(x => <li key={x.c.c} className="rounded-full bg-soft px-2.5 py-1 text-[11.5px] font-bold text-brand">{x.c.n}</li>)}
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}
