import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { clsx } from "clsx";
import { Camera, ChevronLeft, ChevronRight, Download, ExternalLink, ImageOff, LayoutGrid, List, LoaderCircle, MapPin, Search, Trash2, X } from "lucide-react";
import { Card, CampoSenha, Select, Vazio } from "../components/ui";
import { useData } from "../store/data";
import { useAuth } from "../store/auth";
import { ACAO_CURTA, brData } from "../lib/dates";
import { excluirRegistros, fotoUrl, remotoAtivo } from "../lib/remote";
import type { Reg } from "../lib/types";

const POR_PAGINA = 40;
const POR_PAGINA_GALERIA = 12;
/** Registro feito pelo aplicativo (tem foto ao vivo), mesmo que tenha sido gravado antes da coluna de origem existir. */
const caminhos = (r: Reg): string[] => (r.fotos?.length ? r.fotos : r.foto ? [r.foto] : []);
const ehApp = (r: Reg) => r.orig === "app" || !!r.foto;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Foto do Storage, carregada só quando entra na tela. */
function Foto({ path, largura, className, alt = "", eager, inteira }: { path: string; largura?: number; className?: string; alt?: string; eager?: boolean; inteira?: boolean }) {
  const [url, setUrl] = useState("");
  const [erro, setErro] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let vivo = true;
    const el = ref.current;
    if (!el) return;
    if (eager) { fotoUrl(path, largura).then(u => vivo && setUrl(u)).catch(() => vivo && setErro(true)); return () => { vivo = false; }; }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      fotoUrl(path, largura).then(u => vivo && setUrl(u)).catch(() => vivo && setErro(true));
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => { vivo = false; io.disconnect(); };
  }, [path, largura, eager]);
  return (
    <div ref={ref} className={clsx("grid place-items-center overflow-hidden bg-ink/5", className)}>
      {url ? <img src={url} alt={alt} className={inteira ? "block h-auto max-h-[72dvh] w-full object-contain" : "h-full w-full object-cover"} /> : erro ? <ImageOff size={20} className="text-ink/30" /> : <LoaderCircle size={18} className="animate-spin text-ink/30" />}
    </div>
  );
}

function ModalExcluir({ ids, onFechar, onOk }: { ids: string[]; onFechar: () => void; onOk: (n: number) => void }) {
  const adm = useAuth(s => s.perfil?.usuario);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const confirmar = async () => {
    setEnviando(true); setErro("");
    try { onOk(await excluirRegistros(adm ?? "", senha, ids)); } catch (e) { if (!useAuth.getState().exigirTroca((e as Error).message)) setErro((e as Error).message); setEnviando(false); }
  };
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onFechar} className="fixed inset-0 z-[60] bg-[#000]/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
        className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-card p-6 shadow-2xl">
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-vinho-700 text-white"><Trash2 size={22} /></div>
        <h3 className="display text-[22px] text-brand">Excluir {ids.length} {ids.length === 1 ? "registro" : "registros"}?</h3>
        <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-ink/60">
          Isso não pode ser desfeito pelo aplicativo. Os dados apagados ficam guardados numa trilha de auditoria no banco. As fotos continuam no armazenamento.
        </p>
        <label className="mt-5 block"><span className="eyebrow mb-1.5 block">Senha do administrador ({adm})</span>
          <CampoSenha autoFocus autoComplete="current-password" valor={senha} onChange={v => { setSenha(v); setErro(""); }} onKeyDown={e => e.key === "Enter" && senha && !enviando && void confirmar()} />
        </label>
        {erro && <div role="alert" className="mt-3 text-[13px] font-bold text-vinho-500">{erro}</div>}
        <div className="mt-5 flex gap-3">
          <button className="btn btn-claro flex-1" onClick={onFechar} disabled={enviando}>Cancelar</button>
          <button className="btn btn-vinho flex-1" onClick={() => void confirmar()} disabled={!senha || enviando}>{enviando ? <LoaderCircle size={17} className="animate-spin" /> : <Trash2 size={17} />} Excluir</button>
        </div>
      </motion.div>
    </>
  );
}

