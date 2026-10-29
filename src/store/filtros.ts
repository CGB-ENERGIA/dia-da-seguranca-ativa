import { create } from "zustand";
import { agora } from "../lib/dates";
import { filtrosIniciais, type Filtros } from "../lib/analytics";

interface S {
  f: Filtros;
  set: (p: Partial<Filtros>) => void;
  limpar: () => void;
}
const a = agora();
const inicial = () => filtrosIniciais(+a.d.slice(0, 4), +a.d.slice(5, 7));

export const useFiltros = create<S>(set => ({
  f: inicial(),
  set: p => set(s => ({ f: { ...s.f, ...p } })),
  limpar: () => set({ f: inicial() }),
}));
