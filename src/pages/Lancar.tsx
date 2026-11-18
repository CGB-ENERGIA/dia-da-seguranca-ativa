import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { clsx } from "clsx";
import {
  Camera, Check, Download, FileClock, LoaderCircle, Plus, SwitchCamera, LockKeyhole, MapPin, MapPinOff,
  Search, Siren, ClipboardCheck, GraduationCap, Truck, Wrench, HardHat, X,
} from "lucide-react";
import { useAuth } from "../store/auth";
import { useData } from "../store/data";
import { ACAO_CURTA, ACOES_ATIVAS, agora, brData, diaSemanaExtenso, novoId, proximaQuarta } from "../lib/dates";
import { obterLocal, coordTexto, type Local } from "../lib/geo";
import { carimbar } from "../lib/stamp";
import { salvarFoto, salvarReg } from "../lib/db";
import { contarPendentes, sincronizar } from "../lib/sync";
import { remotoAtivo } from "../lib/remote";
import { agoraConfiavel, carregarRelogio, sincronizarRelogio } from "../lib/relogio";
import type { Reg } from "../lib/types";

const MAX_FOTOS = 5;
interface FotoTirada { id: string; blob: Blob; url: string; quando: Date; local: Local }

const ICONES = [Siren, ClipboardCheck, Wrench, HardHat, Truck, GraduationCap];

export const nomeArquivo = (chapa: number, equipe: string, d: string, t: string) =>
  `DSA_${chapa}_${equipe.replace(/[^\w-]+/g, "_")}_${d.replace(/-/g, "")}-${t.replace(":", "")}.jpg`;

export function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function Bloqueado() {
  const p = proximaQuarta(agoraConfiavel());
  return (
    <div className="mx-auto mt-6 max-w-[620px]">
      <div className="card relative overflow-hidden p-8 text-center sm:p-12">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-ambar/25 blur-3xl" />
        <motion.div initial={{ scale: 0.7, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 220, damping: 14 }}
          className="relative mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-vinho-900 text-ambar shadow-xl">
          <LockKeyhole size={34} />
        </motion.div>
        <h2 className="display text-[40px] leading-none text-brand">Hoje não é quarta-feira</h2>
        <p className="mx-auto mt-4 max-w-[420px] text-[15px] font-medium leading-relaxed text-ink/55">
          O Dia da Segurança Ativa acontece <b className="text-brand">todas as quartas-feiras</b>. Hoje é {diaSemanaExtenso(agoraConfiavel())} — os lançamentos reabrem em
        </p>
        <div className="mt-6 inline-flex items-baseline gap-2 rounded-2xl bg-soft px-6 py-3">
          <span className="display text-[44px] leading-none text-brand">{p.dias}</span>
          <span className="text-[14px] font-bold text-brand">{p.dias === 1 ? "dia" : "dias"} · {brData(p.d)}</span>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/registrar/meus" className="btn btn-claro"><FileClock size={18} /> Meus lançamentos</Link>
        </div>
      </div>
    </div>
  );
}

