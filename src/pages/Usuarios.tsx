import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { clsx } from "clsx";
import { Dices, LoaderCircle, Pencil, Plus, Search, ShieldCheck, Trash2, UserCog, X } from "lucide-react";
import { Card, CampoSenha, Select, Vazio } from "../components/ui";
import { lembrarSenha, NIVEIS, senhaAtual, useAuth, type Nivel } from "../store/auth";
import { usuarioExcluir, usuarioSalvar, usuariosListar, type PerfilRemoto } from "../lib/remote";

const ORDEM: Nivel[] = ["admin", "gestor", "consulta", "observador"];
const COR: Record<Nivel, string> = {
  admin: "bg-vinho-700 text-white", gestor: "bg-ambar/25 text-[#8a5d00] dark:text-ambar",
  consulta: "bg-oliva/15 text-oliva", observador: "bg-ink/8 text-ink/60",
};

interface Form {
  anterior: string | null; usuario: string; nome: string; chapa: string; funcao: string; base: string; processo: string; gerencia: string;
  nivel: Nivel; ativo: boolean; senha: string;
}
const vazio = (): Form => ({ anterior: null, usuario: "@", nome: "", chapa: "", funcao: "", base: "", processo: "", gerencia: "", nivel: "observador", ativo: true, senha: "" });
const senhaAleatoria = () => {
  const a = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const b = crypto.getRandomValues(new Uint32Array(8));
  return "SA@" + [...b].map(x => a[x % a.length]).join("");
};

