import { openDB, type DBSchema } from "idb";
import type { Reg } from "./types";

interface Schema extends DBSchema {
  regs: { key: string; value: Reg };
  fotos: { key: string; value: { id: string; blob: Blob; nome: string } };
  kv: { key: string; value: unknown };
}

/** Abre o IndexedDB com limite de tempo; em aba privada/armazenamento bloqueado cai para memória (sem travar o app). */
const db = Promise.race([
  openDB<Schema>("dsa-cgb", 1, {
    upgrade(d) {
      d.createObjectStore("regs", { keyPath: "id" });
      d.createObjectStore("fotos", { keyPath: "id" });
      d.createObjectStore("kv");
    },
  }),
  new Promise<null>(ok => setTimeout(() => ok(null), 3500)),
]).catch(() => null);

const memRegs = new Map<string, Reg>();
const memFotos = new Map<string, { id: string; blob: Blob; nome: string }>();
const memKv = new Map<string, unknown>();

export const regsLocais = async () => { const d = await db; try { return d ? await d.getAll("regs") : [...memRegs.values()]; } catch { return [...memRegs.values()]; } };
export const salvarReg = async (r: Reg) => { memRegs.set(r.id, r); const d = await db; try { await d?.put("regs", r); } catch { /* memória */ } };
export const apagarReg = async (id: string) => { memRegs.delete(id); const d = await db; try { await d?.delete("regs", id); } catch { /* memória */ } };
export const salvarFoto = async (id: string, blob: Blob, nome: string) => { memFotos.set(id, { id, blob, nome }); const d = await db; try { await d?.put("fotos", { id, blob, nome }); } catch { /* memória */ } };
export const lerFoto = async (id: string) => { const d = await db; try { return (await d?.get("fotos", id)) ?? memFotos.get(id); } catch { return memFotos.get(id); } };
export const apagarFoto = async (id: string) => { memFotos.delete(id); const d = await db; try { await d?.delete("fotos", id); } catch { /* memória */ } };
export const kvGet = async <T,>(k: string) => { const d = await db; try { return ((d ? await d.get("kv", k) : undefined) ?? memKv.get(k)) as T | undefined; } catch { return memKv.get(k) as T | undefined; } };
export const kvSet = async (k: string, v: unknown) => { memKv.set(k, v); const d = await db; try { await d?.put("kv", v, k); } catch { /* memória */ } };
