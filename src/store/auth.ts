import { create } from "zustand";

interface AuthState {
  chapa: number | null;
  /** libera lançamento fora da quarta-feira (apenas grupo SEGURANÇA) */
  liberarDia: boolean;
  entrar: (c: number) => void;
  sair: () => void;
  setLiberar: (v: boolean) => void;
}

const ler = () => {
  try { return Number(localStorage.getItem("dsa:chapa")) || null; } catch { return null; }
};

export const useAuth = create<AuthState>(set => ({
  chapa: ler(),
  liberarDia: false,
  entrar: c => { try { localStorage.setItem("dsa:chapa", String(c)); } catch { /* sem storage */ } set({ chapa: c }); },
  sair: () => { try { localStorage.removeItem("dsa:chapa"); } catch { /* sem storage */ } set({ chapa: null, liberarDia: false }); },
  setLiberar: v => set({ liberarDia: v }),
}));
