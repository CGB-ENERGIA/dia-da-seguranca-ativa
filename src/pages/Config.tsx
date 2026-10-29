import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { clsx } from "clsx";
import { Check, CircleDashed, Minus, Pencil, Plus, RefreshCw, Search, ShieldCheck, Target, Users, Waypoints, X, CheckCircle2, Copy } from "lucide-react";
import { Card, CountUp, Select } from "../components/ui";
import BuscaNome from "../components/BuscaNome";
import { useData } from "../store/data";
import { useAuth } from "../store/auth";
import { useDados } from "../store/derivados";
import { filtrosIniciais, porColaborador, visitas } from "../lib/analytics";
import { agora } from "../lib/dates";
import { ehLideranca } from "../lib/lideranca";
import { remotoAtivo } from "../lib/remote";
import { sincronizar, useSync } from "../lib/sync";
import type { Colab, Equipe } from "../lib/types";

type Aba = "meta" | "colabs" | "equipes" | "obs" | "sistema";
const ABAS: [Aba, string][] = [["meta", "Meta"], ["colabs", "Colaboradores"], ["equipes", "Equipes"], ["obs", "Observadores"], ["sistema", "Sistema"]];


function Campo({ rot, v, on, tipo = "text", opcoes, desab }: { rot: string; v: string; on: (v: string) => void; tipo?: string; opcoes?: string[]; desab?: boolean }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{rot}</span>
      {opcoes ? (
        <select className="campo" value={v} onChange={e => on(e.target.value)}>{opcoes.map(o => <option key={o}>{o}</option>)}</select>
      ) : (
        <input className="campo" type={tipo} value={v} disabled={desab} onChange={e => on(e.target.value)} />
      )}
    </label>
  );
}

