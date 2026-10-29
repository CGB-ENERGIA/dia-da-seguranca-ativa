import { motion } from "motion/react";
import { clsx } from "clsx";
import { Vazio } from "./ui";

export const CORES = ["#4a0f1d", "#701627", "#9c2a42", "#cd6f81", "#f2b134", "#8a8583", "#df9fab"];
export const CORES_ESCURO = ["#f2b9c4", "#e0788d", "#cd6f81", "#b74a60", "#f2b134", "#9a9390", "#df9fab"];

/** Barras horizontais animadas; clicar filtra. */
export function BarrasH({ itens, ativo, onClick, max, formato }: {
  itens: { nome: string; valor: number; extra?: string }[]; ativo?: string; onClick?: (n: string) => void; max?: number;
  formato?: (n: number) => string;
}) {
  if (!itens.length) return <Vazio />;
  const m = max ?? Math.max(...itens.map(i => i.valor), 1);
  return (
    <ul className="space-y-2.5">
      {itens.map((it, i) => {
        const on = ativo === it.nome;
        return (
          <li key={it.nome}>
            <button onClick={() => onClick?.(on ? "" : it.nome)} disabled={!onClick}
              className={clsx("group grid w-full grid-cols-[84px_1fr_auto] items-center gap-3 rounded-xl px-1.5 py-1 text-left transition", onClick && "hover:bg-soft", on && "bg-soft")}>
              <span className={clsx("truncate text-[12.5px] font-bold", on ? "text-brand" : "text-ink/80")} title={it.nome}>{it.nome}</span>
              <span className="h-[26px] overflow-hidden rounded-lg bg-ink/[.045]">
                <motion.span className={clsx("block h-full rounded-lg", on ? "bg-ambar" : "bg-gradient-to-r from-vinho-800 to-vinho-600 dark:from-vinho-600 dark:to-vinho-400")}
                  initial={{ width: 0 }} animate={{ width: `${Math.max(2, (it.valor / m) * 100)}%` }}
                  transition={{ duration: 0.8, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }} />
              </span>
              <span className="num min-w-[34px] text-right text-[13px] font-extrabold text-brand">{formato ? formato(it.valor) : it.valor.toLocaleString("pt-BR")}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Colunas verticais com valor no topo. */
export function Colunas({ itens, ativo, onClick, altura = 190 }: {
  itens: { nome: string; valor: number; rot?: string }[]; ativo?: string; onClick?: (n: string) => void; altura?: number;
}) {
  const m = Math.max(...itens.map(i => i.valor), 1);
  return (
    <div className="flex items-end justify-around gap-2.5" style={{ height: altura }}>
      {itens.map((it, i) => {
        const on = ativo === it.nome;
        return (
          <button key={it.nome} onClick={() => onClick?.(on ? "" : it.nome)} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="num text-[13px] font-extrabold text-brand">{it.valor}</span>
            <motion.span className={clsx("w-full max-w-[56px] rounded-t-xl", on ? "bg-ambar" : "bg-gradient-to-t from-vinho-900 to-vinho-600 group-hover:from-vinho-700 dark:from-vinho-600 dark:to-vinho-400")}
              initial={{ height: 0 }} animate={{ height: `${Math.max(3, (it.valor / m) * (altura - 56))}px` }}
              transition={{ duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }} />
            <span className="text-[11.5px] font-bold text-ink/50">{it.rot ?? it.nome}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Anel de progresso. */
export function Anel({ pct, tam = 120, cor = "var(--color-vinho-500)", fundo = "color-mix(in srgb, var(--color-ink) 10%, transparent)", children }: {
  pct: number; tam?: number; cor?: string; fundo?: string; children?: React.ReactNode;
}) {
  const r = tam / 2 - 9, c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: tam, height: tam }}>
      <svg width={tam} height={tam} className="-rotate-90">
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke={fundo} strokeWidth={10} />
        <motion.circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke={cor} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.min(1, pct)) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/** Linha de tendência decorativa para o herói. */
export function Spark({ dados, className }: { dados: number[]; className?: string }) {
  if (dados.length < 2) return null;
  const W = 600, H = 120, m = Math.max(...dados, 1);
  const pts = dados.map((v, i) => [(i / (dados.length - 1)) * W, H - 10 - (v / m) * (H - 24)]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} aria-hidden>
      <defs><linearGradient id="spk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f2b134" stopOpacity=".35" /><stop offset="1" stopColor="#f2b134" stopOpacity="0" /></linearGradient></defs>
      <path d={d + ` L ${W} ${H} L 0 ${H} Z`} fill="url(#spk)" />
      <motion.path d={d} fill="none" stroke="#f2b134" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: "easeOut" }} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
