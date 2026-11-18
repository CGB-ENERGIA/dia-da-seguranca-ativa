import { create } from "zustand";

interface AuthState {
  chapa: number | null;
  /** usuário do relatório (administrador) */
  adm: string | null;
  entrarAdm: (u: string) => void;
  sairAdm: () => void;
  entrar: (c: number) => void;
  sair: () => void;
}

const lerAdm = () => { try { return localStorage.getItem("dsa:adm"); } catch { return null; } };
const ler = () => {
  try { return Number(localStorage.getItem("dsa:chapa")) || null; } catch { return null; }
};

export const useAuth = create<AuthState>(set => ({
  chapa: ler(),
  adm: lerAdm(),
  entrarAdm: u => { try { localStorage.setItem("dsa:adm", u); } catch { /* sem storage */ } set({ adm: u }); },
  sairAdm: () => { try { localStorage.removeItem("dsa:adm"); } catch { /* sem storage */ } set({ adm: null }); },
  entrar: c => { try { localStorage.setItem("dsa:chapa", String(c)); } catch { /* sem storage */ } set({ chapa: c }); },
  sair: () => { try { localStorage.removeItem("dsa:chapa"); } catch { /* sem storage */ } set({ chapa: null }); },
}));
