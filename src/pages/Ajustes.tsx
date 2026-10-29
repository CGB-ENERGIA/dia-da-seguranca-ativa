import { CheckCircle2, CircleDashed, DatabaseZap, RefreshCw, Smartphone } from "lucide-react";
import { Card } from "../components/ui";
import { useData } from "../store/data";
import { useAuth } from "../store/auth";
import { remotoAtivo } from "../lib/remote";
import { sincronizar, useSync } from "../lib/sync";

const Linha = ({ ok, t, d }: { ok: boolean; t: string; d: string }) => (
  <li className="flex items-start gap-3.5 py-3.5">
    {ok ? <CheckCircle2 className="mt-0.5 shrink-0 text-oliva" size={20} /> : <CircleDashed className="mt-0.5 shrink-0 text-ambar" size={20} />}
    <div><div className="text-[14.5px] font-extrabold text-vinho-900">{t}</div><div className="text-[12.5px] font-medium leading-relaxed text-black/50">{d}</div></div>
  </li>
);

export default function Ajustes() {
  const { origem, historico, colabs, equipes } = useData();
  const { pendentes, online, sincronizando } = useSync();
  const { chapa, liberarDia, setLiberar } = useAuth();
  const gestor = useData(s => s.mapa.get(chapa ?? 0)?.gr === "SEGURANÇA");

  return (
    <div className="mx-auto grid max-w-[860px] gap-5">
      <Card titulo="Estado do sistema" sub="o que está ativo neste aparelho">
        <ul className="divide-y divide-black/6">
          <Linha ok={remotoAtivo} t={remotoAtivo ? "Servidor conectado" : "Servidor não configurado"}
            d={remotoAtivo ? "Lançamentos e fotos são enviados ao Supabase quando há rede." : "Os lançamentos ficam guardados neste aparelho. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja o README) para centralizar."} />
          <Linha ok={online} t={online ? "Com conexão" : "Sem conexão"} d="Sem sinal o app continua registrando; a fila é enviada sozinha quando a rede voltar." />
          <Linha ok t="Funciona offline (PWA)" d="Instale pelo navegador: “Adicionar à tela inicial”. A câmera e os dados ficam disponíveis sem internet." />
          <Linha ok t={`Base carregada: ${origem === "demo" ? "demonstração (fictícia)" : "histórico importado"}`} d={`${historico.length.toLocaleString("pt-BR")} ações · ${colabs.length} colaboradores · ${equipes.length} equipes.`} />
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="btn btn-vinho" onClick={() => void sincronizar()} disabled={sincronizando}><RefreshCw size={17} className={sincronizando ? "animate-spin" : ""} /> Sincronizar agora{pendentes ? ` (${pendentes})` : ""}</button>
        </div>
      </Card>

      {gestor && (
        <Card titulo="Gestão SESMT" sub="visível apenas para o grupo Segurança">
          <label className="flex cursor-pointer items-center gap-4">
            <input type="checkbox" checked={liberarDia} onChange={e => setLiberar(e.target.checked)} className="h-5 w-5 accent-[#701627]" />
            <span><b className="text-vinho-900">Liberar lançamento fora da quarta-feira</b><br /><span className="text-[12.5px] text-black/50">Vale só nesta sessão, neste aparelho (ex.: correções e testes).</span></span>
          </label>
        </Card>
      )}

      <Card titulo="Como instalar" sub="para usar em campo">
        <div className="flex items-start gap-3 text-[13.5px] font-medium leading-relaxed text-black/60">
          <Smartphone className="mt-0.5 shrink-0 text-vinho-600" size={20} />
          <p>Abra o link no Chrome/Safari do celular → menu → <b>Adicionar à tela inicial</b>. Abra o app uma vez com internet para baixar tudo; depois ele funciona sem sinal.</p>
        </div>
        <div className="mt-4 flex items-center gap-2 text-[12px] font-semibold text-black/40"><DatabaseZap size={15} /> Dados pessoais: os cadastros ficam apenas nos arquivos do servidor, nunca no código.</div>
      </Card>
    </div>
  );
}
