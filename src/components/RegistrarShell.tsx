import { NavLink, Outlet } from "react-router-dom";
import { clsx } from "clsx";
import { Camera, CloudOff, FileClock, LogOut, RefreshCw } from "lucide-react";
import { Logo, TemaToggle } from "./ui";
import { useAuth } from "../store/auth";
import { useData } from "../store/data";
import { sincronizar, useSync } from "../lib/sync";
import { agora } from "../lib/dates";

/** Moldura enxuta da tela de registro (link dos observadores). */
export default function RegistrarShell() {
  const { chapa, sair } = useAuth();
  const colab = useData(s => (chapa ? s.mapa.get(chapa) : undefined));
  const { pendentes, online, sincronizando } = useSync();
  const quarta = agora().weekday === 3;

  return (
    <div className="flex h-full flex-col bg-canvas">
      <header className="flex h-[76px] shrink-0 items-center gap-3 px-4 sm:px-8">
        <Logo className="h-9 w-auto dark:hidden" />
        <Logo branco className="hidden h-9 w-auto dark:block" />
        <nav className="ml-4 hidden gap-1 rounded-2xl bg-ink/5 p-1 sm:flex">
          {[["/registrar", "Lançar ação", Camera, true], ["/registrar/meus", "Meus lançamentos", FileClock, false]].map(([to, t, I, fim]: any) => (
            <NavLink key={to} to={to} end={fim} className={({ isActive }) => clsx("flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-[13px] font-bold transition", isActive ? "bg-field text-brand shadow" : "text-ink/50")}>
              <I size={16} />{t}
            </NavLink>
          ))}
        </nav>
        <div className="flex-1" />
        <span className={clsx("hidden items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-[12.5px] font-bold xl:flex", quarta ? "bg-ambar/25 text-[#8a5d00] dark:text-ambar" : "bg-ink/5 text-ink/55")}>
          <span className={clsx("h-2 w-2 rounded-full", quarta ? "bg-ambar [animation:pulsa_1.6s_ease-in-out_infinite]" : "bg-ink/25")} />
          {quarta ? "Hoje é dia de segurança ativa" : "Lançamentos nas quartas-feiras"}
        </span>
        <button onClick={() => void sincronizar()} title={online ? "Sincronizar agora" : "Sem conexão"}
          className={clsx("flex h-11 items-center gap-2 rounded-xl px-3.5 text-[12.5px] font-bold shadow-sm transition",
            !online ? "bg-[#1f1f1f] text-white" : pendentes ? "bg-ambar text-vinho-950" : "bg-field text-ink/60")}>
          {!online ? <CloudOff size={16} /> : <RefreshCw size={16} className={clsx(sincronizando && "animate-spin")} />}
          <span className="hidden whitespace-nowrap lg:inline">{!online ? "Offline" : pendentes ? `${pendentes} a enviar` : "Tudo enviado"}</span>
          {!online && pendentes > 0 && <span className="rounded-full bg-ambar px-1.5 text-vinho-950">{pendentes}</span>}
        </button>
        <TemaToggle />
        <div className="flex items-center gap-2 rounded-xl bg-field py-1.5 pl-1.5 pr-1.5 shadow-sm">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-vinho-700 text-[12px] font-extrabold text-white">{colab?.nome.slice(0, 2) ?? "··"}</div>
          <span className="hidden max-w-[140px] truncate text-[13px] font-bold lg:block">{colab?.n}</span>
          <button onClick={sair} title="Sair" className="grid h-10 w-10 place-items-center rounded-lg text-ink/45 hover:bg-soft hover:text-brand"><LogOut size={16} /></button>
        </div>
      </header>
      <main className="rolagem min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-2 sm:px-8">
        <Outlet />
      </main>
      <nav className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-30 flex h-16 items-center justify-around rounded-3xl bg-vinho-950 px-3 text-white shadow-2xl sm:hidden">
        {[["/registrar", "Lançar", Camera, true], ["/registrar/meus", "Meus", FileClock, false]].map(([to, t, I, fim]: any) => (
          <NavLink key={to} to={to} end={fim} className={({ isActive }) => clsx("flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-[13px] font-bold", isActive ? "bg-white/15" : "text-white/55")}>
            <I size={19} />{t}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
