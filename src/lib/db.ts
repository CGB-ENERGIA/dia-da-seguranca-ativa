import { openDB, type DBSchema } from "idb";
import type { Reg } from "./types";

interface Schema extends DBSchema {
  regs: { key: string; value: Reg };
  fotos: { key: string; value: { id: string; blob: Blob; nome: string } };
  kv: { key: string; value: unknown };
}

const db = openDB<Schema>("dsa-cgb", 1, {
  upgrade(d) {
    d.createObjectStore("regs", { keyPath: "id" });
    d.createObjectStore("fotos", { keyPath: "id" });
    d.createObjectStore("kv");
  },
});

export const regsLocais = async () => (await db).getAll("regs");
export const salvarReg = async (r: Reg) => void (await (await db).put("regs", r));
export const apagarReg = async (id: string) => void (await (await db).delete("regs", id));
export const salvarFoto = async (id: string, blob: Blob, nome: string) =>
  void (await (await db).put("fotos", { id, blob, nome }));
export const lerFoto = async (id: string) => (await db).get("fotos", id);
export const apagarFoto = async (id: string) => void (await (await db).delete("fotos", id));
export const kvGet = async <T>(k: string) => (await (await db).get("kv", k)) as T | undefined;
export const kvSet = async (k: string, v: unknown) => void (await (await db).put("kv", v, k));
