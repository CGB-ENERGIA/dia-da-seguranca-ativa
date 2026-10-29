import { create } from "zustand";
import { lerFoto, regsLocais, salvarReg } from "./db";
import { enviarReg, remotoAtivo } from "./remote";
import { useData } from "../store/data";

interface SyncStore { pendentes: number; sincronizando: boolean; online: boolean }
export const useSync = create<SyncStore>(() => ({ pendentes: 0, sincronizando: false, online: navigator.onLine }));

let rodando = false;
export async function contarPendentes() {
  const n = (await regsLocais()).filter(r => r.sync !== "synced").length;
  useSync.setState({ pendentes: n });
}

/** Envia a fila (registro + foto) quando há rede e backend; cada item é idempotente (id uuid). */
export async function sincronizar() {
  if (rodando) return;
  rodando = true;
  try {
    if (remotoAtivo && navigator.onLine) {
      useSync.setState({ sincronizando: true });
      for (const r of (await regsLocais()).filter(x => x.sync !== "synced")) {
        try {
          const f = r.fotoId ? await lerFoto(r.fotoId) : undefined;
          await enviarReg(r, f?.blob);
          await salvarReg({ ...r, sync: "synced" });
        } catch {
          await salvarReg({ ...r, sync: "error" });
        }
      }
      await useData.getState().recarregarLocais();
      void useData.getState().atualizarRemoto();
    }
  } finally {
    rodando = false;
    useSync.setState({ sincronizando: false });
    await contarPendentes();
  }
}

export function iniciarSync() {
  window.addEventListener("online", () => { useSync.setState({ online: true }); void sincronizar(); });
  window.addEventListener("offline", () => useSync.setState({ online: false }));
  setInterval(() => void sincronizar(), 30000);
  void contarPendentes().then(sincronizar);
}
