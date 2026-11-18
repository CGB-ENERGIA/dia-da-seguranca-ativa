import { useState } from "react";
import { motion } from "motion/react";
import { Check, KeyRound, LoaderCircle, X } from "lucide-react";
import { CampoSenha } from "./ui";
import { alterarSenha, RpcAusente } from "../lib/remote";
import { lembrarSenha, useAuth } from "../store/auth";

/** Janela para o próprio usuário trocar a senha (conferida no servidor). */
export default function AlterarSenha({ onFechar }: { onFechar: () => void }) {
  const perfil = useAuth(s => s.perfil);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [conf, setConf] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const [env, setEnv] = useState(false);

  const salvar = async () => {
    setErro("");
    if (nova.length < 6) return setErro("A nova senha precisa ter ao menos 6 caracteres.");
    if (nova !== conf) return setErro("A confirmação não confere com a nova senha.");
    setEnv(true);
    try {
      await alterarSenha(perfil!.usuario, atual, nova);
      lembrarSenha(nova);
      setOk(true);
    } catch (e) {
      setErro(e instanceof RpcAusente ? "Disponível depois que o administrador instalar o cadastro de usuários no banco." : (e as Error).message);
    } finally { setEnv(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onFechar} className="fixed inset-0 z-[60] bg-[#000]/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
        className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-card p-6 shadow-2xl">
        <button onClick={onFechar} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-lg text-ink/45 hover:bg-soft" aria-label="Fechar"><X size={18} /></button>
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-vinho-700 text-white">{ok ? <Check size={22} /> : <KeyRound size={22} />}</div>
        <h3 className="display text-[22px] text-brand">{ok ? "Senha alterada" : "Alterar senha"}</h3>
        <p className="mt-1 text-[13px] font-medium text-ink/55">{perfil?.usuario}</p>
        {ok ? (
          <button className="btn btn-vinho mt-6 w-full" onClick={onFechar}>Fechar</button>
        ) : (
          <>
            <div className="mt-5 space-y-3.5">
              <label className="block"><span className="eyebrow mb-1.5 block">Senha atual</span><CampoSenha valor={atual} onChange={setAtual} autoFocus autoComplete="current-password" /></label>
              <label className="block"><span className="eyebrow mb-1.5 block">Nova senha</span><CampoSenha valor={nova} onChange={setNova} autoComplete="new-password" placeholder="mínimo 6 caracteres" /></label>
              <label className="block"><span className="eyebrow mb-1.5 block">Confirmar nova senha</span><CampoSenha valor={conf} onChange={setConf} autoComplete="new-password" onKeyDown={e => e.key === "Enter" && atual && nova && !env && void salvar()} /></label>
            </div>
            {erro && <div role="alert" className="mt-3 text-[13px] font-bold text-vinho-500">{erro}</div>}
            <div className="mt-5 flex gap-3">
              <button className="btn btn-claro flex-1" onClick={onFechar} disabled={env}>Cancelar</button>
              <button className="btn btn-vinho flex-1" onClick={() => void salvar()} disabled={!atual || !nova || !conf || env}>{env && <LoaderCircle size={17} className="animate-spin" />} Salvar</button>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}
