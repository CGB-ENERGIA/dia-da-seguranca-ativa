import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import Shell from "./components/Shell";
import RegistrarShell from "./components/RegistrarShell";

import Login from "./pages/Login";
import Painel from "./pages/Painel";
import Colaboradores from "./pages/Colaboradores";
import Equipes from "./pages/Equipes";
import Config from "./pages/Config";
import Lancar from "./pages/Lancar";
import Meus from "./pages/Meus";
import { useAuth } from "./store/auth";
import { useData } from "./store/data";
import { iniciarSync } from "./lib/sync";

/** Limpa service worker e caches (versão antiga presa no aparelho) e recarrega. */
async function limparERecarregar() {
  try { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch { /* sem SW */ }
  try { for (const k of await caches.keys()) await caches.delete(k); } catch { /* sem cache */ }
  location.reload();
}

function FalhaCarga({ msg }: { msg: string }) {
  useEffect(() => {
    let ja = false;
    try { ja = sessionStorage.getItem("dsa:auto-limpeza") === "1"; sessionStorage.setItem("dsa:auto-limpeza", "1"); } catch { /* */ }
    if (!ja) void limparERecarregar(); // uma tentativa automática por sessão
  }, []);
  return (
    <div className="grid h-full place-items-center bg-canvas p-8 text-center">
      <div className="max-w-[420px]">
        <h1 className="display text-[24px] text-brand">Não foi possível carregar os dados</h1>
        <p className="mt-3 text-[14.5px] font-medium text-ink/60">Pode ser uma versão antiga guardada no aparelho ou conexão instável.</p>
        <button className="btn btn-vinho mt-6 w-full" onClick={() => void limparERecarregar()}>Limpar e recarregar</button>
        {msg && <p className="mt-4 break-words font-mono text-[11px] text-ink/40">{msg}</p>}
      </div>
    </div>
  );
}

function Registrar() {
  const chapa = useAuth(s => s.chapa);
  return chapa ? <RegistrarShell /> : <Login />;
}

function Relatorio() {
  const adm = useAuth(s => s.adm);
  return adm ? <Shell /> : <Login modo="relatorio" />;
}

export default function App() {
  const chapa = useAuth(s => s.chapa);
  const sair = useAuth(s => s.sair);
  const { pronto, erro, erroMsg, mapa, carregar } = useData();

  useEffect(() => { void carregar(); iniciarSync(); }, [carregar]);
  useEffect(() => { if (pronto) (window as unknown as { __dsa_ok: boolean }).__dsa_ok = true; }, [pronto]);
  // nome salvo que não existe mais no cadastro
  useEffect(() => { if (pronto && chapa && !mapa.has(chapa)) sair(); }, [pronto, chapa, mapa, sair]);

  if (erro) return <FalhaCarga msg={erroMsg} />;
  if (!pronto) return <div className="grid h-full place-items-center bg-canvas"><div className="esqueleto h-16 w-64" /></div>;

  return (
    <HashRouter>
      <Routes>
        <Route index element={<Navigate to="/registrar" replace />} />
        <Route path="registrar" element={<Registrar />}>
          <Route index element={<Lancar />} />
          <Route path="meus" element={<Meus />} />
        </Route>
        <Route path="relatorio" element={<Relatorio />}>
          <Route index element={<Painel />} />
          <Route path="colaboradores" element={<Colaboradores />} />
          <Route path="equipes" element={<Equipes />} />
          <Route path="config" element={<Config />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
