import { useMemo } from "react";
import { motion } from "motion/react";
import { clsx } from "clsx";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Clock3, Database, Gauge, PieChart, Trophy, TrendingUp, UsersRound, Waypoints } from "lucide-react";
import Filtros from "../components/Filtros";
import { Card, Vazio } from "../components/ui";
import { BarrasH, CORES, CORES_ESCURO, Colunas } from "../components/graficos";
import { useDados } from "../store/derivados";
import { useTema } from "../store/tema";
import { calcularInsights, type Card as CardInsight } from "../lib/insights";
import { ACAO_CURTA } from "../lib/dates";

const ICONES = { trend: TrendingUp, ritmo: Gauge, adesao: UsersRound, cobertura: Waypoints, mix: PieChart, destaque: Trophy, alerta: AlertTriangle, dados: Database, prazo: Clock3 };
const TOM = {
  bom: { faixa: "bg-oliva", chip: "bg-oliva/15 text-oliva", rot: "Bom" },
  atencao: { faixa: "bg-vinho-500", chip: "bg-vinho-500/15 text-vinho-600 dark:text-vinho-300", rot: "Atenção" },
  info: { faixa: "bg-ambar", chip: "bg-ambar/20 text-[#8a5d00] dark:text-ambar", rot: "Informativo" },
};

function Dica({ active, payload, label, sufixo = "" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-vinho-950 px-3.5 py-2.5 text-white shadow-xl">
      <div className="text-[11px] font-bold text-white/60">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-[12.5px] font-extrabold"><i className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} /><span className="num">{p.value}{sufixo}</span> <span className="font-semibold text-white/70">{p.name}</span></div>
      ))}
    </div>
  );
}

function Insight({ c, i }: { c: CardInsight; i: number }) {
  const Icone = ICONES[c.icone], t = TOM[c.tom];
  return (
    <motion.article initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="card relative flex flex-col overflow-hidden p-5">
      <span className={clsx("absolute inset-y-0 left-0 w-1", t.faixa)} />
      <div className="flex items-center justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-soft text-vinho-500"><Icone size={19} /></div>
        <span className={clsx("rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.08em]", t.chip)}>{t.rot}</span>
      </div>
      <div className="eyebrow mt-4">{c.titulo}</div>
      <div className="display num mt-1 text-[30px] leading-tight text-brand">{c.valor}</div>
      <p className="mt-2 text-[13px] font-medium leading-relaxed text-ink/60">{c.texto}</p>
    </motion.article>
  );
}

