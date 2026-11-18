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
  erroMsg: string;
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
  atualizarRemoto: (forcar?: boolean) => Promise<void>;
  salvarColab: (c: Colab) => Promise<void>;
  salvarEquipe: (e: Equipe) => Promise<void>;
  setMeta: (n: number) => Promise<void>;
  setMetaColab: (chapa: number, n: number | null) => Promise<void>;
  removerRemotos: (ids: string[]) => Promise<void>;
  extras: Colab[];
  garantirColab: (p: { chapa: number | null; nome: string; funcao?: string | null; base?: string | null; processo?: string | null; gerencia?: string | null }) => void;
}

let baixando = false;
let ultimoRemoto = 0;
const base = import.meta.env.BASE_URL;
const buscar = async <T,>(arq: string): Promise<T> => {
  try {
    let ult: unknown;
    for (let t = 0; t < 3; t++) {
      try {
        const r = await fetch(`${base}seed/${arq}?v=${__BUILD__}${t ? `&t=${Date.now()}` : ""}`, { cache: t ? "reload" : "default" });
        if (!r.ok) throw new Error(`${arq}: HTTP ${r.status}`);
        const j = await r.json();
        void kvSet(`seed:${arq}`, j);
        return j as T;
      } catch (e) { ult = e; await new Promise(ok => setTimeout(ok, 600 * (t + 1))); }
    }
    throw ult;
  } catch (e) {
    const c = await kvGet<T>(`seed:${arq}`);
    if (c) return c;
    throw e;
  }
};

function derivar(colabsBase: Colab[], equipesBase: Equipe[], ed: Edicoes, extras: Colab[] = []) {
  const m = new Map<number, Colab>(colabsBase.map(c => [c.c, c]));
  for (const c of extras) if (!m.has(c.c)) m.set(c.c, c);
  for (const c of Object.values(ed.colabs)) m.set(c.c, c);
  const e = new Map<string, Equipe>(equipesBase.map(x => [x.p, x]));
  for (const x of Object.values(ed.equipes)) e.set(x.p, x);
  return { colabs: [...m.values()], mapa: m, equipes: [...e.values()] };
}

export const useData = create<DataState>((set, get) => {
  const persistir = async (ed: Edicoes) => {
    const s = get();
    set({ edicoes: ed, ...derivar(s.colabsBase, s.equipesBase, ed, s.extras) });
    await kvSet("edicoes", ed);
    if (remotoAtivo) void gravarConfig("edicoes", ed).catch(() => {});
  };

  return {
    pronto: false, erro: false, erroMsg: "", origem: "", colabsBase: [], equipesBase: [], edicoes: vazio(), extras: [],
    colabs: [], mapa: new Map(), equipes: [], historico: [], remotos: [], locais: [],

    async carregar() {
      try {
        // com servidor conectado, o seed local é opcional (cadastro e histórico vêm do banco)
        const tol = <T,>(p: Promise<T>, vazio: T) => (remotoAtivo ? p.catch(() => vazio) : p);
        const [roster, linhas, meta] = await Promise.all([
          tol(buscar<{ colabs: Colab[]; equipes: Equipe[] }>("roster.json"), { colabs: [], equipes: [] }),
          tol(buscar<[string, number, string, number][]>("registros.json"), []),
          buscar<{ origem: string }>("meta.json").catch(() => ({ origem: "" })),
        ]);
        const historico: Reg[] = (remotoAtivo ? [] : linhas).map((x, i) => ({
          id: `h${i}`, d: x[0].slice(0, 10), t: x[0].slice(11, 16), chapa: x[1], equipe: x[2], acao: x[3], origem: "hist",
        }));
        let ed = { ...vazio(), ...((await kvGet<Edicoes>("edicoes")) ?? {}) };
        let base = roster.colabs;
        if (remotoAtivo) {
          const on = navigator.onLine;
          const [cfg, rem0] = await Promise.all([
            on ? lerConfig<Edicoes>("edicoes").catch(() => null) : Promise.resolve(null),
            on ? lerColaboradoresRemotos().catch(() => null) : Promise.resolve(null),
          ]);
          if (rem0?.length) void kvSet("colabs-remotos", rem0);
          const rem = rem0?.length ? rem0 : await kvGet<Partial<Colab>[]>("colabs-remotos");
          if (cfg) { ed = { ...vazio(), ...cfg }; void kvSet("edicoes", ed); }
          if (rem?.length) {
            const antigos = new Map(base.map(c => [c.c, c]));
            base = rem.map(r => { const a = antigos.get(r.c!); return { gr: "", ger: "", ...a, ...r, n: r.n ?? a?.n ?? (r.nome ?? "").split(" ")[0], l: r.l ?? a?.l ?? (ehLideranca(r.f ?? "") ? 1 : 0) } as Colab; });
          }
        }
        set({
          colabsBase: base, equipesBase: roster.equipes, edicoes: ed, ...derivar(base, roster.equipes, ed, get().extras),
          historico, origem: meta.origem, pronto: true,
          remotos: (await kvGet<Reg[]>("remotos")) ?? [],
          locais: await regsLocais(),
        });
        void get().atualizarRemoto();
      } catch (e) {
        set({ erro: true, erroMsg: String((e as Error)?.message ?? e) });
      }
    },
    async recarregarLocais() { set({ locais: await regsLocais() }); },
    async atualizarRemoto(forcar = false) {
      if (!remotoAtivo || !navigator.onLine || baixando) return;
      if (!forcar && Date.now() - ultimoRemoto < 300000) return; // no máx. a cada 5 min, salvo após enviar lançamentos
      baixando = true;
      try {
        ultimoRemoto = Date.now();
        const r = await baixarRegs();
        await kvSet("remotos", r);
        set({ remotos: r });
      } catch { /* mantém cache */ } finally { baixando = false; }
    },
    salvarColab: c => persistir({ ...get().edicoes, colabs: { ...get().edicoes.colabs, [c.c]: c } }),
    salvarEquipe: e => persistir({ ...get().edicoes, equipes: { ...get().edicoes.equipes, [e.p]: e } }),
    garantirColab: p => {
      const s = get();
      if (!p.chapa || s.mapa.has(p.chapa)) return;
      const primeiro = p.nome.split(" ")[0] ?? p.nome;
      const extra: Colab = { c: p.chapa, n: primeiro[0] + primeiro.slice(1).toLowerCase(), nome: p.nome, f: p.funcao ?? "", p: p.processo ?? "", b: p.base ?? "", g: p.gerencia ?? "", gr: "", s: "A", ger: "", l: 0 };
      const extras = [...s.extras, extra];
      set({ extras, ...derivar(s.colabsBase, s.equipesBase, s.edicoes, extras) });
    },
    removerRemotos: async ids => {
      const fora = new Set(ids);
      const restantes = get().remotos.filter(x => !fora.has(x.id));
      set({ remotos: restantes });
      await kvSet("remotos", restantes);
    },
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
