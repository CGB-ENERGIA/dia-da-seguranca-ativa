import { useMemo } from "react";
import { motion } from "motion/react";
import { clsx } from "clsx";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClipboardCheck, GraduationCap, HardHat, Siren, Truck, Wrench, Users, MapPinned, Target, History } from "lucide-react";
import Filtros from "../components/Filtros";
import { Card, CountUp, Vazio } from "../components/ui";
import { Anel, BarrasH, CORES, Colunas } from "../components/graficos";
import { useDados } from "../store/derivados";
import { useFiltros } from "../store/filtros";
import { porColaborador, quartasDoFiltro, ranking, visitas } from "../lib/analytics";
import { ACAO_CURTA, SEMANAS, brDataCurta, semanaDoMes } from "../lib/dates";

const ICONES = [Siren, ClipboardCheck, Wrench, HardHat, Truck, GraduationCap, History];

function Dica({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-vinho-950 px-3.5 py-2.5 text-white shadow-xl">
      <div className="text-[11px] font-bold text-white/60">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="text-[13px] font-extrabold"><span className="num">{p.value}</span> <span className="font-semibold text-white/70">{p.name}</span></div>
      ))}
    </div>
  );
}

export default function Painel() {
  const { f, filtradas, semAcao, colabs } = useDados();
  const set = useFiltros(s => s.set);

  const total = filtradas.length;
  const nVisitas = useMemo(() => visitas(filtradas), [filtradas]);
  const colabsAtivos = useMemo(() => new Set(filtradas.map(x => x.chapa)).size, [filtradas]);
  const aderencia = useMemo(() => {
    const l = porColaborador(filtradas, colabs, f).filter(x => x.c.s === "A");
    const ok = l.reduce((a, x) => a + x.dias, 0), meta = l.reduce((a, x) => a + x.meta, 0);
    return meta ? ok / meta : 0;
  }, [filtradas, colabs, f]);

  const porAcao = useMemo(() => {
    const m = new Map<number, number>();
    for (const x of semAcao) m.set(x.acao, (m.get(x.acao) ?? 0) + 1);
    return m;
  }, [semAcao]);
  const tiles = [0, 1, 2, 3, 4, 5, 6].filter(i => i !== 6 || (porAcao.get(6) ?? 0) > 0);

  const evolucao = useMemo(() => {
    const m = new Map<string, { d: string; acoes: number; vis: Set<string> }>();
    for (const x of filtradas) {
      const e = m.get(x.q) ?? { d: x.q, acoes: 0, vis: new Set() };
      e.acoes++; e.vis.add(`${x.chapa}|${x.equipe}`); m.set(x.q, e);
    }
    return [...m.values()].sort((a, b) => a.d.localeCompare(b.d)).map(e => ({ dia: brDataCurta(e.d), Ações: e.acoes, Visitas: e.vis.size }));
  }, [filtradas]);

  const porBase = useMemo(() => ranking(filtradas, x => x.base), [filtradas]);
  const porGer = useMemo(() => ranking(filtradas, x => x.gerencia), [filtradas]);
  const porProc = useMemo(() => ranking(filtradas, x => x.processo).slice(0, 8), [filtradas]);
  const porSem = useMemo(() => {
    const m = new Map<number, number>();
    for (const x of filtradas) m.set(x.sem, (m.get(x.sem) ?? 0) + 1);
    return [1, 2, 3, 4, 5].map(i => ({ nome: String(i), valor: m.get(i) ?? 0, rot: `${SEMANAS[i - 1]} quarta` })).filter(x => x.valor || !f.semana);
  }, [filtradas, f.semana]);

  // mapa de calor: base × últimas quartas do recorte
  const calor = useMemo(() => {
    const datas = [...new Set(filtradas.map(x => x.q))].sort().slice(-12);
    const bases = porBase.map(b => b.nome);
    const m = new Map<string, number>();
    for (const x of filtradas) m.set(`${x.base}|${x.q}`, (m.get(`${x.base}|${x.q}`) ?? 0) + 1);
    return { datas, bases, m, max: Math.max(1, ...m.values()) };
  }, [filtradas, porBase]);

  const nQuartas = quartasDoFiltro(f).length;

  return (
    <>
      <Filtros />

      {/* herói */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative isolate overflow-hidden rounded-[28px] bg-vinho-900 p-6 text-white shadow-[0_30px_60px_-30px_rgba(74,15,29,.9)] sm:p-9">
        <div className="absolute inset-0 -z-10 losangos opacity-90" />
        <div className="absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full bg-vinho-500/40 blur-3xl" />
        <div className="grid items-end gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="eyebrow !text-white/55">Total de ações</div>
            <div className="display mt-1 text-[clamp(84px,13vw,168px)] leading-[0.85] tracking-[-0.03em]">
              <CountUp key={`${f.ano}${f.mes}${f.semana}${f.base}${f.gerencia}${f.grupo}${f.acao}${f.processo}`} valor={total} />
            </div>
            <p className="mt-3 text-[13.5px] font-medium text-white/60">
              {f.ano}{f.mes ? ` · mês ${String(f.mes).padStart(2, "0")}` : ""}{f.semana ? ` · ${f.semana}ª quarta` : ""} · {nQuartas} quarta{nQuartas === 1 ? "" : "s"}-feira{nQuartas === 1 ? "" : "s"} no período
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icone: MapPinned, v: nVisitas, r: "visitas" },
              { icone: Users, v: colabsAtivos, r: "observadores" },
            ].map(k => (
              <div key={k.r} className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10 backdrop-blur-sm">
                <k.icone size={17} className="mb-3 text-ambar" />
                <div className="display text-[44px] leading-none"><CountUp valor={k.v} /></div>
                <div className="mt-1 text-[11.5px] font-bold uppercase tracking-[0.1em] text-white/50">{k.r}</div>
              </div>
            ))}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white/8 p-3 ring-1 ring-white/10">
              <Anel pct={aderencia} tam={92} cor="#f2b134" fundo="rgba(255,255,255,.14)">
                <span className="display text-[26px] leading-none"><CountUp valor={Math.round(aderencia * 100)} />%</span>
              </Anel>
              <div className="mt-1 flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-white/50"><Target size={11} /> meta</div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* tipos de ação */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {tiles.map((i, k) => {
          const Icone = ICONES[i], n = porAcao.get(i) ?? 0, on = f.acao === i;
          return (
            <motion.button key={i} onClick={() => set({ acao: on ? -1 : i })} aria-pressed={on}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + k * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={clsx("group relative overflow-hidden rounded-[22px] border p-4 text-left transition-all hover:-translate-y-0.5 active:scale-[.98]",
                on ? "border-vinho-700 bg-vinho-700 text-white shadow-[0_18px_34px_-16px_rgba(112,22,39,.9)]" : "border-black/7 bg-papel hover:border-vinho-300 hover:shadow-lg")}>
              <Icone size={19} className={on ? "text-ambar" : "text-vinho-500"} />
              <div className="display num mt-3 text-[46px] leading-none"><CountUp valor={n} /></div>
              <div className={clsx("mt-1.5 text-[11.5px] font-extrabold uppercase leading-tight tracking-[0.07em]", on ? "text-white/80" : "text-black/50")}>{ACAO_CURTA[i]}</div>
              <span className={clsx("absolute inset-x-0 bottom-0 h-1 origin-left transition-transform", on ? "bg-ambar" : "bg-vinho-600/70")}
                style={{ transform: `scaleX(${semAcao.length ? n / semAcao.length : 0})` }} />
            </motion.button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Card titulo="Evolução por quarta-feira" sub="ações e visitas em cada Dia da Segurança Ativa">
          <div className="h-[290px]">
            {evolucao.length ? (
              <ResponsiveContainer>
                <AreaChart data={evolucao} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#701627" stopOpacity={0.55} /><stop offset="100%" stopColor="#701627" stopOpacity={0.02} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 5" stroke="rgba(35,22,25,.08)" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fontWeight: 700, fill: "rgba(35,22,25,.5)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={18} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: "rgba(35,22,25,.45)" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Dica />} cursor={{ stroke: "#701627", strokeDasharray: "4 4" }} />
                  <Area type="monotone" dataKey="Ações" stroke="#701627" strokeWidth={2.8} fill="url(#gA)" animationDuration={900} dot={{ r: 3, fill: "#701627", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#f2b134", stroke: "#701627", strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="Visitas" stroke="#f2b134" strokeWidth={2.4} fill="none" animationDuration={1100} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <Vazio />}
          </div>
          <div className="mt-2 flex gap-5 text-[12px] font-bold text-black/55">
            <span className="flex items-center gap-2"><i className="h-1 w-5 rounded bg-vinho-700" /> Ações</span>
            <span className="flex items-center gap-2"><i className="h-1 w-5 rounded bg-ambar" /> Visitas</span>
          </div>
        </Card>

        <Card titulo="por Gerência" sub="clique para filtrar">
          {porGer.length ? (
            <div className="grid items-center gap-4 sm:grid-cols-[1fr_1fr] xl:grid-cols-1">
              <div className="relative mx-auto h-[210px] w-[210px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={porGer} dataKey="valor" nameKey="nome" innerRadius={66} outerRadius={100} paddingAngle={2.5} cornerRadius={7} stroke="none" animationDuration={900}
                      onClick={(d: any) => set({ gerencia: f.gerencia === d.nome ? "" : d.nome })}>
                      {porGer.map((g, i) => <Cell key={g.nome} fill={CORES[i % CORES.length]} opacity={!f.gerencia || f.gerencia === g.nome ? 1 : 0.25} style={{ cursor: "pointer", outline: "none" }} />)}
                    </Pie>
                    <Tooltip content={<Dica />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div><div className="display num text-[38px] leading-none text-vinho-900">{total}</div><div className="eyebrow !text-[9.5px]">ações</div></div>
                </div>
              </div>
              <ul className="space-y-1.5">
                {porGer.map((g, i) => (
                  <li key={g.nome}>
                    <button onClick={() => set({ gerencia: f.gerencia === g.nome ? "" : g.nome })} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-[12.5px] font-bold hover:bg-vinho-50">
                      <i className="h-2.5 w-2.5 rounded-full" style={{ background: CORES[i % CORES.length] }} />
                      <span>{g.nome}</span>
                      <span className="num ml-auto text-black/50">{g.valor}</span>
                      <span className="num w-10 text-right text-vinho-800">{total ? Math.round((g.valor / total) * 100) : 0}%</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : <Vazio />}
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Card titulo="por Base" sub="ações por base operacional">
          <BarrasH itens={porBase} ativo={f.base} onClick={n => set({ base: n })} />
        </Card>
        <Card titulo="por Quarta-feira" sub="1ª a 5ª quarta do mês" delay={0.05}>
          {porSem.length ? <Colunas itens={porSem} ativo={f.semana ? String(f.semana) : ""} onClick={n => set({ semana: n ? +n : 0 })} /> : <Vazio />}
        </Card>
        <Card titulo="por Processo" sub="processo do observador" delay={0.1} className="lg:col-span-2 xl:col-span-1">
          <BarrasH itens={porProc} ativo={f.processo} onClick={n => set({ processo: n })} />
        </Card>
      </div>

      <Card titulo="Mapa de calor" sub="bases × últimas quartas-feiras do período" className="mt-5">
        {calor.datas.length ? (
          <div className="rolagem overflow-x-auto pb-1">
            <div className="grid min-w-[560px] gap-1.5" style={{ gridTemplateColumns: `64px repeat(${calor.datas.length}, minmax(34px,1fr))` }}>
              <span />
              {calor.datas.map(d => <span key={d} className="num text-center text-[10.5px] font-bold text-black/45">{brDataCurta(d)}</span>)}
              {calor.bases.map(b => (
                <div key={b} className="contents">
                  <span className="self-center text-[12.5px] font-extrabold text-vinho-900">{b}</span>
                  {calor.datas.map(d => {
                    const v = calor.m.get(`${b}|${d}`) ?? 0, t = v / calor.max;
                    return (
                      <motion.span key={d} title={`${b} · ${brDataCurta(d)}: ${v} ações · ${semanaDoMes(d)}ª quarta`}
                        initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
                        className="num grid h-10 place-items-center rounded-lg text-[11px] font-extrabold"
                        style={{ background: v ? `rgba(112,22,39,${0.1 + t * 0.9})` : "rgba(35,22,25,.04)", color: t > 0.45 ? "#fff" : "#701627" }}>
                        {v || ""}
                      </motion.span>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : <Vazio />}
      </Card>
    </>
  );
}
