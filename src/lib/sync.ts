import { create } from "zustand";
import { lerFoto, regsLocais, salvarReg } from "./db";
import { enviarReg, RegistroRecusado, remotoAtivo } from "./remote";
import { useData } from "../store/data";

interface SyncStore { pendentes: number; sincronizando: boolean; online: boolean }
export const useSync = create<SyncStore>(() => ({ pendentes: 0, sincronizando: false, online: navigator.onLine }));

let rodando = false;
export async function contarPendentes() {
  const n = (await regsLocais()).filter(r => r.sync !== "synced" && r.sync !== "rejected").length;
  useSync.setState({ pendentes: n });
}

/** Envia a fila (registro + foto) quando há rede e backend; cada item é idempotente (id uuid). */
export async function sincronizar() {
  if (rodando) return;
  rodando = true;
  try {
    if (remotoAtivo && navigator.onLine) {
      useSync.setState({ sincronizando: true });
      const fila = (await regsLocais()).filter(x => x.sync !== "synced" && x.sync !== "rejected");
      for (const r of fila) {
        try {
          const f = r.fotoId ? await lerFoto(r.fotoId) : undefined;
          await enviarReg(r, f?.blob);
          await salvarReg({ ...r, sync: "synced" });
        } catch (e) {
          if (e instanceof RegistroRecusado) await salvarReg({ ...r, sync: "rejected", motivo: e.message });
          else await salvarReg({ ...r, sync: "error" });
        }
      }
      await useData.getState().recarregarLocais();
      void useData.getState().atualizarRemoto(fila.length > 0); // só rebaixa o histórico se algo foi enviado
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
