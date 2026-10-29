import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowUpRight, Camera, Check, Copy, LineChart } from "lucide-react";
import { Logo, TemaToggle } from "../components/ui";

const base = () => location.href.split("#")[0];

function Cartao({ to, icone: I, titulo, texto, rota, delay }: { to: string; icone: typeof Camera; titulo: string; texto: string; rota: string; delay: number }) {
  const [ok, setOk] = useState(false);
  const url = `${base()}#${rota}`;
  const copiar = async () => {
    try { await navigator.clipboard.writeText(url); setOk(true); setTimeout(() => setOk(false), 1600); } catch { /* sem permissão */ }
  };
  return (
    <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="card group relative flex flex-col overflow-hidden p-7">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-vinho-500/15 blur-3xl transition group-hover:bg-ambar/25" />
      <div className="mb-8 grid h-14 w-14 place-items-center rounded-2xl bg-vinho-700 text-white shadow-lg"><I size={26} /></div>
      <h2 className="display text-[28px] leading-tight text-brand">{titulo}</h2>
      <p className="mt-2 flex-1 text-[14.5px] font-medium leading-relaxed text-ink/55">{texto}</p>
      <div className="mt-6 flex items-center gap-2 rounded-xl bg-ink/5 py-1.5 pl-3 pr-1.5">
        <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink/60">{url}</code>
        <button onClick={copiar} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-field text-brand shadow-sm transition hover:bg-soft" title="Copiar link">
          {ok ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <Link to={to} className="btn btn-vinho mt-4 w-full">Abrir <ArrowUpRight size={18} /></Link>
    </motion.div>
  );
}

export default function Home() {
  return (
    <div className="relative isolate flex min-h-full flex-col items-center justify-center overflow-hidden bg-canvas px-6 py-14">
      <div className="aurora absolute inset-x-0 top-0 -z-10 h-[520px] [mask-image:linear-gradient(#000_72%,transparent)]" />
      <div className="absolute right-5 top-5"><TemaToggle escuro /></div>
      <Logo branco className="mb-10 h-12 w-auto" />
      <h1 className="display max-w-[680px] text-center text-[clamp(34px,5vw,58px)] leading-[1.05] text-white">Dia da Segurança Ativa</h1>
      <p className="mt-3 max-w-[520px] text-center text-[15px] font-medium text-white/70">Escolha por onde entrar. Cada tela tem o seu próprio link.</p>
      <div className="mt-12 grid w-full max-w-[880px] gap-5 md:grid-cols-2">
        <Cartao to="/registrar" rota="/registrar" icone={Camera} titulo="Registrar ação" delay={0.1}
          texto="Para os observadores em campo: escolha seu nome, a equipe visitada e a ação, e tire a foto carimbada. Funciona sem sinal." />
        <Cartao to="/relatorio" rota="/relatorio" icone={LineChart} titulo="Relatório" delay={0.2}
          texto="Painel de ações, colaboradores e equipes, com filtros e metas. A aba Configurações edita cadastros e a meta." />
      </div>
    </div>
  );
}
