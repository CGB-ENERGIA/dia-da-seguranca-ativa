import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { clsx } from "clsx";
import {
  Camera, ChevronsLeft, CloudOff, FileClock, LayoutDashboard, LogOut, Maximize, Menu, Minimize,
  RefreshCw, Settings, UsersRound, Waypoints, X,
} from "lucide-react";
import { Logo } from "./ui";
import { useAuth } from "../store/auth";
import { useData } from "../store/data";
import { sincronizar, useSync } from "../lib/sync";
import { agora, diaSemanaExtenso } from "../lib/dates";

const ITENS = [
  { to: "/", rot: "Painel de Ações", icone: LayoutDashboard, fim: true },
  { to: "/colaboradores", rot: "Colaboradores", icone: UsersRound },
  { to: "/equipes", rot: "Equipes", icone: Waypoints },
  { to: "/meus", rot: "Meus lançamentos", icone: FileClock },
  { to: "/ajustes", rot: "Ajustes", icone: Settings },
];
const TITULOS: Record<string, string> = {
  "/": "Painel de Ações", "/colaboradores": "Colaboradores", "/equipes": "Equipes visitadas",
  "/meus": "Meus lançamentos", "/ajustes": "Ajustes", "/lancar": "Novo lançamento",
};

const guardar = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* */ } };
const ler = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