export default function Lancar() {
  const chapa = useAuth(s => s.perfil?.chapa ?? null);
  const colab = useData(s => (chapa ? s.mapa.get(chapa) : undefined));
  const equipes = useData(s => s.equipes);
  // hora do servidor quando há internet (o relógio do aparelho pode ser mudado pelo usuário)
  const [relogio, setRelogio] = useState(() => agoraConfiavel());
  const hoje = agora(relogio);
  const quarta = hoje.weekday === 3;

  const [busca, setBusca] = useState("");
  const [equipe, setEquipe] = useState("");
  const [acoes, setAcoes] = useState<number[]>([]);
  const [local, setLocal] = useState<Local | null>(null);
  const [buscandoLocal, setBuscandoLocal] = useState(true);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [lado, setLado] = useState<"environment" | "user">("environment"); // traseira ou frontal
  const [varias, setVarias] = useState(false); // o aparelho tem mais de uma câmera
  const [camErro, setCamErro] = useState("");
  const [fotos, setFotos] = useState<FotoTirada[]>([]); // de 1 a 5 evidências
  const [ativa, setAtiva] = useState(0);
  const [processando, setProcessando] = useState(false);
  const [salvo, setSalvo] = useState<{ ok: boolean; nome: string; qtd: number } | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [ar, setAr] = useState(4 / 3);

  const pegarLocal = useCallback(async () => {
    setBuscandoLocal(true);
    setLocal(await obterLocal());
    setBuscandoLocal(false);
  }, []);
  useEffect(() => { void pegarLocal(); }, [pegarLocal]);
  useEffect(() => { const i = setInterval(() => setRelogio(agoraConfiavel()), 1000); return () => clearInterval(i); }, []);
  useEffect(() => {
    void carregarRelogio().then(() => sincronizarRelogio()).then(() => setRelogio(agoraConfiavel()));
    const i = setInterval(() => void sincronizarRelogio(), 120000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (video.current && stream) { video.current.srcObject = stream; void video.current.play().catch(() => {}); }
    return () => { /* parada explícita em fecharCamera */ };
  }, [stream]);
  useEffect(() => () => stream?.getTracks().forEach(t => t.stop()), [stream]);

  const abrirCamera = async (modo: "environment" | "user" = lado) => {
    setCamErro("");
    if (!navigator.mediaDevices?.getUserMedia) { setCamErro("Este navegador não permite abrir a câmera. Use o Chrome (Android) ou o Safari (iPhone) atualizado."); return; }
    stream?.getTracks().forEach(t => t.stop()); // libera a câmera atual antes de abrir a outra
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: modo }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      setStream(s);
      setLado(modo);
      // depois da permissão o navegador informa quantas câmeras existem
      navigator.mediaDevices.enumerateDevices().then(d => setVarias(d.filter(x => x.kind === "videoinput").length > 1)).catch(() => setVarias(false));
    } catch {
      setCamErro("Não consegui abrir a câmera. Permita o acesso à câmera nas configurações do navegador e tente de novo.");
    }
  };
  const alternarCamera = () => abrirCamera(lado === "environment" ? "user" : "environment");
  const fecharCamera = () => { stream?.getTracks().forEach(t => t.stop()); setStream(null); };

  const sugestoes = useMemo(() => {
    const q = busca.trim().toUpperCase();
    const lista = equipes.filter(e => e.y.includes(+hoje.d.slice(0, 4)) && (!q || e.p.includes(q) || e.pr.toUpperCase().includes(q)));
    return lista.sort((a, b) => Number(b.b === colab?.b) - Number(a.b === colab?.b) || a.p.localeCompare(b.p)).slice(0, 7);
  }, [busca, equipes, colab, hoje.d]);

  const montar = async (fonte: CanvasImageSource, w: number, h: number, quando: Date, l: Local) => {
    if (!colab) return;
    setProcessando(true);
    const blob = await carimbar(fonte, w, h, {
      quando, nome: colab.n, chapa: colab.c, equipe, acoes,
      local: l.label,
      coordenadas: `${coordTexto(l.lat, l.lon)} ±${l.prec}m`,
    });
    setAr(w / h);
    setAtiva(fotos.length);
    setFotos([...fotos, { id: novoId(), blob, url: URL.createObjectURL(blob), quando, local: l }]);
    setProcessando(false);
    fecharCamera();
  };

  /** Só a câmera ao vivo gera foto (não há galeria). Exige quarta-feira pela hora do servidor e localização. */
  const capturar = async () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    if (fotos.length >= MAX_FOTOS) { setCamErro("Limite de 5 fotos por lançamento."); return; }
    setCamErro("");
    setProcessando(true);
    await sincronizarRelogio();
    const quando = agoraConfiavel();
    setRelogio(quando);
    if (agora(quando).weekday !== 3) { setProcessando(false); setCamErro("Hoje não é quarta-feira. Os lançamentos só são aceitos às quartas."); fecharCamera(); return; }
    let l = local;
    if (!l) { setBuscandoLocal(true); l = await obterLocal(); setLocal(l); setBuscandoLocal(false); }
    if (!l) { setProcessando(false); setCamErro("Ative a localização do aparelho para registrar (a foto leva o local carimbado)."); return; }
    await montar(v, v.videoWidth, v.videoHeight, quando, l);
  };

  const removerFoto = (i: number) => {
    URL.revokeObjectURL(fotos[i].url);
    const resto = fotos.filter((_, k) => k !== i);
    setFotos(resto);
    setAtiva(Math.max(0, Math.min(ativa, resto.length - 1)));
  };

  const salvar = async () => {
    if (!fotos.length || !colab) return; // é preciso ao menos 1 evidência
    setProcessando(true);
    const primeira = fotos[0];
    const a = agora(primeira.quando); // vale o momento da primeira foto
    if (a.weekday !== 3) { setProcessando(false); setCamErro("A foto não foi tirada numa quarta-feira."); return; }
    const nome = nomeArquivo(colab.c, equipe, a.d, a.t);
    const ids: string[] = [];
    for (let i = 0; i < fotos.length; i++) {
      ids.push(novoId());
      await salvarFoto(ids[i], fotos[i].blob, nome.replace(".jpg", `_${i + 1}.jpg`));
    }
    for (const ac of acoes) {
      const r: Reg = { id: novoId(), d: a.d, t: a.t, chapa: colab.c, equipe, acao: ac, origem: "app", sync: "pending", fotoId: ids[0], fotoIds: ids, lat: primeira.local.lat, lon: primeira.local.lon, local: primeira.local.label };
      await salvarReg(r);
    }
    await useData.getState().recarregarLocais();
    await contarPendentes();
    setSalvo({ ok: true, nome, qtd: acoes.length });
    setProcessando(false);
    void sincronizar();
  };

  const novo = () => {
    fotos.forEach(f => URL.revokeObjectURL(f.url));
    setFotos([]); setAtiva(0); setSalvo(null); setEquipe(""); setBusca(""); setAcoes([]);
    void pegarLocal();
  };

  const baixarTodas = async (nome: string) => {
    for (let i = 0; i < fotos.length; i++) { baixar(fotos[i].blob, nome.replace(".jpg", `_${i + 1}.jpg`)); await new Promise(ok => setTimeout(ok, 400)); }
  };

  if (!colab) return null;
  if (!quarta && !fotos.length && !salvo) return <Bloqueado />;

  const passo = salvo ? 4 : fotos.length ? 3 : equipe && acoes.length ? 3 : equipe ? 2 : 1;
  const pronto = equipe && acoes.length > 0;
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(relogio);

  return (
    <div className="mx-auto max-w-[1040px]">
      {/* progresso */}
      <ol className="mb-6 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.1em]">
        {["Equipe", "Ação", "Foto", "Pronto"].map((t, i) => (
          <li key={t} className="flex flex-1 items-center gap-2">
            <span className={clsx("grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] transition-colors", passo > i + 1 || salvo ? "bg-oliva text-white" : passo === i + 1 ? "bg-vinho-700 text-white" : "bg-ink/8 text-ink/35")}>
              {passo > i + 1 || (salvo && i < 4) ? <Check size={14} strokeWidth={3} /> : i + 1}
            </span>
            <span className={clsx("hidden sm:block", passo >= i + 1 ? "text-brand" : "text-ink/30")}>{t}</span>
            {i < 3 && <span className="h-px flex-1 bg-ink/10" />}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        {salvo ? (
          <motion.div key="ok" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="card overflow-hidden">
            <div className="grid md:grid-cols-[1fr_1.1fr]">
              <div className="relative bg-vinho-900 p-6">
                {fotos[0] && <img src={fotos[0].url} alt="Foto carimbada" className="w-full rounded-2xl shadow-2xl" />}
                {fotos.length > 1 && <ul className="mt-3 flex gap-2">{fotos.slice(1).map(f => <li key={f.id}><img src={f.url} alt="" className="h-14 w-20 rounded-lg object-cover ring-1 ring-white/20" /></li>)}</ul>}
              </div>
              <div className="flex flex-col justify-center p-8">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
                  className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-oliva text-white"><Check size={34} strokeWidth={3} /></motion.div>
                <h2 className="display text-[42px] leading-none text-brand">Lançamento salvo</h2>
                <p className="mt-3 text-[14.5px] font-medium leading-relaxed text-ink/55">
                  {salvo.qtd} {salvo.qtd > 1 ? "ações registradas" : "ação registrada"} em <b>{equipe}</b>. {!remotoAtivo ? "Guardado com segurança neste aparelho (servidor ainda não configurado)." : navigator.onLine
                    ? "Enviando para o servidor…" : "Sem sinal agora: está guardado no aparelho e será enviado automaticamente quando a rede voltar."}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <button className="btn btn-vinho" onClick={() => void baixarTodas(salvo.nome)}><Download size={18} /> Baixar {fotos.length > 1 ? `${fotos.length} fotos` : "foto"}</button>
                  <button className="btn btn-claro" onClick={novo}><Camera size={18} /> Novo lançamento</button>
                </div>
                <Link to="/registrar/meus" className="mt-5 text-[13px] font-bold text-brand underline-offset-4 hover:underline">Ver meus lançamentos →</Link>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" exit={{ opacity: 0 }} className="grid gap-5 lg:grid-cols-[1fr_1.08fr]">
            <div className="space-y-5">
              {/* observador */}
              <div className="card flex items-center gap-4 p-5">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-vinho-700 text-[15px] font-extrabold text-white">{colab.n.slice(0, 2).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <div className="eyebrow">Observador</div>
                  <div className="truncate text-[17px] font-extrabold text-brand">{colab.n} <span className="font-mono text-[13px] font-semibold text-ink/40">· {colab.c}</span></div>
                </div>
                <div className="text-right">
                  <div className="num font-mono text-[18px] font-bold text-brand">{hora}</div>
                  <div className="text-[11.5px] font-semibold text-ink/45">{brData(hoje.d)}</div>
                </div>
              </div>

              {/* equipe */}
              <div className={clsx("card p-5", fotos.length > 0 && "pointer-events-none opacity-60")}>
                <div className="eyebrow mb-3">1 · Equipe visitada</div>
                {equipe ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-soft p-3.5">
                    <Check size={18} className="text-oliva" strokeWidth={3} />
                    <span className="font-mono text-[16px] font-bold text-brand">{equipe}</span>
                    <button className="ml-auto grid h-10 w-10 place-items-center rounded-full text-ink/40 hover:bg-field hover:text-brand" onClick={() => { setEquipe(""); setBusca(""); }} aria-label="Trocar equipe"><X size={16} /></button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search size={17} className="absolute left-4 top-[15px] text-ink/35" />
                      <input className="campo !pl-11 font-mono uppercase" placeholder="Prefixo da equipe" value={busca} onChange={e => setBusca(e.target.value)} />
                    </div>
                    <ul className="mt-2 space-y-1">
                      {sugestoes.map(e => (
                        <li key={e.p}>
                          <button onClick={() => setEquipe(e.p)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-soft">
                            <span className="font-mono text-[14px] font-bold text-brand">{e.p}</span>
                            <span className="ml-auto text-[12px] font-semibold text-ink/40">{e.pr} · {e.b}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* ações */}
              <div className={clsx("card p-5", fotos.length > 0 && "pointer-events-none opacity-60")}>
                <div className="eyebrow mb-1">2 · O que você realizou?</div>
                <p className="mb-3 text-[12px] font-medium text-ink/45">Pode marcar mais de uma: contam como 1 visita e uma ação de cada tipo.</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {ACOES_ATIVAS.map(i => {
                    const Icone = ICONES[i];
                    const on = acoes.includes(i);
                    return (
                      <button key={i} onClick={() => setAcoes(a => (on ? a.filter(x => x !== i) : [...a, i]))} aria-pressed={on}
                        className={clsx("relative flex min-h-[78px] flex-col items-start justify-between rounded-2xl border-2 p-3.5 text-left transition-all active:scale-[.97]",
                          on ? "border-vinho-700 bg-vinho-700 text-white shadow-[0_12px_24px_-12px_rgba(112,22,39,.8)]" : "border-ink/8 bg-field hover:border-vinho-300")}>
                        <Icone size={20} className={on ? "text-ambar" : "text-vinho-600"} />
                        <span className="text-[13px] font-extrabold leading-tight">{ACAO_CURTA[i]}</span>
                        {on && <Check size={15} strokeWidth={3} className="absolute right-3 top-3 text-ambar" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* foto */}
            <div className="card flex flex-col overflow-hidden p-0">
              <div className="flex items-center justify-between px-5 pb-3 pt-5">
                <div className="eyebrow">3 · Fotos da evidência (1 a 5)</div>
                <button onClick={() => void pegarLocal()} className={clsx("flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-bold", local ? "bg-oliva/12 text-oliva" : "bg-ink/6 text-ink/50")}>
                  {buscandoLocal ? <LoaderCircle size={13} className="animate-spin" /> : local ? <MapPin size={13} /> : <MapPinOff size={13} />}
                  <span className="max-w-[180px] truncate">{buscandoLocal ? "buscando local…" : local ? local.label : "sem localização · tocar p/ tentar"}</span>
                </button>
              </div>

              <div className="relative mx-auto mb-5 max-h-[68dvh] w-[calc(100%-2.5rem)] overflow-hidden rounded-2xl bg-vinho-950" style={{ aspectRatio: ar }}>
                {!stream && fotos.length ? (
                  <img src={fotos[ativa]?.url} alt="Pré-visualização carimbada" className="h-full w-full object-contain" />
                ) : stream ? (
                  <>
                    <video ref={video} playsInline muted autoPlay className="h-full w-full object-cover" style={{ transform: lado === "user" ? "scaleX(-1)" : undefined }} onLoadedMetadata={e => { const v = e.currentTarget; if (v.videoWidth) setAr(v.videoWidth / v.videoHeight); }} />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-vinho-950/90 via-vinho-950/60 to-transparent p-4 pt-12 text-white">
                      <div className="flex items-baseline gap-3"><span className="num text-[26px] font-bold">{hora}</span><span className="text-[12px] capitalize text-white/80">{diaSemanaExtenso(relogio)}, {brData(hoje.d)}</span></div>
                      <div className="mt-1 text-[12px] font-semibold">Observador: {colab.n} · {colab.c}</div>
                      <div className="truncate text-[11.5px] text-white/75">{local?.label ?? "Localização indisponível"}</div>
                    </div>
                    {varias && <button onClick={() => void alternarCamera()} aria-label="Virar câmera (frontal/traseira)" className="absolute left-3 top-3 flex h-9 items-center gap-2 rounded-full bg-ink/40 px-3.5 text-[12.5px] font-bold text-white backdrop-blur"><SwitchCamera size={16} /> {lado === "environment" ? "Frontal" : "Traseira"}</button>}
                    <button onClick={fecharCamera} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-ink/40 text-white backdrop-blur"><X size={17} /></button>
                  </>
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_40%,#5a1120,#2b0810)] px-8 text-center text-white">
                    <div>
                      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-white/10 ring-1 ring-white/20"><Camera size={28} /></div>
                      <p className="text-[13.5px] font-medium text-white/70">A foto sai com <b className="text-white">data, hora, local e seu nome</b> carimbados.</p>
                    </div>
                  </div>
                )}
                {processando && <div className="absolute inset-0 grid place-items-center bg-ink/50 backdrop-blur-sm"><LoaderCircle className="animate-spin text-white" size={34} /></div>}
              </div>
              {fotos.length > 0 && (
                <div className="mx-5 mb-4">
                  <div className="mb-2 flex items-center justify-between text-[12px] font-extrabold uppercase tracking-[0.08em] text-ink/50"><span>Evidências</span><span className="num">{fotos.length}/{MAX_FOTOS} · mínimo 1</span></div>
                  <ul className="flex gap-2.5 overflow-x-auto pb-1.5 pt-1.5">
                    {fotos.map((f, i) => (
                      <li key={f.id} className="relative shrink-0">
                        <button onClick={() => { setAtiva(i); }} aria-label={`Ver foto ${i + 1}`} className={clsx("block h-16 w-[86px] overflow-hidden rounded-xl ring-2 transition", i === ativa && !stream ? "ring-vinho-500" : "ring-transparent")}><img src={f.url} alt="" className="h-full w-full object-cover" /></button>
                        <button onClick={() => removerFoto(i)} aria-label={`Remover foto ${i + 1}`} className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-vinho-700 text-white shadow"><X size={13} /></button>
                      </li>
                    ))}
                    {fotos.length < MAX_FOTOS && !stream && (
                      <li className="shrink-0"><button onClick={() => void abrirCamera()} aria-label="Adicionar foto" className="grid h-16 w-[86px] place-items-center rounded-xl border-2 border-dashed border-ink/20 text-ink/45 transition hover:border-vinho-400 hover:text-brand"><Plus size={20} /></button></li>
                    )}
                  </ul>
                </div>
              )}
              {camErro && <p className="mx-5 mb-3 text-[12.5px] font-bold text-vinho-600">{camErro}</p>}

              <div className="mt-auto flex flex-wrap gap-3 px-5 pb-5">
                {stream ? (
                  <button className="btn btn-vinho flex-1 !h-14" onClick={() => void capturar()} disabled={processando}><Camera size={20} /> Tirar foto{fotos.length > 0 ? ` (${fotos.length + 1}/${MAX_FOTOS})` : ""}</button>
                ) : fotos.length > 0 ? (
                  <>
                    {fotos.length < MAX_FOTOS && <button className="btn btn-claro" onClick={() => void abrirCamera()}><Plus size={17} /> Adicionar foto</button>}
                    <button className="btn btn-vinho flex-1" disabled={processando} onClick={() => void salvar()}><Check size={18} strokeWidth={3} /> Salvar lançamento · {fotos.length} {fotos.length === 1 ? "foto" : "fotos"}</button>
                  </>
                ) : (
                  <button className="btn btn-vinho flex-1" disabled={!pronto} onClick={() => void abrirCamera()}><Camera size={19} /> Abrir câmera</button>
                )}
                {!pronto && !fotos.length && <p className="w-full text-[12px] font-semibold text-ink/40">Escolha a equipe e a ação para liberar a câmera.</p>}
                {pronto && !fotos.length && !stream && <p className="w-full text-[12px] font-semibold text-ink/40">Tire de 1 a 5 fotos. É obrigatório ao menos 1 evidência para finalizar.</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
