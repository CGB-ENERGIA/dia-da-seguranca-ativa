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
  const { pronto, erro, mapa, carregar } = useData();

  useEffect(() => { void carregar(); iniciarSync(); }, [carregar]);
  useEffect(() => { if (pronto) (window as unknown as { __dsa_ok: boolean }).__dsa_ok = true; }, [pronto]);
  // nome salvo que não existe mais no cadastro
  useEffect(() => { if (pronto && chapa && !mapa.has(chapa)) sair(); }, [pronto, chapa, mapa, sair]);

  if (erro) return <div className="grid h-full place-items-center p-8 text-center font-bold text-brand">Não foi possível carregar os dados. Verifique a conexão e abra de novo.</div>;
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