export default function Insights() {
  const { f, filtradas, linhas, colabs, equipes, cfg } = useDados();
  const escuro = useTema(s => s.tema === "escuro");
  const paleta = escuro ? CORES_ESCURO : CORES;
  const cor = escuro ? "#e0788d" : "#701627";
  const grade = escuro ? "rgba(255,255,255,.08)" : "rgba(35,22,25,.08)";
  const tick = escuro ? "rgba(255,255,255,.55)" : "rgba(35,22,25,.5)";
  const eixo = { fontSize: 11, fontWeight: 700, fill: tick };

  const d = useMemo(() => calcularInsights(filtradas, linhas, f, colabs, equipes, equipes, cfg), [filtradas, linhas, f, colabs, equipes, cfg]);
  const chavesMix = ACAO_CURTA.filter(a => d.mixMes.some(m => (m as Record<string, number | string>)[a]));

  return (
    <>
      <Filtros />
      {d.total === 0 ? <Card><Vazio texto="Sem ações neste filtro para gerar insights." /></Card> : (
        <>
          <div className="mb-1 flex items-end justify-between">
            <div><div className="eyebrow">Resumo executivo</div><h2 className="display text-[22px] text-brand">O que os números estão dizendo</h2></div>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{d.cards.map((c, i) => <Insight key={c.titulo} c={c} i={i} />)}</div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Card titulo="Ritmo por quarta-feira" sub="ações lançadas e média móvel das últimas 4 quartas">
              <div className="h-[280px]">
                <ResponsiveContainer>
                  <ComposedChart data={d.serie} margin={{ top: 14, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 5" stroke={grade} vertical={false} />
                    <XAxis dataKey="dia" tick={eixo} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                    <YAxis tick={eixo} axisLine={false} tickLine={false} />
                    <Tooltip content={<Dica />} cursor={{ fill: "rgba(128,128,128,.08)" }} />
                    <Bar dataKey="Ações" fill={cor} radius={[6, 6, 0, 0]} maxBarSize={28} animationDuration={800} label={d.serie.length <= 14 ? { position: "top", fontSize: 10.5, fontWeight: 800, fill: tick } : false} />
                    <Line type="monotone" dataKey="Média 4 quartas" stroke="#f2b134" strokeWidth={2.6} dot={false} animationDuration={1000} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <Legenda itens={[["Ações", cor], ["Média 4 quartas", "#f2b134"]]} />
            </Card>

            <Card titulo="Adesão das lideranças" sub="% da meta cumprida pelas lideranças ativas em cada quarta" delay={0.05}>
              <div className="h-[280px]">
                <ResponsiveContainer>
                  <AreaChart data={d.adesao} margin={{ top: 14, right: 8, left: -18, bottom: 0 }}>
                    <defs><linearGradient id="gAd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={cor} stopOpacity={0.5} /><stop offset="100%" stopColor={cor} stopOpacity={0.02} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 5" stroke={grade} vertical={false} />
                    <XAxis dataKey="dia" tick={eixo} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                    <YAxis domain={[0, 100]} unit="%" tick={eixo} axisLine={false} tickLine={false} />
                    <Tooltip content={<Dica sufixo="%" />} />
                    <Area type="monotone" dataKey="Adesão" stroke={cor} strokeWidth={2.6} fill="url(#gAd)" dot={d.adesao.length <= 14 ? { r: 3, fill: cor, strokeWidth: 0 } : false} animationDuration={900}
                      label={d.adesao.length <= 14 ? { position: "top", fontSize: 10.5, fontWeight: 800, fill: tick, formatter: (v: unknown) => `${v}%` } : false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card titulo="Mix de ações por mês" sub="como o programa se distribui entre os tipos de ação" delay={0.05}>
              <div className="h-[290px]">
                <ResponsiveContainer>
                  <BarChart data={d.mixMes} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 5" stroke={grade} vertical={false} />
                    <XAxis dataKey="mes" tick={eixo} axisLine={false} tickLine={false} />
                    <YAxis tick={eixo} axisLine={false} tickLine={false} />
                    <Tooltip content={<Dica />} cursor={{ fill: "rgba(128,128,128,.08)" }} />
                    {chavesMix.map(a => <Bar key={a} dataKey={a} stackId="m" fill={paleta[ACAO_CURTA.indexOf(a) % paleta.length]} maxBarSize={38} animationDuration={800} />)}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Legenda itens={chavesMix.map(a => [a, paleta[ACAO_CURTA.indexOf(a) % paleta.length]] as [string, string])} />
            </Card>

            <Card titulo="Cobertura de equipes por base" sub="% das equipes ativas que receberam ao menos uma visita" delay={0.1}>
              <BarrasH itens={d.coberturaBase} formato={v => `${v}%`} max={100} />
            </Card>

            <Card titulo="Lideranças por faixa de aderência" sub="quantas lideranças estão em cada nível de cumprimento da meta" delay={0.05}>
              <Colunas itens={d.faixas} altura={230} />
            </Card>

            <Card titulo="Aderência média por gerência" sub="média da aderência dos observadores de cada gerência" delay={0.1}>
              <BarrasH itens={d.aderenciaGerencia} formato={v => `${v}%`} max={100} />
            </Card>

            <Card titulo="Dia do lançamento" sub="o programa acontece na quarta-feira; lançamentos fora dela indicam atraso" delay={0.05}>
              <Colunas itens={d.pontualidade} altura={230} />
            </Card>

            <Card titulo="Horário dos lançamentos" sub="distribuição das ações ao longo do dia" delay={0.1}>
              <div className="h-[230px]">
                <ResponsiveContainer>
                  <BarChart data={d.porHora} margin={{ top: 14, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 5" stroke={grade} vertical={false} />
                    <XAxis dataKey="hora" tick={eixo} axisLine={false} tickLine={false} />
                    <YAxis tick={eixo} axisLine={false} tickLine={false} />
                    <Tooltip content={<Dica />} cursor={{ fill: "rgba(128,128,128,.08)" }} />
                    <Bar dataKey="Ações" fill={cor} radius={[6, 6, 0, 0]} maxBarSize={30} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {d.inativos.length > 0 && (
            <Card titulo="Lideranças sem ação nas últimas 4 quartas" sub={`${d.inativos.length} observadores para acompanhar`} className="mt-5" delay={0.05}>
              <ul className="flex flex-wrap gap-2">
                {d.inativos.map(c => (
                  <li key={c.c} className="rounded-full bg-soft px-3 py-1.5 text-[12.5px] font-bold text-brand" title={`${c.f.toLowerCase()} · ${c.b}`}>{c.n} <span className="font-semibold text-ink/40">· {c.b}</span></li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </>
  );
}

function Legenda({ itens }: { itens: [string, string][] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] font-bold text-ink/55">
      {itens.map(([n, c]) => <span key={n} className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{n}</span>)}
    </div>
  );
}
