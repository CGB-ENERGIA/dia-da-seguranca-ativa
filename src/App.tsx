import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Painel from "./pages/Painel";
import Colaboradores from "./pages/Colaboradores";
import Equipes from "./pages/Equipes";
import Lancar from "./pages/Lancar";
import Meus from "./pages/Meus";
import Ajustes from "./pages/Ajustes";
import { useAuth } from "./store/auth";
import { useData } from "./store/data";
import { iniciarSync } from "./lib/sync";

export default function App() {
  const chapa = useAuth(s => s.chapa);
  const sair = useAuth(s => s.sair);
  const { pronto, erro, mapa, carregar } = useData();

  useEffect(() => { void carregar(); iniciarSync(); }, [carregar]);
  // matrícula salva que não existe mais no cadastro
  useEffect(() => { if (pronto && chapa && !mapa.has(chapa)) sair(); }, [pronto, chapa, mapa, sair]);

  if (erro) return <div className="grid h-full place-items-center p-8 text-center font-bold text-vinho-700">Não foi possível carregar os dados. Verifique a conexão e abra de novo.</div>;
  if (!chapa) return <Login />;
  if (!pronto) return <div className="grid h-full place-items-center"><div className="esqueleto h-16 w-64" /></div>;

  return (
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Painel />} />
          <Route path="colaboradores" element={<Colaboradores />} />
          <Route path="equipes" element={<Equipes />} />
          <Route path="lancar" element={<Lancar />} />
          <Route path="meus" element={<Meus />} />
          <Route path="ajustes" element={<Ajustes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
