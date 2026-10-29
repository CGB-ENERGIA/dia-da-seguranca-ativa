import { motion } from "motion/react";
import { clsx } from "clsx";
import { Vazio } from "./ui";

export const CORES = ["#4a0f1d", "#701627", "#9c2a42", "#cd6f81", "#f2b134", "#8a8583", "#df9fab"];

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
              className={clsx("group grid w-full grid-cols-[84px_1fr_auto] items-center gap-3 rounded-xl px-1.5 py-1 text-left transition", onClick && "hover:bg-vinho-50", on && "bg-vinho-50")}>
              <span className={clsx("truncate text-[12.5px] font-bold", on ? "text-vinho-700" : "text-tinta/80")} title={it.nome}>{it.nome}</span>
              <span className="h-[26px] overflow-hidden rounded-lg bg-black/[.045]">
                <motion.span className={clsx("block h-full rounded-lg", on ? "bg-ambar" : "bg-gradient-to-r from-vinho-800 to-vinho-600")}
                  initial={{ width: 0 }} animate={{ width: `${Math.max(2, (it.valor / m) * 100)}%` }}
                  transition={{ duration: 0.8, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }} />
              </span>
              <span className="num min-w-[34px] text-right text-[13px] font-extrabold text-vinho-900">{formato ? formato(it.valor) : it.valor.toLocaleString("pt-BR")}</span>
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
            <span className="num text-[13px] font-extrabold text-vinho-900">{it.valor}</span>
            <motion.span className={clsx("w-full max-w-[56px] rounded-t-xl", on ? "bg-ambar" : "bg-gradient-to-t from-vinho-900 to-vinho-600 group-hover:from-vinho-700")}
              initial={{ height: 0 }} animate={{ height: `${Math.max(3, (it.valor / m) * (altura - 56))}px` }}
              transition={{ duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }} />
            <span className="text-[11.5px] font-bold text-black/50">{it.rot ?? it.nome}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Anel de progresso. */
export function Anel({ pct, tam = 120, cor = "#701627", fundo = "rgba(35,22,25,.08)", children }: {
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