function Detalhe({ r, nome, onFechar, onExcluir }: { r: Reg; nome: string; onFechar: () => void; onExcluir?: () => void }) {
  const fotos = caminhos(r);
  const [idx, setIdx] = useState(0);
  const baixar = async () => {
    if (!fotos[idx]) return;
    const u = await fotoUrl(fotos[idx]);
    const a = document.createElement("a"); a.href = u; a.download = `DSA_${r.chapa}_${r.d}_${r.t.replace(":", "")}_${idx + 1}.jpg`; a.click();
  };
  const linhas: [string, string][] = [
    ["Colaborador", `${nome} · ${r.chapa}`], ["Ação", ACAO_CURTA[r.acao]], ["Equipe", r.equipe],
    ["Data e hora", `${brData(r.d)} às ${r.t}`], ["Local", r.local ?? "—"],
    ["Evidências", fotos.length ? `${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"}` : "nenhuma"],
    ["Origem", ehApp(r) ? "Aplicativo (foto ao vivo)" : "Histórico importado"],
    ["Recebido pelo servidor", r.criado ? new Date(r.criado).toLocaleString("pt-BR") : "—"],
  ];
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onFechar} className="fixed inset-0 z-40 bg-[#000]/60 backdrop-blur-sm" />
      <motion.aside initial={{ x: 560 }} animate={{ x: 0 }} exit={{ x: 560 }} transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[540px] flex-col bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
          <h3 className="display text-[22px] text-brand">Registro</h3>
          <button onClick={onFechar} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-soft" aria-label="Fechar"><X size={18} /></button>
        </header>
        <div className="rolagem flex-1 space-y-5 overflow-y-auto p-6">
          {fotos.length
            ? <Foto key={fotos[idx]} path={fotos[idx]} eager inteira className="min-h-[200px] w-full rounded-2xl bg-black/80" alt="Evidência" />
            : <div className="grid aspect-[4/3] w-full place-items-center rounded-2xl bg-ink/5 text-center text-[13px] font-semibold text-ink/40"><div><ImageOff className="mx-auto mb-2" />Sem evidência (registro histórico)</div></div>}
          {fotos.length > 1 && (
            <ul className="flex gap-2.5 overflow-x-auto pb-1">
              {fotos.map((p, i) => (
                <li key={p} className="shrink-0"><button onClick={() => setIdx(i)} aria-label={`Foto ${i + 1}`} className={clsx("block overflow-hidden rounded-xl ring-2 transition", i === idx ? "ring-vinho-500" : "ring-transparent")}><Foto path={p} largura={200} className="h-16 w-[86px]" /></button></li>
              ))}
            </ul>
          )}
          <dl className="divide-y divide-ink/8 rounded-2xl border border-ink/8">
            {linhas.map(([k, v]) => <div key={k} className="flex justify-between gap-4 px-4 py-3 text-[13.5px]"><dt className="font-semibold text-ink/50">{k}</dt><dd className="text-right font-bold text-brand">{v}</dd></div>)}
          </dl>
          <div className="flex flex-wrap gap-3">
            {fotos.length > 0 && <button className="btn btn-claro" onClick={() => void baixar()}><Download size={17} /> Baixar foto</button>}
            {r.lat != null && r.lon != null && (
              <a className="btn btn-claro" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=18/${r.lat}/${r.lon}`}><MapPin size={17} /> Ver no mapa <ExternalLink size={14} /></a>
            )}
            {onExcluir && <button className="btn btn-vinho ml-auto" onClick={onExcluir}><Trash2 size={17} /> Excluir</button>}
          </div>
        </div>
      </motion.aside>
    </>
  );
}

export default function Banco() {
  const { remotos, mapa, removerRemotos, atualizarRemoto } = useData();
  const [q, setQ] = useState("");
  const [acao, setAcao] = useState(-1);
  const [origem, setOrigem] = useState("");
  const [soFoto, setSoFoto] = useState(false);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [visao, setVisao] = useState<"lista" | "galeria">("lista");
  const [pag, setPag] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [aberto, setAberto] = useState<Reg | null>(null);
  const [excluir, setExcluir] = useState<string[] | null>(null);
  const [aviso, setAviso] = useState("");
  const podeExcluir = useAuth(s => s.perfil?.nivel === "admin");

  const nomeDe = (c: number) => mapa.get(c)?.nome ?? `Matrícula ${c}`;
  const lista = useMemo(() => {
    const t = norm(q.trim());
    return remotos
      .filter(r => (acao < 0 || r.acao === acao) && (!origem || (origem === "app") === ehApp(r)) && (!soFoto || r.foto) && (!de || r.d >= de) && (!ate || r.d <= ate)
        && (!t || norm(`${nomeDe(r.chapa)} ${r.chapa} ${r.equipe} ${r.local ?? ""}`).includes(t)))
      .sort((a, b) => (b.d + b.t + (b.criado ?? "")).localeCompare(a.d + a.t + (a.criado ?? "")));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remotos, q, acao, origem, soFoto, de, ate, mapa]);

  const tam = visao === "galeria" ? POR_PAGINA_GALERIA : POR_PAGINA;
  const base = visao === "galeria" ? lista.filter(r => r.foto) : lista;
  const paginas = Math.max(1, Math.ceil(base.length / tam));
  const pagina = Math.min(pag, paginas - 1);
  const itens = base.slice(pagina * tam, pagina * tam + tam);
  const todosSel = itens.length > 0 && itens.every(r => sel.has(r.id));

  useEffect(() => setPag(0), [q, acao, origem, soFoto, de, ate, visao]);
  const alternar = (id: string) => setSel(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const aposExcluir = async (n: number) => {
    const ids = excluir ?? [];
    await removerRemotos(ids);
    setSel(new Set()); setExcluir(null); setAberto(null);
    setAviso(`${n} ${n === 1 ? "registro excluído" : "registros excluídos"}.`);
    setTimeout(() => setAviso(""), 5000);
    void atualizarRemoto(true);
  };

  const totalFotos = useMemo(() => remotos.filter(r => r.foto).length, [remotos]);

  if (!remotoAtivo) return <Card><Vazio texto="O banco de dados (Supabase) não está conectado neste ambiente." /></Card>;

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Registros no banco", remotos.length], ["Com evidência (foto)", totalFotos], ["Lançados pelo app", remotos.filter(ehApp).length], ["Resultado do filtro", lista.length]].map(([r, v]) => (
          <div key={r as string} className="card p-5"><div className="eyebrow">{r}</div><div className="display num mt-1.5 text-[34px] leading-none text-brand">{(v as number).toLocaleString("pt-BR")}</div></div>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-2.5">
          <div className="relative min-w-[240px] flex-1"><Search size={16} className="absolute left-3.5 top-[17px] text-ink/35" />
            <input className="campo !h-[52px] !pl-10" placeholder="Buscar por nome, matrícula, equipe ou local" value={q} onChange={e => setQ(e.target.value)} /></div>
          <Select rotulo="Ação" valor={acao} onChange={v => setAcao(+v)} opcoes={[{ v: -1, t: "Todas" }, ...ACAO_CURTA.map((a, i) => ({ v: i, t: a }))]} />
          <Select rotulo="Origem" valor={origem} onChange={setOrigem} opcoes={[{ v: "", t: "Todas" }, { v: "app", t: "Aplicativo" }, { v: "historico", t: "Histórico" }]} />
          <label className="block"><span className="eyebrow mb-1 block !text-[9.5px]">De</span><input type="date" className="campo !h-[52px] !w-[160px]" value={de} onChange={e => setDe(e.target.value)} /></label>
          <label className="block"><span className="eyebrow mb-1 block !text-[9.5px]">Até</span><input type="date" className="campo !h-[52px] !w-[160px]" value={ate} onChange={e => setAte(e.target.value)} /></label>
          <label className="flex h-[52px] cursor-pointer items-center gap-2 rounded-2xl bg-ink/5 px-4 text-[13px] font-bold"><input type="checkbox" checked={soFoto} onChange={e => setSoFoto(e.target.checked)} className="accent-[#9c2a42]" /> Só com foto</label>
          <div className="flex rounded-2xl bg-ink/5 p-1">
            {([["lista", List, "Lista"], ["galeria", LayoutGrid, "Galeria"]] as const).map(([k, I, t]) => (
              <button key={k} onClick={() => setVisao(k)} className={clsx("flex h-11 items-center gap-2 rounded-xl px-3.5 text-[13px] font-bold transition", visao === k ? "bg-field text-brand shadow" : "text-ink/50")}><I size={16} />{t}</button>
            ))}
          </div>
        </div>

        {sel.size > 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-soft px-4 py-3">
            <span className="text-[13.5px] font-extrabold text-brand">{sel.size} selecionado(s)</span>
            <button className="text-[12.5px] font-bold text-ink/50 underline" onClick={() => setSel(new Set())}>limpar seleção</button>
            <button className="btn btn-vinho ml-auto !h-10 !px-4 text-[13px]" onClick={() => setExcluir([...sel])}><Trash2 size={16} /> Excluir selecionados</button>
          </div>
        )}
        {aviso && <div role="status" className="mt-4 rounded-2xl bg-oliva/15 px-4 py-3 text-[13.5px] font-bold text-oliva">{aviso}</div>}

        {visao === "lista" ? (
          <div className="rolagem mt-4 overflow-x-auto rounded-2xl border border-ink/8">
            <table className="w-full min-w-[820px] border-collapse">
              <thead className="bg-card"><tr className="text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink/45">
                <th className="w-10 px-3 py-3">{podeExcluir && <input type="checkbox" checked={todosSel} onChange={() => setSel(s => { const n = new Set(s); itens.forEach(r => todosSel ? n.delete(r.id) : n.add(r.id)); return n; })} className="accent-[#9c2a42]" aria-label="Selecionar página" />}</th>
                <th className="px-3 py-3">Data</th><th className="px-3 py-3">Colaborador</th><th className="px-3 py-3">Equipe</th><th className="px-3 py-3">Ação</th><th className="px-3 py-3">Local</th><th className="px-3 py-3">Evidência</th><th className="px-3 py-3">Origem</th>
              </tr></thead>
              <tbody>
                {itens.map(r => (
                  <tr key={r.id} onClick={() => setAberto(r)} className={clsx("cursor-pointer border-t border-ink/6 text-[13px] transition hover:bg-soft", sel.has(r.id) && "bg-soft")}>
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>{podeExcluir && <input type="checkbox" checked={sel.has(r.id)} onChange={() => alternar(r.id)} className="accent-[#9c2a42]" aria-label="Selecionar" />}</td>
                    <td className="num whitespace-nowrap px-3 py-2.5 font-semibold">{brData(r.d)} <span className="text-ink/40">{r.t}</span></td>
                    <td className="px-3 py-2.5"><div className="font-bold text-brand">{nomeDe(r.chapa)}</div><div className="font-mono text-[11px] text-ink/40">{r.chapa}</div></td>
                    <td className="px-3 py-2.5 font-mono text-[12px] font-bold">{r.equipe}</td>
                    <td className="px-3 py-2.5 font-semibold">{ACAO_CURTA[r.acao]}</td>
                    <td className="max-w-[220px] truncate px-3 py-2.5 text-ink/55" title={r.local}>{r.local ?? "—"}</td>
                    <td className="px-3 py-2.5">{r.foto ? <span className="inline-flex items-center gap-1.5 rounded-full bg-oliva/15 px-2.5 py-1 text-[11.5px] font-extrabold text-oliva"><Camera size={13} /> {caminhos(r).length > 1 ? `${caminhos(r).length} fotos` : "ver foto"}</span> : <span className="text-ink/30">—</span>}</td>
                    <td className="px-3 py-2.5"><span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-extrabold", ehApp(r) ? "bg-ambar/20 text-[#8a5d00] dark:text-ambar" : "bg-ink/6 text-ink/50")}>{ehApp(r) ? "app" : "histórico"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!itens.length && <Vazio texto="Nenhum registro encontrado." />}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {itens.map(r => (
              <button key={r.id} onClick={() => setAberto(r)} className="group overflow-hidden rounded-2xl border border-ink/8 bg-card text-left transition hover:-translate-y-0.5 hover:shadow-lg">
                <Foto path={r.foto!} largura={420} className="aspect-[4/3] w-full" alt={`Evidência de ${nomeDe(r.chapa)}`} />
                <div className="p-3.5"><div className="truncate text-[13.5px] font-extrabold text-brand">{nomeDe(r.chapa)}</div>
                  <div className="mt-0.5 text-[12px] font-semibold text-ink/50">{ACAO_CURTA[r.acao]} · {r.equipe}</div>
                  <div className="num text-[11.5px] font-semibold text-ink/40">{brData(r.d)} {r.t}{caminhos(r).length > 1 ? ` · ${caminhos(r).length} fotos` : ""}</div></div>
              </button>
            ))}
            {!itens.length && <div className="col-span-full"><Vazio texto="Nenhuma evidência (foto) encontrada. Os registros históricos não têm foto." /></div>}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-[13px] font-semibold text-ink/55">
          <span>{base.length.toLocaleString("pt-BR")} {visao === "galeria" ? "evidências" : "registros"} · página {pagina + 1} de {paginas}</span>
          <div className="flex gap-2">
            <button className="btn btn-claro !h-10 !w-10 !p-0" disabled={pagina === 0} onClick={() => setPag(pagina - 1)} aria-label="Anterior"><ChevronLeft size={18} /></button>
            <button className="btn btn-claro !h-10 !w-10 !p-0" disabled={pagina >= paginas - 1} onClick={() => setPag(pagina + 1)} aria-label="Próxima"><ChevronRight size={18} /></button>
          </div>
        </div>
      </Card>

      <AnimatePresence>
        {aberto && !excluir && <Detalhe key="d" r={aberto} nome={nomeDe(aberto.chapa)} onFechar={() => setAberto(null)} onExcluir={podeExcluir ? () => setExcluir([aberto.id]) : undefined} />}
        {excluir && <ModalExcluir key="e" ids={excluir} onFechar={() => setExcluir(null)} onOk={n => void aposExcluir(n)} />}
      </AnimatePresence>
    </>
  );
}
