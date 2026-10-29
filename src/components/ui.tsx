import { animate, useInView, useMotionValue, useTransform, motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { clsx } from "clsx";
import { ChevronDown, Moon, Sun } from "lucide-react";
import { useTema } from "../store/tema";

const BASE = import.meta.env.BASE_URL;

export function Logo({ branco, className }: { branco?: boolean; className?: string }) {
  return (
    <img
      src={`${BASE}${branco ? "logo-cgb-branco.png" : "logo-cgb.png"}`}
      alt="CGB Energia"
      width={1512}
      height={596}
      draggable={false}
      className={clsx("select-none object-contain", className)}
    />
  );
}

/** Número que "rola" até o valor (reanima a cada mudança). */
export function CountUp({ valor, className, dec = 0 }: { valor: number; className?: string; dec?: number }) {
  const mv = useMotionValue(0);
  const txt = useTransform(mv, v => v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec }));
  const ref = useRef<HTMLSpanElement>(null);
  const vis = useInView(ref, { once: true });
  useEffect(() => {
    if (!vis) return;
    const c = animate(mv, valor, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [valor, vis, mv]);
  return <motion.span ref={ref} className={clsx("num", className)}>{txt}</motion.span>;
}

export function Select({ rotulo, valor, onChange, opcoes, className, neutro }: {
  rotulo: string; neutro?: boolean; valor: string | number; onChange: (v: string) => void;
  opcoes: { v: string | number; t: string }[]; className?: string;
}) {
  const ativo = !neutro && String(valor) !== "" && String(valor) !== "0";
  return (
    <label className={clsx("group relative block min-w-[104px] shrink-0", className)}>
      <span className="eyebrow absolute left-3.5 top-2 pointer-events-none !text-[9.5px]">{rotulo}</span>
      <select
        value={valor}
        onChange={e => onChange(e.target.value)}
        className={clsx(
          "w-full h-[52px] appearance-none rounded-2xl border pl-3.5 pr-8 pt-[18px] text-[14px] font-bold outline-none cursor-pointer transition",
          ativo ? "border-vinho-600/60 bg-soft text-brand" : "border-ink/10 bg-field text-ink",
          "focus:ring-4 focus:ring-vinho-600/15",
        )}
      >
        {opcoes.map(o => <option key={o.v} value={o.v}>{o.t}</option>)}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-[19px] text-ink/40" />
    </label>
  );
}

export function Card({ titulo, sub, direita, children, className, delay = 0 }: {
  titulo?: string; sub?: string; direita?: ReactNode; children: ReactNode; className?: string; delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={clsx("card p-5 sm:p-6 min-w-0", className)}
    >
      {(titulo || direita) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {titulo && <h3 className="display text-[26px] leading-none text-brand">{titulo}</h3>}
            {sub && <p className="mt-1.5 text-[12.5px] font-medium text-ink/50">{sub}</p>}
          </div>
          {direita}
        </header>
      )}
      {children}
    </motion.section>
  );
}

export const Vazio = ({ texto = "Sem dados para este filtro." }: { texto?: string }) => (
  <div className="grid h-full min-h-[120px] place-items-center text-[13px] font-semibold text-ink/35">{texto}</div>
);

export function TemaToggle({ escuro }: { escuro?: boolean }) {
  const { tema, alternar } = useTema();
  const noEscuro = tema === "escuro";
  return (
    <button onClick={alternar} aria-label={noEscuro ? "Usar tema claro" : "Usar tema escuro"} title={noEscuro ? "Tema claro" : "Tema escuro"}
      className={clsx("relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl shadow-sm transition active:scale-95",
        escuro ? "bg-white/10 text-white hover:bg-white/20" : "bg-field text-brand hover:bg-soft")}>
      <motion.span key={tema} initial={{ y: 16, rotate: -50, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
        {noEscuro ? <Sun size={19} /> : <Moon size={19} />}
      </motion.span>
    </button>
  );
}
