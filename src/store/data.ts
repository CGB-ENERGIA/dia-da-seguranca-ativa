import { create } from "zustand";
import type { Colab, Equipe, Reg } from "../lib/types";
import { kvGet, kvSet, regsLocais } from "../lib/db";
import { baixarRegs, remotoAtivo } from "../lib/remote";

interface DataState {
  pronto: boolean;
  erro: boolean;
  origem: string;
  colabs: Colab[];
  mapa: Map<number, Colab>;
  equipes: Equipe[];
  historico: Reg[];
  remotos: Reg[];
  locais: Reg[];
  carregar: () => Promise<void>;
  recarregarLocais: () => Promise<void>;
  atualizarRemoto: () => Promise<void>;
}

const base = import.meta.env.BASE_URL;
const buscar = async <T,>(arq: string): Promise<T> => {
  try {
    const r = await fetch(`${base}seed/${arq}`);
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    void kvSet(`seed:${arq}`, j);
    return j;
  } catch (e) {
    const c = await kvGet<T>(`seed:${arq}`);
    if (c) return c;
    throw e;
  }
};

export const useData = create<DataState>((set, get) => ({
  pronto: false, erro: false, origem: "", colabs: [], mapa: new Map(), equipes: [], historico: [], remotos: [], locais: [],

  async carregar() {
    try {
      const [roster, linhas, meta] = await Promise.all([
        buscar<{ colabs: Colab[]; equipes: Equipe[] }>("roster.json"),
        buscar<[string, number, string, number][]>("registros.json"),
        buscar<{ origem: string }>("meta.json").catch(() => ({ origem: "" })),
      ]);
      const historico: Reg[] = linhas.map((x, i) => ({
        id: `h${i}`, d: x[0].slice(0, 10), t: x[0].slice(11, 16), chapa: x[1], equipe: x[2], acao: x[3], origem: "hist",
      }));
      set({
        colabs: roster.colabs, mapa: new Map(roster.colabs.map(c => [c.c, c])), equipes: roster.equipes,
        historico, origem: meta.origem, pronto: true,
        remotos: (await kvGet<Reg[]>("remotos")) ?? [],
        locais: await regsLocais(),
      });
      void get().atualizarRemoto();
    } catch {
      set({ erro: true });
    }
  },
  async recarregarLocais() { set({ locais: await regsLocais() }); },
  async atualizarRemoto() {
    if (!remotoAtivo || !navigator.onLine) return;
    try {
      const r = await baixarRegs();
      await kvSet("remotos", r);
      set({ remotos: r });
    } catch { /* mantém cache */ }
  },
}));

/** Histórico + registros do app (remotos + locais ainda não presentes no remoto), sem duplicar. */
export function todosRegistros(s: Pick<DataState, "historico" | "remotos" | "locais">): Reg[] {
  const ids = new Set(s.remotos.map(r => r.id));
  return [...s.historico, ...s.remotos, ...s.locais.filter(r => !ids.has(r.id))];
}
