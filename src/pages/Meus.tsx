import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { CheckCircle2, CloudUpload, Download, ImageOff, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Card, Vazio } from "../components/ui";
import { useAuth } from "../store/auth";
import { todosRegistros, useData } from "../store/data";
import { ACAO_CURTA, brData } from "../lib/dates";
import { apagarFoto, apagarReg, lerFoto } from "../lib/db";
import { contarPendentes } from "../lib/sync";
import { baixar, nomeArquivo } from "./Lancar";
import type { Reg } from "../lib/types";

function Miniatura({ id }: { id?: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let u = "";
    if (id) void lerFoto(id).then(f => { if (f) { u = URL.createObjectURL(f.blob); setUrl(u); } });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [id]);
  return url
    ? <img src={url} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-ink/10" />
    : <div className="grid h-16 w-16 place-items-center rounded-xl bg-ink/5 text-ink/25"><ImageOff size={20} /></div>;
}

export default function Meus() {
  const chapa = useAuth(s => s.chapa);
  const { historico, remotos, locais, recarregarLocais } = useData();
  const meus = useMemo(
    () => todosRegistros({ historico: [], remotos, locais }).filter(r => r.chapa === chapa).sort((a, b) => (b.d + b.t).localeCompare(a.d + a.t)),
    [remotos, locais, chapa],
  );
  const hist = useMemo(() => historico.filter(r => r.chapa === chapa).length, [historico, chapa]);

  const remover = async (r: Reg) => {
    if (!confirm("Excluir este lançamento ainda não enviado?")) return;
    await apagarReg(r.id);
    if (r.fotoId && !locais.some(x => x.fotoId === r.fotoId && x.id !== r.id)) await apagarFoto(r.fotoId);
    await recarregarLocais();
    await contarPendentes();
  };
  const baixarFoto = async (r: Reg) => {
    if (!r.fotoId) return;
    const f = await lerFoto(r.fotoId);
    if (f) baixar(f.blob, f.nome || nomeArquivo(r.chapa, r.equipe, r.d, r.t));
  };

  return (
    <div className="mx-auto max-w-[860px]">
      <Card titulo="Lançamentos feitos neste aparelho" sub={hist ? `+ ${hist} ações do histórico importado` : undefined}
        direita={<Link to="/registrar" className="btn btn-vinho !h-11 !px-4 text-[13px]"><Plus size={17} /> Novo</Link>}>
        {meus.length ? (
          <ul className="divide-y divide-ink/6">
            {meus.map(r => (
              <li key={r.id} className="flex items-center gap-4 py-3.5">
                <Miniatura id={r.fotoId} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14.5px] font-extrabold text-brand">{ACAO_CURTA[r.acao]}</span>
                    <span className="font-mono text-[12.5px] font-bold text-ink/50">{r.equipe}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[12px] font-semibold text-ink/45">{brData(r.d)} · {r.t}{r.local ? ` · ${r.local}` : ""}</div>
                </div>
                <span className={clsx("hidden items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-extrabold sm:flex",
                  r.sync === "synced" ? "bg-oliva/15 text-oliva" : r.sync === "error" ? "bg-soft2 text-brand" : "bg-ambar/25 text-[#7a5200]")}>
                  {r.sync === "synced" ? <CheckCircle2 size={13} /> : r.sync === "error" ? <TriangleAlert size={13} /> : <CloudUpload size={13} />}
                  {r.sync === "synced" ? "enviado" : r.sync === "error" ? "falhou, tentando" : "na fila"}
                </span>
                {r.fotoId && <button onClick={() => void baixarFoto(r)} title="Baixar foto" className="grid h-10 w-10 place-items-center rounded-xl text-brand hover:bg-soft"><Download size={18} /></button>}
                {r.sync !== "synced" && <button onClick={() => void remover(r)} title="Excluir" className="grid h-10 w-10 place-items-center rounded-xl text-ink/35 hover:bg-soft hover:text-brand"><Trash2 size={17} /></button>}
              </li>
            ))}
          </ul>
        ) : <Vazio texto="Você ainda não fez lançamentos neste aparelho." />}
      </Card>
    </div>
  );
}