export default function Usuarios() {
  const perfil = useAuth(s => s.perfil)!;
  const entrar = useAuth(s => s.entrar);
  const [senhaAdm, setSenhaAdm] = useState(senhaAtual());
  const [digitada, setDigitada] = useState("");
  const [lista, setLista] = useState<PerfilRemoto[] | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [q, setQ] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmaExcluir, setConfirmaExcluir] = useState(false);
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async (s: string) => {
    setCarregando(true); setErro("");
    try { setLista(await usuariosListar(perfil.usuario, s)); lembrarSenha(s); setSenhaAdm(s); }
    catch (e) { setErro((e as Error).message); setSenhaAdm(""); }
    finally { setCarregando(false); }
  }, [perfil.usuario]);
  useEffect(() => { if (senhaAdm && !lista) void carregar(senhaAdm); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const visiveis = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (lista ?? []).filter(u => (!filtroNivel || u.nivel === filtroNivel) && (!t || `${u.nome} ${u.usuario} ${u.chapa ?? ""} ${u.funcao ?? ""} ${u.base ?? ""}`.toLowerCase().includes(t)));
  }, [lista, q, filtroNivel]);
  const porNivel = useMemo(() => ORDEM.map(n => ({ n, qtd: (lista ?? []).filter(u => u.nivel === n && u.ativo !== false).length })), [lista]);

  const editar = (u: PerfilRemoto) => { setConfirmaExcluir(false); setForm({ anterior: u.usuario, usuario: u.usuario, nome: u.nome, chapa: u.chapa ? String(u.chapa) : "", funcao: u.funcao ?? "", base: u.base ?? "", processo: u.processo ?? "", gerencia: u.gerencia ?? "", nivel: u.nivel, ativo: u.ativo !== false, senha: "" }); };

  const salvar = async () => {
    if (!form) return;
    setSalvando(true); setErro("");
    try {
      const novoUsuario = form.usuario.trim().startsWith("@") ? form.usuario.trim() : "@" + form.usuario.trim();
      const ret = await usuarioSalvar(perfil.usuario, senhaAdm, {
        anterior: form.anterior, usuario: novoUsuario, nome: form.nome, chapa: form.chapa ? Number(form.chapa) : null,
        funcao: form.funcao, base: form.base, processo: form.processo, gerencia: form.gerencia, nivel: form.nivel, ativo: form.ativo, novaSenha: form.senha,
      });
      if (form.anterior && form.anterior === perfil.usuario) { // mexeu no próprio usuário: mantém a sessão coerente
        entrar({ ...perfil, usuario: ret.usuario, nome: ret.nome, nivel: ret.nivel }, form.senha || senhaAdm);
        if (form.senha) setSenhaAdm(form.senha);
      }
      setForm(null);
      setAviso(form.anterior ? "Usuário atualizado." : "Usuário criado.");
      setTimeout(() => setAviso(""), 4000);
      await carregar(form.anterior && form.anterior === perfil.usuario && form.senha ? form.senha : senhaAdm);
    } catch (e) { setErro((e as Error).message); }
    finally { setSalvando(false); }
  };

  const excluir = async () => {
    if (!form?.anterior) return;
    setSalvando(true); setErro("");
    try {
      await usuarioExcluir(perfil.usuario, senhaAdm, form.anterior);
      setForm(null); setAviso("Usuário excluído."); setTimeout(() => setAviso(""), 4000);
      await carregar(senhaAdm);
    } catch (e) { setErro((e as Error).message); setConfirmaExcluir(false); }
    finally { setSalvando(false); }
  };

  /* ——— confirmação da senha do administrador ——— */
  if (!senhaAdm || (!lista && !carregando)) {
    return (
      <div className="mx-auto mt-8 max-w-[440px]">
        <Card>
          <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-vinho-700 text-white"><ShieldCheck size={26} /></div>
          <h2 className="display text-[24px] text-brand">Confirme sua senha</h2>
          <p className="mb-5 mt-2 text-[14px] font-medium text-ink/55">Para gerenciar usuários, confirme a senha de <b className="text-brand">{perfil.usuario}</b>. Ela é conferida no servidor.</p>
          <CampoSenha valor={digitada} onChange={v => { setDigitada(v); setErro(""); }} autoFocus autoComplete="current-password" onKeyDown={e => e.key === "Enter" && digitada && void carregar(digitada)} />
          {erro && <div role="alert" className="mt-3 text-[13px] font-bold text-vinho-500">{erro}</div>}
          <button className="btn btn-vinho mt-4 w-full" disabled={!digitada || carregando} onClick={() => void carregar(digitada)}>{carregando && <LoaderCircle size={17} className="animate-spin" />} Continuar</button>
          {erro.includes("instaladas") && <p className="mt-3 text-[12px] font-medium text-ink/45">Rode <code>supabase/usuarios.sql</code> e depois <code>supabase/usuarios-seed.sql</code> no SQL Editor do Supabase.</p>}
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {porNivel.map(({ n, qtd }) => (
          <div key={n} className="card p-5"><span className={clsx("rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.08em]", COR[n])}>{NIVEIS[n].rotulo}</span>
            <div className="display num mt-3 text-[34px] leading-none text-brand">{qtd}</div><div className="mt-1 text-[11.5px] font-semibold text-ink/40">usuários ativos</div></div>
        ))}
      </div>

      <Card titulo="Usuários e níveis de acesso" sub={`${lista?.length ?? 0} cadastrados`}
        direita={<button className="btn btn-vinho !h-10 !px-4 text-[13px]" onClick={() => { setConfirmaExcluir(false); setErro(""); setForm(vazio()); }}><Plus size={16} /> Novo usuário</button>}>
        <div className="mb-3 flex flex-wrap gap-2.5">
          <div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3.5 top-[17px] text-ink/35" /><input className="campo !h-[52px] !pl-10" placeholder="Buscar nome, usuário, chapa, função ou base" value={q} onChange={e => setQ(e.target.value)} /></div>
          <Select rotulo="Nível" valor={filtroNivel} onChange={setFiltroNivel} opcoes={[{ v: "", t: "Todos" }, ...ORDEM.map(n => ({ v: n, t: NIVEIS[n].rotulo }))]} />
        </div>
        {aviso && <div role="status" className="mb-3 rounded-2xl bg-oliva/15 px-4 py-3 text-[13.5px] font-bold text-oliva">{aviso}</div>}
        <div className="rolagem overflow-x-auto rounded-2xl border border-ink/8">
          <table className="w-full min-w-[760px] border-collapse">
            <thead><tr className="text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink/45">
              <th className="px-3 py-3">Usuário</th><th className="px-3 py-3">Chapa</th><th className="px-3 py-3">Função</th><th className="px-3 py-3">Base</th><th className="px-3 py-3">Nível</th><th className="px-3 py-3">Situação</th><th className="w-12" />
            </tr></thead>
            <tbody>
              {visiveis.map(u => (
                <tr key={u.usuario} onClick={() => editar(u)} className="cursor-pointer border-t border-ink/6 text-[13px] transition hover:bg-soft">
                  <td className="px-3 py-2.5"><div className="font-bold text-brand">{u.nome}</div><div className="font-mono text-[11.5px] text-ink/45">{u.usuario}{u.usuario === perfil.usuario && " · você"}</div></td>
                  <td className="num px-3 py-2.5">{u.chapa ?? "—"}</td>
                  <td className="max-w-[230px] truncate px-3 py-2.5 text-ink/60" title={u.funcao ?? ""}>{(u.funcao ?? "—").toLowerCase()}</td>
                  <td className="px-3 py-2.5">{u.base ?? "—"}</td>
                  <td className="px-3 py-2.5"><span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-extrabold", COR[u.nivel])}>{NIVEIS[u.nivel].rotulo}</span></td>
                  <td className="px-3 py-2.5">{u.ativo === false ? <span className="text-vinho-500 font-bold">inativo</span> : <span className="font-bold text-oliva">ativo</span>}</td>
                  <td className="px-3 py-2.5"><Pencil size={15} className="text-ink/40" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visiveis.length && <Vazio texto="Nenhum usuário encontrado." />}
        </div>
      </Card>

      <Card titulo="O que cada nível pode fazer" className="mt-5" delay={0.05}>
        <ul className="grid gap-3 md:grid-cols-2">
          {ORDEM.map(n => <li key={n} className="rounded-2xl bg-soft p-4"><span className={clsx("rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.08em]", COR[n])}>{NIVEIS[n].rotulo}</span><p className="mt-2.5 text-[13px] font-medium leading-relaxed text-ink/65">{NIVEIS[n].texto}</p></li>)}
        </ul>
      </Card>

      <AnimatePresence>
        {form && (
          <>
            <motion.div key="f1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !salvando && setForm(null)} className="fixed inset-0 z-40 bg-[#000]/50 backdrop-blur-sm" />
            <motion.aside key="f2" initial={{ x: 500 }} animate={{ x: 0 }} exit={{ x: 500 }} transition={{ type: "spring", damping: 32, stiffness: 320 }} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col bg-card shadow-2xl">
              <header className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
                <h3 className="display flex items-center gap-2.5 text-[22px] text-brand"><UserCog size={22} /> {form.anterior ? "Editar usuário" : "Novo usuário"}</h3>
                <button onClick={() => setForm(null)} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-soft" aria-label="Fechar"><X size={18} /></button>
              </header>
              <div className="rolagem flex-1 space-y-4 overflow-y-auto p-6">
                <label className="block"><span className="eyebrow mb-1.5 block">Nome completo</span><input className="campo" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value.toUpperCase() })} /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className="eyebrow mb-1.5 block">Usuário (login)</span><input className="campo" autoCapitalize="none" value={form.usuario} onChange={e => setForm({ ...form, usuario: e.target.value.replace(/\s/g, "") })} /></label>
                  <label className="block"><span className="eyebrow mb-1.5 block">Chapa</span><input className="campo" inputMode="numeric" value={form.chapa} onChange={e => setForm({ ...form, chapa: e.target.value.replace(/\D/g, "") })} /></label>
                </div>
                <label className="block"><span className="eyebrow mb-1.5 block">Função</span><input className="campo" value={form.funcao} onChange={e => setForm({ ...form, funcao: e.target.value.toUpperCase() })} /></label>
                <div className="grid grid-cols-3 gap-3">
                  <label className="block"><span className="eyebrow mb-1.5 block">Base</span><input className="campo" value={form.base} onChange={e => setForm({ ...form, base: e.target.value.toUpperCase() })} /></label>
                  <label className="block"><span className="eyebrow mb-1.5 block">Gerência</span><input className="campo" value={form.gerencia} onChange={e => setForm({ ...form, gerencia: e.target.value.toUpperCase() })} /></label>
                  <label className="block"><span className="eyebrow mb-1.5 block">Processo</span><input className="campo" value={form.processo} onChange={e => setForm({ ...form, processo: e.target.value })} /></label>
                </div>

                <fieldset>
                  <legend className="eyebrow mb-2">Nível de acesso</legend>
                  <div className="space-y-2">
                    {ORDEM.map(n => (
                      <label key={n} className={clsx("flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-3.5 transition", form.nivel === n ? "border-vinho-600 bg-soft" : "border-ink/10 hover:border-vinho-300")}>
                        <input type="radio" name="nivel" checked={form.nivel === n} onChange={() => setForm({ ...form, nivel: n })} className="mt-1 accent-[#9c2a42]" />
                        <span><span className="block text-[13.5px] font-extrabold text-brand">{NIVEIS[n].rotulo}</span><span className="block text-[12px] font-medium leading-relaxed text-ink/55">{NIVEIS[n].texto}</span></span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-ink/5 p-3.5 text-[13.5px] font-bold">
                  <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} className="h-4 w-4 accent-[#9c2a42]" /> Usuário ativo (pode entrar no sistema)
                </label>

                <div>
                  <div className="mb-1.5 flex items-center justify-between"><span className="eyebrow">{form.anterior ? "Nova senha (deixe em branco para manter)" : "Senha"}</span>
                    <button type="button" className="flex items-center gap-1.5 text-[12px] font-bold text-brand underline-offset-2 hover:underline" onClick={() => setForm({ ...form, senha: senhaAleatoria() })}><Dices size={14} /> gerar</button></div>
                  <CampoSenha valor={form.senha} onChange={v => setForm({ ...form, senha: v })} autoComplete="new-password" placeholder="mínimo 6 caracteres" />
                </div>
                {erro && <div role="alert" className="text-[13px] font-bold text-vinho-500">{erro}</div>}
              </div>
              <footer className="flex items-center gap-3 border-t border-ink/10 p-5">
                {form.anterior && form.anterior !== perfil.usuario && (
                  confirmaExcluir
                    ? <button className="btn !bg-vinho-500 text-white" onClick={() => void excluir()} disabled={salvando}><Trash2 size={16} /> Confirmar exclusão</button>
                    : <button className="btn btn-claro !px-4" onClick={() => setConfirmaExcluir(true)} disabled={salvando} aria-label="Excluir usuário"><Trash2 size={17} /></button>
                )}
                <button className="btn btn-vinho ml-auto flex-1" onClick={() => void salvar()} disabled={salvando || !form.nome.trim() || form.usuario.trim().length < 2 || (!form.anterior && form.senha.length < 6)}>
                  {salvando && <LoaderCircle size={17} className="animate-spin" />} Salvar
                </button>
              </footer>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
