import { animate, useInView, useMotionValue, useTransform, motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";

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
          ativo ? "border-vinho-600/60 bg-vinho-50 text-vinho-800" : "border-black/10 bg-white text-tinta",
          "focus:ring-4 focus:ring-vinho-600/15",
        )}
      >
        {opcoes.map(o => <option key={o.v} value={o.v}>{o.t}</option>)}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-[19px] text-black/40" />
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
            {titulo && <h3 className="display text-[26px] leading-none text-vinho-900">{titulo}</h3>}
            {sub && <p className="mt-1.5 text-[12.5px] font-medium text-black/50">{sub}</p>}
          </div>
          {direita}
        </header>
      )}
      {children}
    </motion.section>
  );
}

export const Vazio = ({ texto = "Sem dados para este filtro." }: { texto?: string }) => (
  <div className="grid h-full min-h-[120px] place-items-center text-[13px] font-semibold text-black/35">{texto}</div>
);
