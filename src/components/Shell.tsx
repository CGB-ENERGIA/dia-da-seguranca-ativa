import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { clsx } from "clsx";
import { ChevronsLeft, LayoutDashboard, Maximize, Menu, Minimize, Settings2, UsersRound, Waypoints, X, Camera } from "lucide-react";
import { Logo, TemaToggle } from "./ui";

const ITENS = [
  { to: "/relatorio", rot: "Painel de Ações", icone: LayoutDashboard, fim: true },
  { to: "/relatorio/colaboradores", rot: "Colaboradores", icone: UsersRound },
  { to: "/relatorio/equipes", rot: "Equipes", icone: Waypoints },
  { to: "/relatorio/config", rot: "Configurações", icone: Settings2 },
];
const TITULOS: Record<string, [string, string]> = {
  "/relatorio": ["Visão geral", "Painel de Ações"],
  "/relatorio/colaboradores": ["Desempenho", "Colaboradores"],
  "/relatorio/equipes": ["Cobertura", "Equipes visitadas"],
  "/relatorio/config": ["Gestão", "Configurações"],
};

const guardar = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sem storage */ } };
const ler = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

export default function Shell() {
  const [recolhido, setRecolhido] = useState(() => ler("dsa:menu") === "1");
  const [gaveta, setGaveta] = useState(false);
  const [tela, setTela] = useState(false);
  const loc = useLocation();

  useEffect(() => { guardar("dsa:menu", recolhido ? "1" : "0"); }, [recolhido]);
  useEffect(() => { setGaveta(false); document.querySelector("main")?.scrollTo(0, 0); }, [loc.pathname]);
  useEffect(() => {
    const f = () => setTela(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);
  const alternarTela = () =>
    document.fullscreenElement ? void document.exitFullscreen() : void document.documentElement.requestFullscreen?.();

  const largura = recolhido ? 84 : 272;
  const [sobre, titulo] = TITULOS[loc.pathname] ?? ["Relatório", "Dia da Segurança Ativa"];

  const menu = (compacto: boolean) => (
    <div className="relative flex h-full flex-col overflow-hidden bg-vinho-950 text-white">
      <div className="pointer-events-none absolute inset-0 malha opacity-60" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-vinho-600/30 blur-3xl" />
      <div className={clsx("relative flex h-[84px] items-center", compacto ? "justify-center" : "px-6")}>
        {compacto
          ? <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="CGB" className="h-10 w-10 rounded-xl" />
          : <Logo branco className="h-9 w-auto" />}
      </div>

      <nav className="relative mt-3 flex flex-col gap-1 px-3">
        {ITENS.map(({ to, rot, icone: Icone, fim }) => (
          <NavLink key={to} to={to} end={fim} title={rot}
            className={({ isActive }) => clsx(
              "relative flex h-12 items-center gap-3 rounded-2xl text-[14px] font-semibold transition",
              compacto ? "justify-center" : "px-4",
              isActive ? "bg-white/12 text-white" : "text-white/60 hover:bg-white/6 hover:text-white")}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="ativo" className="absolute left-0 top-3 h-6 w-1 rounded-r-full bg-ambar" />}
                <Icone size={19} strokeWidth={2.1} />
                {!compacto && <span>{rot}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="relative mt-auto p-3">
        <a href="#/registrar" title="Abrir tela de registro"
          className={clsx("flex items-center gap-3 rounded-2xl bg-ambar/15 p-3 text-ambar transition hover:bg-ambar/25", compacto && "justify-center")}>
          <Camera size={18} />
          {!compacto && <span className="text-[13px] font-bold">Ir para o registro de ações</span>}
        </a>
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-canvas">
      <aside className="relative z-30 hidden shrink-0 transition-[width] duration-500 ease-suave lg:block" style={{ width: largura }}>
        {menu(recolhido)}
      </aside>
      <button
        onClick={() => setRecolhido(v => !v)}
        aria-label={recolhido ? "Expandir menu" : "Recolher menu"}
        title={recolhido ? "Expandir menu" : "Recolher menu"}
        style={{ left: largura - 16 }}
        className="fixed top-[26px] z-40 hidden h-8 w-8 place-items-center rounded-full border border-ink/10 bg-field text-brand shadow-[0_6px_16px_-6px_rgba(0,0,0,.5)] transition-[left,transform] duration-500 ease-suave hover:scale-110 lg:grid"
      >
        <ChevronsLeft size={16} className={clsx("transition-transform duration-500", recolhido && "rotate-180")} />
      </button>

      <AnimatePresence>
        {gaveta && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-[#000]/50 backdrop-blur-sm lg:hidden" onClick={() => setGaveta(false)} />
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed inset-y-0 left-0 z-50 w-[272px] lg:hidden">
              {menu(false)}
              <button onClick={() => setGaveta(false)} className="absolute right-3 top-6 text-white/70"><X size={20} /></button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[84px] shrink-0 items-center gap-3 px-4 sm:px-8">
          <button onClick={() => setGaveta(true)} className="grid h-11 w-11 place-items-center rounded-xl bg-field shadow-sm lg:hidden" aria-label="Abrir menu"><Menu size={20} /></button>
          <div className="min-w-0 flex-1">
            <div className="eyebrow">{sobre}</div>
            <h1 className="display truncate text-[24px] leading-[1.15] text-brand sm:text-[30px]">{titulo}</h1>
          </div>
          <TemaToggle />
          <button onClick={alternarTela} title={tela ? "Sair da tela cheia" : "Tela cheia"} aria-label="Tela cheia"
            className="grid h-11 w-11 place-items-center rounded-xl bg-field text-brand shadow-sm transition hover:bg-soft">
            {tela ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </header>

        <main className="rolagem min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-24 sm:px-8 lg:pb-10">
          <AnimatePresence mode="wait">
            <motion.div key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className="fixed inset-x-3 bottom-3 z-30 flex h-16 items-center justify-around rounded-3xl bg-vinho-950 px-2 text-white shadow-2xl lg:hidden">
          {ITENS.map(it => (
            <NavLink key={it.to} to={it.to} end={it.fim} className={({ isActive }) => clsx("grid h-12 w-16 place-items-center rounded-2xl", isActive ? "bg-white/15" : "text-white/55")}>
              <it.icone size={21} />
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
