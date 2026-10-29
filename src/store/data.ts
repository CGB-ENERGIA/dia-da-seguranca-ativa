import { create } from "zustand";
import type { Colab, Equipe, Reg } from "../lib/types";
import { kvGet, kvSet, regsLocais } from "../lib/db";
import { ehLideranca } from "../lib/lideranca";
import { baixarRegs, gravarConfig, lerColaboradoresRemotos, lerConfig, remotoAtivo } from "../lib/remote";

/** Alterações feitas na aba Configurações; ficam por cima do cadastro importado. */
export interface Edicoes {
  colabs: Record<number, Colab>;
  equipes: Record<string, Equipe>;
  meta: number; // ações por quarta-feira (padrão 1)
  metas: Record<number, number>; // meta individual (opcional)
}
const vazio = (): Edicoes => ({ colabs: {}, equipes: {}, meta: 1, metas: {} });

interface DataState {
  pronto: boolean;
  erro: boolean;
  origem: string;
  colabsBase: Colab[];
  equipesBase: Equipe[];
  edicoes: Edicoes;
  colabs: Colab[];
  mapa: Map<number, Colab>;
  equipes: Equipe[];
  historico: Reg[];
  remotos: Reg[];
  locais: Reg[];
  carregar: () => Promise<void>;
  recarregarLocais: () => Promise<void>;
  atualizarRemoto: () => Promise<void>;
  salvarColab: (c: Colab) => Promise<void>;
  salvarEquipe: (e: Equipe) => Promise<void>;
  setMeta: (n: number) => Promise<void>;
  setMetaColab: (chapa: number, n: number | null) => Promise<void>;
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

function derivar(colabsBase: Colab[], equipesBase: Equipe[], ed: Edicoes) {
  const m = new Map<number, Colab>(colabsBase.map(c => [c.c, c]));
  for (const c of Object.values(ed.colabs)) m.set(c.c, c);
  const e = new Map<string, Equipe>(equipesBase.map(x => [x.p, x]));
  for (const x of Object.values(ed.equipes)) e.set(x.p, x);
  return { colabs: [...m.values()], mapa: m, equipes: [...e.values()] };
}

export const useData = create<DataState>((set, get) => {
  const persistir = async (ed: Edicoes) => {
    const s = get();
    set({ edicoes: ed, ...derivar(s.colabsBase, s.equipesBase, ed) });
    await kvSet("edicoes", ed);
    if (remotoAtivo) void gravarConfig("edicoes", ed).catch(() => {});
  };

  return {
    pronto: false, erro: false, origem: "", colabsBase: [], equipesBase: [], edicoes: vazio(),
    colabs: [], mapa: new Map(), equipes: [], historico: [], remotos: [], locais: [],

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
        let ed = { ...vazio(), ...((await kvGet<Edicoes>("edicoes")) ?? {}) };
        let base = roster.colabs;
        if (remotoAtivo && navigator.onLine) {
          const [cfg, rem] = await Promise.all([lerConfig<Edicoes>("edicoes").catch(() => null), lerColaboradoresRemotos().catch(() => null)]);
          if (cfg) ed = { ...vazio(), ...cfg };
          if (rem?.length) {
            const antigos = new Map(base.map(c => [c.c, c]));
            base = rem.map(r => { const a = antigos.get(r.c!); return { gr: "", ger: "", ...a, ...r, l: a?.l ?? (ehLideranca(r.f ?? "") ? 1 : 0) } as Colab; });
          }
        }
        set({
          colabsBase: base, equipesBase: roster.equipes, edicoes: ed, ...derivar(base, roster.equipes, ed),
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
    salvarColab: c => persistir({ ...get().edicoes, colabs: { ...get().edicoes.colabs, [c.c]: c } }),
    salvarEquipe: e => persistir({ ...get().edicoes, equipes: { ...get().edicoes.equipes, [e.p]: e } }),
    setMeta: n => persistir({ ...get().edicoes, meta: Math.max(0, n) }),
    setMetaColab: (chapa, n) => {
      const metas = { ...get().edicoes.metas };
      if (n == null) delete metas[chapa]; else metas[chapa] = Math.max(0, n);
      return persistir({ ...get().edicoes, metas });
    },
  };
});

/** Histórico + registros do app (remotos + locais ainda não presentes no remoto), sem duplicar. */
export function todosRegistros(s: Pick<DataState, "historico" | "remotos" | "locais">): Reg[] {
  const ids = new Set(s.remotos.map(r => r.id));
  return [...s.historico, ...s.remotos, ...s.locais.filter(r => !ids.has(r.id))];
}