export default function Shell() {
  const [recolhido, setRecolhido] = useState(() => ler("dsa:menu") === "1");
  const [gaveta, setGaveta] = useState(false);
  const [tela, setTela] = useState(false);
  const loc = useLocation();
  const { chapa, sair } = useAuth();
  const colab = useData(s => (chapa ? s.mapa.get(chapa) : undefined));
  const { pendentes, online, sincronizando } = useSync();
  const hoje = agora();

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
  const titulo = TITULOS[loc.pathname] ?? "Dia da Segurança Ativa";

  const menu = (compacto: boolean) => (
    <div className="relative flex h-full flex-col overflow-hidden bg-vinho-950 text-white losangos">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-vinho-600/30 blur-3xl" />
      <div className={clsx("relative flex h-[84px] items-center", compacto ? "justify-center" : "px-6")}>
        {compacto
          ? <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="CGB" className="h-10 w-10 rounded-xl" />
          : <Logo branco className="h-9 w-auto" />}
      </div>

      <nav className="relative mt-3 flex flex-col gap-1 px-3">
        <NavLink to="/lancar" title="Lançar ação"
          className={({ isActive }) => clsx(
            "group mb-3 flex h-[52px] items-center gap-3 rounded-2xl bg-ambar font-extrabold text-vinho-950 shadow-[0_12px_28px_-12px_rgba(242,177,52,.8)] transition hover:brightness-105 active:scale-[.98]",
            compacto ? "justify-center" : "px-4", isActive && "ring-2 ring-white/70")}>
          <Camera size={20} strokeWidth={2.4} />
          {!compacto && <span className="text-[14.5px]">Lançar ação</span>}
        </NavLink>
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
        <div className={clsx("flex items-center gap-3 rounded-2xl bg-white/7 p-2.5", compacto && "justify-center")}>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-vinho-600 text-[14px] font-extrabold">
            {colab?.n.slice(0, 2).toUpperCase() ?? "··"}
          </div>
          {!compacto && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-bold">{colab?.n ?? "—"}</div>
              <div className="truncate text-[11.5px] text-white/50">{colab?.b} · {colab?.gr?.toLowerCase()}</div>
            </div>
          )}
          {!compacto && (
            <button onClick={sair} title="Sair" className="grid h-9 w-9 place-items-center rounded-xl text-white/60 transition hover:bg-white/10 hover:text-white">
              <LogOut size={17} />
            </button>
          )}
        </div>
        {compacto && (
          <button onClick={sair} title="Sair" className="mt-2 grid h-10 w-full place-items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white">
            <LogOut size={17} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-creme">
      {/* menu fixo (desktop) */}
      <aside className="relative z-30 hidden shrink-0 transition-[width] duration-500 ease-suave lg:block" style={{ width: largura }}>
        {menu(recolhido)}
      </aside>
      {/* botão de recolher: topo, do lado de fora do menu */}
      <button
        onClick={() => setRecolhido(v => !v)}
        aria-label={recolhido ? "Expandir menu" : "Recolher menu"}
        title={recolhido ? "Expandir menu" : "Recolher menu"}
        style={{ left: largura - 16 }}
        className="fixed top-[26px] z-40 hidden h-8 w-8 place-items-center rounded-full border border-black/10 bg-white text-vinho-800 shadow-[0_6px_16px_-6px_rgba(74,15,29,.5)] transition-[left,transform] duration-500 ease-suave hover:scale-110 lg:grid"
      >
        <ChevronsLeft size={16} className={clsx("transition-transform duration-500", recolhido && "rotate-180")} />
      </button>

      {/* gaveta (mobile) */}
      <AnimatePresence>
        {gaveta && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setGaveta(false)} />
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
          <button onClick={() => setGaveta(true)} className="grid h-11 w-11 place-items-center rounded-xl bg-white shadow-sm lg:hidden" aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="eyebrow">Dia da Segurança Ativa</div>
            <h1 className="display truncate text-[26px] leading-[1.05] sm:text-[34px] text-vinho-900">{titulo}</h1>
          </div>

          <div className={clsx("hidden items-center gap-2 rounded-full px-3.5 py-2 text-[12.5px] font-bold sm:flex",
            hoje.weekday === 3 ? "bg-ambar/25 text-[#7a5200]" : "bg-black/5 text-black/55")}>
            <span className={clsx("h-2 w-2 rounded-full", hoje.weekday === 3 ? "bg-ambar [animation:pulsa_1.6s_ease-in-out_infinite]" : "bg-black/25")} />
            {hoje.weekday === 3 ? "Hoje é dia de segurança ativa" : `${diaSemanaExtenso()} · lançamentos nas quartas`}
          </div>

          <button onClick={() => void sincronizar()} title={online ? "Sincronizar agora" : "Sem conexão"}
            className={clsx("flex h-11 items-center gap-2 rounded-xl px-3.5 text-[12.5px] font-bold shadow-sm transition",
              !online ? "bg-black/80 text-white" : pendentes ? "bg-ambar text-vinho-950" : "bg-white text-black/60")}>
            {!online ? <CloudOff size={16} /> : <RefreshCw size={16} className={clsx(sincronizando && "animate-spin")} />}
            <span className="hidden sm:inline">{!online ? "Offline" : pendentes ? `${pendentes} a enviar` : "Tudo enviado"}</span>
            {!online && pendentes > 0 && <span className="rounded-full bg-ambar px-1.5 text-vinho-950">{pendentes}</span>}
          </button>

          <button onClick={alternarTela} title={tela ? "Sair da tela cheia" : "Tela cheia"} aria-label="Tela cheia"
            className="grid h-11 w-11 place-items-center rounded-xl bg-white text-vinho-800 shadow-sm transition hover:bg-vinho-50">
            {tela ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </header>

        <main className="rolagem min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-24 sm:px-8 lg:pb-10">
          <AnimatePresence mode="wait">
            <motion.div key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* barra inferior (mobile) */}
        <nav className="fixed inset-x-3 bottom-3 z-30 flex h-16 items-center justify-around rounded-3xl bg-vinho-950 px-2 text-white shadow-2xl lg:hidden">
          {[ITENS[0], ITENS[1], null, ITENS[2], ITENS[3]].map((it, i) =>
            it ? (
              <NavLink key={it.to} to={it.to} end={it.fim}
                className={({ isActive }) => clsx("grid h-12 w-14 place-items-center rounded-2xl", isActive ? "bg-white/15" : "text-white/55")}>
                <it.icone size={21} />
              </NavLink>
            ) : (
              <NavLink key={i} to="/lancar" className="-mt-8 grid h-16 w-16 place-items-center rounded-full bg-ambar text-vinho-950 shadow-[0_10px_24px_-6px_rgba(242,177,52,.9)] ring-4 ring-creme">
                <Camera size={26} strokeWidth={2.4} />
              </NavLink>
            ))}
        </nav>
      </div>
    </div>
  );
}