function Gaveta({ titulo, aberto, onFechar, children }: { titulo: string; aberto: boolean; onFechar: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {aberto && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onFechar} className="fixed inset-0 z-40 bg-[#000]/50 backdrop-blur-sm" />
          <motion.aside initial={{ x: 460 }} animate={{ x: 0 }} exit={{ x: 460 }} transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col bg-card shadow-2xl">
            <header className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
              <h3 className="display text-[22px] text-brand">{titulo}</h3>
              <button onClick={onFechar} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-soft"><X size={18} /></button>
            </header>
            <div className="rolagem flex-1 space-y-4 overflow-y-auto p-6">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default function Config() {
  const [gestor, setGestor] = useState(true);
  const { colabs, equipes, edicoes, setMeta, setMetaColab, salvarColab, salvarEquipe, historico } = useData();
  const { linhas } = useDados();
  const { pendentes, online, sincronizando } = useSync();
  const { liberarDia, setLiberar } = useAuth();
  const [aba, setAba] = useState<Aba>("meta");
  const [ano, setAno] = useState(+agora().d.slice(0, 4));
  const [q, setQ] = useState("");
  const [soLid, setSoLid] = useState(false);
  const [edC, setEdC] = useState<(Colab & { novo?: boolean }) | null>(null);
  const [edE, setEdE] = useState<(Equipe & { novo?: boolean }) | null>(null);
  const [sel, setSel] = useState<Colab | null>(null);
  const [copiado, setCopiado] = useState("");

  const doAno = useMemo(() => linhas.filter(l => l.ano === ano), [linhas, ano]);
  const porChapa = useMemo(() => {
    const m = new Map<number, typeof doAno>();
    for (const l of doAno) (m.get(l.chapa) ?? m.set(l.chapa, []).get(l.chapa)!).push(l);
    return m;
  }, [doAno]);
  const porEquipe = useMemo(() => {
    const m = new Map<string, typeof doAno>();
    for (const l of doAno) (m.get(l.equipe) ?? m.set(l.equipe, []).get(l.equipe)!).push(l);
    return m;
  }, [doAno]);
  const f = useMemo(() => filtrosIniciais(ano), [ano]);
  const obs = useMemo(() => porColaborador(doAno, colabs, f, { meta: edicoes.meta, metas: edicoes.metas }), [doAno, colabs, f, edicoes]);
  const anos = useMemo(() => [...new Set(linhas.map(l => l.ano))].sort(), [linhas]);

  const lideres = useMemo(() => colabs.filter(c => c.l === 1 && c.s === "A" && c.gr === "SEGURANÇA"), [colabs]);
  const t = q.trim().toLowerCase();

  /* ——— acesso da gestão ——— */
  if (!gestor) {
    return (
      <div className="mx-auto mt-8 max-w-[460px]">
        <Card>
          <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-vinho-700 text-white"><ShieldCheck size={26} /></div>
          <h2 className="display text-[26px] text-brand">Acesso da gestão</h2>
          <p className="mb-6 mt-2 text-[14px] font-medium text-ink/55">Configurações são restritas ao SESMT. Escolha seu nome.</p>
          <BuscaNome opcoes={lideres} sel={sel} onSel={setSel} rotulo="Nome" aviso="Nome não encontrado entre a equipe de Segurança." />
          <button className="btn btn-vinho mt-2 w-full" disabled={!sel} onClick={() => { try { sessionStorage.setItem("dsa:gestor", "1"); } catch { /* */ } setGestor(true); }}>Entrar</button>
        </Card>
      </div>
    );
  }

  const copiar = async (rot: string, url: string) => {
    try { await navigator.clipboard.writeText(url); setCopiado(rot); setTimeout(() => setCopiado(""), 1500); } catch { /* */ }
  };
  const base = location.href.split("#")[0];

  const listaColabs = colabs.filter(c => (!soLid || c.l === 1) && (!t || c.nome.toLowerCase().includes(t) || c.n.toLowerCase().includes(t) || String(c.c).includes(t)))
    .sort((a, b) => (porChapa.get(b.c)?.length ?? 0) - (porChapa.get(a.c)?.length ?? 0) || a.nome.localeCompare(b.nome));
  const listaEq = equipes.filter(e => e.y.includes(ano) && (!t || e.p.toLowerCase().includes(t) || e.pr.toLowerCase().includes(t)))
    .sort((a, b) => (porEquipe.get(b.p)?.length ?? 0) - (porEquipe.get(a.p)?.length ?? 0) || a.p.localeCompare(b.p));
  const ativos = colabs.filter(c => c.s === "A").length;

  const Th = ({ children, d }: { children?: React.ReactNode; d?: boolean }) => <th className={clsx("px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink/45", d && "hidden md:table-cell")}>{children}</th>;
  const Td = ({ children, d, cls }: { children?: React.ReactNode; d?: boolean; cls?: string }) => <td className={clsx("px-3 py-2.5 text-[13px]", d && "hidden md:table-cell", cls)}>{children}</td>;

  return (
    <div className="space-y-5">
      {/* resumo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { i: Users, v: colabs.length, r: "colaboradores", s: `${ativos} ativos` },
          { i: Waypoints, v: equipes.filter(e => e.y.includes(ano)).length, r: "equipes", s: `em ${ano}` },
          { i: ShieldCheck, v: colabs.filter(c => c.l === 1 && c.s === "A").length, r: "observadores", s: "lideranças ativas" },
          { i: Target, v: edicoes.meta, r: "meta por quarta", s: "ações por observador" },
        ].map(k => (
          <div key={k.r} className="card p-5">
            <k.i size={18} className="text-vinho-500" />
            <div className="display num mt-3 text-[40px] leading-none text-brand"><CountUp valor={k.v} /></div>
            <div className="mt-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-ink/50">{k.r}</div>
            <div className="text-[11.5px] font-medium text-ink/35">{k.s}</div>
          </div>
        ))}
      </div>

      {/* abas */}
      <div className="flex flex-wrap items-center gap-3">
        <Select neutro rotulo="Ano" valor={ano} onChange={v => setAno(+v)} opcoes={anos.map(a => ({ v: a, t: String(a) }))} className="!min-w-[120px]" />
        <div className="flex flex-wrap gap-1 rounded-2xl bg-ink/5 p-1">
          {ABAS.map(([k, r]) => (
            <button key={k} onClick={() => { setAba(k); setQ(""); }} className={clsx("relative rounded-xl px-4 py-2 text-[13px] font-bold transition", aba === k ? "text-brand" : "text-ink/50 hover:text-ink")}>
              {aba === k && <motion.span layoutId="aba" className="absolute inset-0 rounded-xl bg-field shadow" />}
              <span className="relative">{r}</span>
            </button>
          ))}
        </div>
      </div>

      {/* META */}
      {aba === "meta" && (
        <Card titulo="Meta por quarta-feira" sub="vale para todos os observadores, salvo meta individual (aba Observadores)">
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-4">
              <button className="btn btn-claro !h-14 !w-14 !p-0" onClick={() => void setMeta(edicoes.meta - 1)} disabled={edicoes.meta <= 0} aria-label="Diminuir"><Minus size={20} /></button>
              <div className="min-w-[110px] text-center">
                <input aria-label="Meta" type="number" min={0} value={edicoes.meta} onChange={e => void setMeta(Number(e.target.value) || 0)}
                  className="display num w-28 bg-transparent text-center text-[72px] leading-none text-brand outline-none" />
                <div className="eyebrow">ação{edicoes.meta === 1 ? "" : "ões"} por quarta</div>
              </div>
              <button className="btn btn-claro !h-14 !w-14 !p-0" onClick={() => void setMeta(edicoes.meta + 1)} aria-label="Aumentar"><Plus size={20} /></button>
            </div>
            <div className="max-w-[420px] text-[13.5px] font-medium leading-relaxed text-ink/55">
              A <b className="text-brand">aderência</b> de cada observador é a média, em cada quarta-feira do período, de
              <i> ações feitas ÷ meta</i> (máximo 100%). O padrão é 1 ação por quarta.
              {edicoes.meta !== 1 && <button className="ml-2 font-bold text-brand underline" onClick={() => void setMeta(1)}>restaurar 1</button>}
            </div>
          </div>
        </Card>
      )}

      {/* COLABORADORES */}
      {aba === "colabs" && (
        <Card titulo="Cadastro de colaboradores" sub={`${listaColabs.length} de ${colabs.length} · ações e visitas em ${ano}`}
          direita={<button className="btn btn-vinho !h-10 !px-4 text-[13px]" onClick={() => setEdC({ c: 0, n: "", nome: "", f: "", p: "", b: "", g: "", gr: "SUPERVISORES", s: "A", ger: "", l: 1, novo: true })}><Plus size={16} /> Novo</button>}>
          <div className="mb-3 flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3.5 top-[14px] text-ink/35" /><input className="campo !h-11 !pl-10" placeholder="Buscar nome ou chapa" value={q} onChange={e => setQ(e.target.value)} /></div>
            <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-ink/5 px-4 text-[13px] font-bold"><input type="checkbox" checked={soLid} onChange={e => setSoLid(e.target.checked)} className="accent-[#9c2a42]" /> Só lideranças</label>
          </div>
          <div className="rolagem max-h-[620px] overflow-auto rounded-2xl border border-ink/8">
            <table className="w-full min-w-[680px] border-collapse">
              <thead className="sticky top-0 bg-card"><tr><Th>Colaborador</Th><Th d>Função</Th><Th>Base</Th><Th d>Gerência</Th><Th>Líder</Th><Th>Ações</Th><Th d>Visitas</Th><Th /></tr></thead>
              <tbody>
                {listaColabs.slice(0, 200).map(c => {
                  const rs = porChapa.get(c.c) ?? [];
                  return (
                    <tr key={c.c} className="border-t border-ink/6 transition hover:bg-soft">
                      <Td><div className="font-bold text-brand">{c.nome}</div><div className="font-mono text-[11px] text-ink/40">{c.c}{c.s === "D" && " · desligado"}</div></Td>
                      <Td d cls="text-ink/60">{c.f.toLowerCase()}</Td><Td>{c.b}</Td><Td d>{c.g}</Td>
                      <Td>{c.l ? <span className="rounded-full bg-oliva/15 px-2 py-0.5 text-[11px] font-extrabold text-oliva">sim</span> : <span className="text-ink/30">—</span>}</Td>
                      <Td cls="num font-extrabold">{rs.length}</Td><Td d cls="num">{visitas(rs)}</Td>
                      <Td><button onClick={() => setEdC(c)} className="grid h-10 w-10 place-items-center rounded-lg text-ink/45 hover:bg-card hover:text-brand" aria-label="Editar"><Pencil size={15} /></button></Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {listaColabs.length > 200 && <p className="mt-2 text-[12px] font-semibold text-ink/40">Mostrando 200 — refine a busca.</p>}
        </Card>
      )}

      {/* EQUIPES */}
      {aba === "equipes" && (
        <Card titulo="Cadastro de equipes" sub={`${listaEq.length} equipes ativas em ${ano}`}
          direita={<button className="btn btn-vinho !h-10 !px-4 text-[13px]" onClick={() => setEdE({ p: "", pr: "", b: "", g: "", y: [ano], novo: true })}><Plus size={16} /> Nova</button>}>
          <div className="relative mb-3"><Search size={16} className="absolute left-3.5 top-[14px] text-ink/35" /><input className="campo !h-11 !pl-10" placeholder="Buscar prefixo ou processo" value={q} onChange={e => setQ(e.target.value)} /></div>
          <div className="rolagem max-h-[620px] overflow-auto rounded-2xl border border-ink/8">
            <table className="w-full min-w-[560px] border-collapse">
              <thead className="sticky top-0 bg-card"><tr><Th>Prefixo</Th><Th>Processo</Th><Th>Base</Th><Th d>Gerência</Th><Th>Visitas</Th><Th d>Ações</Th><Th /></tr></thead>
              <tbody>
                {listaEq.slice(0, 250).map(e => {
                  const rs = porEquipe.get(e.p) ?? [];
                  return (
                    <tr key={e.p} className="border-t border-ink/6 transition hover:bg-soft">
                      <Td cls="font-mono font-bold text-brand">{e.p}</Td><Td>{e.pr}</Td><Td>{e.b}</Td><Td d>{e.g}</Td>
                      <Td cls={clsx("num font-extrabold", !rs.length && "text-vinho-500")}>{visitas(rs)}</Td><Td d cls="num">{rs.length}</Td>
                      <Td><button onClick={() => setEdE(e)} className="grid h-10 w-10 place-items-center rounded-lg text-ink/45 hover:bg-card hover:text-brand" aria-label="Editar"><Pencil size={15} /></button></Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* OBSERVADORES */}
      {aba === "obs" && (
        <Card titulo="Observadores e metas" sub={`lideranças ativas · desempenho em ${ano} · deixe a meta individual em branco para usar a padrão (${edicoes.meta})`}>
          <div className="rolagem max-h-[640px] overflow-auto rounded-2xl border border-ink/8">
            <table className="w-full min-w-[640px] border-collapse">
              <thead className="sticky top-0 bg-card"><tr><Th>Observador</Th><Th d>Base</Th><Th>Ações</Th><Th d>Visitas</Th><Th>Quartas cumpridas</Th><Th>Aderência</Th><Th>Meta / quarta</Th></tr></thead>
              <tbody>
                {obs.map(o => (
                  <tr key={o.c.c} className="border-t border-ink/6 hover:bg-soft">
                    <Td><div className="font-bold text-brand">{o.c.n}</div><div className="text-[11px] text-ink/40">{o.c.f.toLowerCase()}</div></Td>
                    <Td d>{o.c.b}</Td><Td cls="num font-extrabold">{o.acoes}</Td><Td d cls="num">{o.visitas}</Td>
                    <Td cls="num">{o.dias}/{o.meta}</Td>
                    <Td><span className={clsx("rounded-full px-2.5 py-1 text-[11.5px] font-extrabold", o.aderencia >= 0.8 ? "bg-oliva/15 text-oliva" : o.aderencia >= 0.4 ? "bg-ambar/25 text-[#8a5d00] dark:text-ambar" : "bg-soft2 text-brand")}>{Math.round(o.aderencia * 100)}%</span></Td>
                    <Td>
                      <input type="number" min={0} placeholder={String(edicoes.meta)} value={edicoes.metas[o.c.c] ?? ""} aria-label={`Meta de ${o.c.n}`}
                        onChange={e => void setMetaColab(o.c.c, e.target.value === "" ? null : Number(e.target.value))}
                        className="campo !h-9 !w-20 !px-2 text-center" />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* SISTEMA */}
      {aba === "sistema" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card titulo="Links" sub="envie cada link ao seu público">
            {[["Registrar ação", `${base}#/registrar`], ["Relatório", `${base}#/relatorio`]].map(([r, u]) => (
              <div key={r} className="mb-3">
                <div className="eyebrow mb-1.5">{r}</div>
                <div className="flex items-center gap-2 rounded-xl bg-ink/5 py-1.5 pl-3 pr-1.5">
                  <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink/60">{u}</code>
                  <button onClick={() => void copiar(r, u)} className="grid h-9 w-9 place-items-center rounded-lg bg-field text-brand shadow-sm">{copiado === r ? <Check size={16} /> : <Copy size={16} />}</button>
                </div>
              </div>
            ))}
          </Card>
          <Card titulo="Desenvolvedor">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-vinho-700 text-[18px] font-extrabold text-white">MQ</div>
              <div><div className="text-[16px] font-extrabold text-brand">Marcus Vinicius Silva Queiros</div><div className="text-[12.5px] font-medium text-ink/50">Desenvolvimento e manutenção · CGB Energia</div></div>
            </div>
          </Card>
          <Card titulo="Estado do sistema">
            <ul className="space-y-3.5 text-[13.5px]">
              {[
                [remotoAtivo, remotoAtivo ? "Servidor conectado (Supabase)" : "Servidor não configurado", remotoAtivo ? "Registros, fotos e edições são compartilhados." : "Registros e edições ficam só neste aparelho."],
                [online, online ? "Com conexão" : "Sem conexão", `${pendentes} lançamento(s) na fila`],
                [true, remotoAtivo ? "Cadastro e histórico no Supabase" : "Base histórica importada", `${historico.length.toLocaleString("pt-BR")} ações · ${colabs.length} colaboradores · ${equipes.length} equipes`],
              ].map(([ok, tt, d]) => (
                <li key={String(tt)} className="flex items-start gap-3">
                  {ok ? <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-oliva" /> : <CircleDashed size={19} className="mt-0.5 shrink-0 text-ambar" />}
                  <div><div className="font-extrabold text-brand">{tt as string}</div><div className="text-[12.5px] font-medium text-ink/50">{d as string}</div></div>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button className="btn btn-vinho !h-11" onClick={() => void sincronizar()} disabled={sincronizando}><RefreshCw size={16} className={sincronizando ? "animate-spin" : ""} /> Sincronizar</button>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] font-bold"><input type="checkbox" checked={liberarDia} onChange={e => setLiberar(e.target.checked)} className="accent-[#9c2a42]" /> Liberar lançamento fora da quarta</label>
            </div>
          </Card>
        </div>
      )}

      {/* editor de colaborador */}
      <Gaveta titulo={edC?.novo ? "Novo colaborador" : "Editar colaborador"} aberto={!!edC} onFechar={() => setEdC(null)}>
        {edC && (
          <>
            <Campo rot="Chapa" v={edC.c ? String(edC.c) : ""} on={v => setEdC({ ...edC, c: Number(v.replace(/\D/g, "")) })} desab={!edC.novo} />
            <Campo rot="Nome completo" v={edC.nome} on={v => setEdC({ ...edC, nome: v.toUpperCase() })} />
            <Campo rot="Nome curto" v={edC.n} on={v => setEdC({ ...edC, n: v })} />
            <Campo rot="Função" v={edC.f} on={v => setEdC({ ...edC, f: v.toUpperCase(), l: ehLideranca(v) ? 1 : edC.l })} />
            <div className="grid grid-cols-2 gap-3">
              <Campo rot="Base" v={edC.b} on={v => setEdC({ ...edC, b: v.toUpperCase() })} />
              <Campo rot="Gerência" v={edC.g} on={v => setEdC({ ...edC, g: v.toUpperCase() })} />
              <Campo rot="Processo" v={edC.p} on={v => setEdC({ ...edC, p: v })} />
              <Campo rot="Grupo" v={edC.gr} on={v => setEdC({ ...edC, gr: v })} opcoes={["FISCAIS", "SUPERVISORES", "SEGURANÇA", "GERENTES"]} />
              <Campo rot="Situação" v={edC.s === "A" ? "Ativo" : "Desligado"} on={v => setEdC({ ...edC, s: v === "Ativo" ? "A" : "D" })} opcoes={["Ativo", "Desligado"]} />
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-ink/5 p-3 text-[13.5px] font-bold">
              <input type="checkbox" checked={edC.l === 1} onChange={e => setEdC({ ...edC, l: e.target.checked ? 1 : 0 })} className="h-4 w-4 accent-[#9c2a42]" />
              Liderança (entra na meta e pode lançar)
            </label>
            <button className="btn btn-vinho w-full" disabled={!edC.c || !edC.nome} onClick={() => { const { novo: _n, ...c } = edC; void salvarColab({ ...c, n: c.n || c.nome.split(" ")[0] }); setEdC(null); }}>Salvar</button>
          </>
        )}
      </Gaveta>

      {/* editor de equipe */}
      <Gaveta titulo={edE?.novo ? "Nova equipe" : "Editar equipe"} aberto={!!edE} onFechar={() => setEdE(null)}>
        {edE && (
          <>
            <Campo rot="Prefixo" v={edE.p} on={v => setEdE({ ...edE, p: v.toUpperCase() })} desab={!edE.novo} />
            <Campo rot="Processo" v={edE.pr} on={v => setEdE({ ...edE, pr: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Campo rot="Base" v={edE.b} on={v => setEdE({ ...edE, b: v.toUpperCase() })} />
              <Campo rot="Gerência" v={edE.g} on={v => setEdE({ ...edE, g: v.toUpperCase() })} />
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-ink/5 p-3 text-[13.5px] font-bold">
              <input type="checkbox" checked={edE.y.includes(ano)} onChange={e => setEdE({ ...edE, y: e.target.checked ? [...new Set([...edE.y, ano])] : edE.y.filter(a => a !== ano) })} className="h-4 w-4 accent-[#9c2a42]" />
              Equipe ativa em {ano}
            </label>
            <button className="btn btn-vinho w-full" disabled={!edE.p} onClick={() => { const { novo: _n, ...e } = edE; void salvarEquipe(e); setEdE(null); }}>Salvar</button>
          </>
        )}
      </Gaveta>
    </div>
  );
}
