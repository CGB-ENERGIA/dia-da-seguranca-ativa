import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { clsx } from "clsx";
import {
  Camera, Check, Download, FileClock, ImagePlus, LoaderCircle, LockKeyhole, MapPin, MapPinOff,
  RefreshCcw, Search, Siren, ShieldCheck, ClipboardCheck, GraduationCap, Truck, Wrench, HardHat, X,
} from "lucide-react";
import { useAuth } from "../store/auth";
import { useData } from "../store/data";
import { ACAO_CURTA, ACOES_ATIVAS, agora, brData, diaSemanaExtenso, novoId, proximaQuarta } from "../lib/dates";
import { obterLocal, coordTexto, type Local } from "../lib/geo";
import { carimbar } from "../lib/stamp";
import { salvarFoto, salvarReg } from "../lib/db";
import { contarPendentes, sincronizar } from "../lib/sync";
import { remotoAtivo } from "../lib/remote";
import type { Reg } from "../lib/types";

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

function Bloqueado({ liberar }: { liberar?: () => void }) {
  const p = proximaQuarta();
  return (
    <div className="mx-auto mt-6 max-w-[620px]">
      <div className="card relative overflow-hidden p-8 text-center sm:p-12">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-ambar/25 blur-3xl" />
        <motion.div initial={{ scale: 0.7, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 220, damping: 14 }}
          className="relative mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-vinho-900 text-ambar shadow-xl">
          <LockKeyhole size={34} />
        </motion.div>
        <h2 className="display text-[40px] leading-none text-vinho-900">Hoje não é quarta-feira</h2>
        <p className="mx-auto mt-4 max-w-[420px] text-[15px] font-medium leading-relaxed text-black/55">
          O Dia da Segurança Ativa acontece <b className="text-vinho-800">todas as quartas-feiras</b>. Hoje é {diaSemanaExtenso()} — os lançamentos reabrem em
        </p>
        <div className="mt-6 inline-flex items-baseline gap-2 rounded-2xl bg-vinho-50 px-6 py-3">
          <span className="display text-[44px] leading-none text-vinho-700">{p.dias}</span>
          <span className="text-[14px] font-bold text-vinho-800">{p.dias === 1 ? "dia" : "dias"} · {brData(p.d)}</span>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/meus" className="btn btn-claro"><FileClock size={18} /> Meus lançamentos</Link>
          {liberar && <button onClick={liberar} className="btn btn-vinho"><ShieldCheck size={18} /> Liberar (SESMT)</button>}
        </div>
      </div>
    </div>
  );
}

export default function Lancar() {
  const { chapa, liberarDia, setLiberar } = useAuth();
  const colab = useData(s => (chapa ? s.mapa.get(chapa) : undefined));
  const equipes = useData(s => s.equipes);
  const hoje = agora();
  const quarta = hoje.weekday === 3;
  const gestor = colab?.gr === "SEGURANÇA";

  const [busca, setBusca] = useState("");
  const [equipe, setEquipe] = useState("");
  const [acoes, setAcoes] = useState<number[]>([]);
  const [local, setLocal] = useState<Local | null>(null);
  const [buscandoLocal, setBuscandoLocal] = useState(true);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [camErro, setCamErro] = useState("");
  const [foto, setFoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [processando, setProcessando] = useState(false);
  const [salvo, setSalvo] = useState<{ ok: boolean; nome: string; qtd: number } | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const [relogio, setRelogio] = useState(new Date());

  const pegarLocal = useCallback(async () => {
    setBuscandoLocal(true);
    setLocal(await obterLocal());
    setBuscandoLocal(false);
  }, []);
  useEffect(() => { void pegarLocal(); }, [pegarLocal]);
  useEffect(() => { const i = setInterval(() => setRelogio(new Date()), 1000); return () => clearInterval(i); }, []);

  useEffect(() => {
    if (video.current && stream) { video.current.srcObject = stream; void video.current.play().catch(() => {}); }
    return () => { /* parada explícita em fecharCamera */ };
  }, [stream]);
  useEffect(() => () => stream?.getTracks().forEach(t => t.stop()), [stream]);

  const abrirCamera = async () => {
    setCamErro("");
    if (!navigator.mediaDevices?.getUserMedia) { arquivo.current?.click(); return; }
    try {
      setStream(await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }));
    } catch {
      setCamErro("Não consegui abrir a câmera. Permita o acesso ou use a câmera do aparelho.");
    }
  };
  const fecharCamera = () => { stream?.getTracks().forEach(t => t.stop()); setStream(null); };

  const sugestoes = useMemo(() => {
    const q = busca.trim().toUpperCase();
    const lista = equipes.filter(e => e.y.includes(+hoje.d.slice(0, 4)) && (!q || e.p.includes(q) || e.pr.toUpperCase().includes(q)));
    return lista.sort((a, b) => Number(b.b === colab?.b) - Number(a.b === colab?.b) || a.p.localeCompare(b.p)).slice(0, 7);
  }, [busca, equipes, colab, hoje.d]);

  const montar = async (fonte: CanvasImageSource, w: number, h: number) => {
    if (!colab) return;
    setProcessando(true);
    const agoraLocal = local;
    const blob = await carimbar(fonte, w, h, {
      quando: new Date(), nome: colab.n, chapa: colab.c, equipe, acoes,
      local: agoraLocal?.label ?? "Localização indisponível",
      coordenadas: agoraLocal ? `${coordTexto(agoraLocal.lat, agoraLocal.lon)} ±${agoraLocal.prec}m` : undefined,
    });
    setFoto({ blob, url: URL.createObjectURL(blob) });
    setProcessando(false);
    fecharCamera();
  };

  const capturar = async () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    void pegarLocal();
    await montar(v, v.videoWidth, v.videoHeight);
  };
  const doArquivo = async (f?: File | null) => {
    if (!f) return;
    const bmp = await createImageBitmap(f);
    await montar(bmp, bmp.width, bmp.height);
  };

  const salvar = async () => {
    if (!foto || !colab) return;
    setProcessando(true);
    const a = agora();
    const fotoId = novoId();
    const nome = nomeArquivo(colab.c, equipe, a.d, a.t);
    await salvarFoto(fotoId, foto.blob, nome);
    for (const ac of acoes) {
      const r: Reg = { id: novoId(), d: a.d, t: a.t, chapa: colab.c, equipe, acao: ac, origem: "app", sync: "pending", fotoId, lat: local?.lat, lon: local?.lon, local: local?.label };
      await salvarReg(r);
    }
    await useData.getState().recarregarLocais();
    await contarPendentes();
    setSalvo({ ok: true, nome, qtd: acoes.length });
    setProcessando(false);
    void sincronizar();
  };

  const novo = () => {
    if (foto) URL.revokeObjectURL(foto.url);
    setFoto(null); setSalvo(null); setEquipe(""); setBusca(""); setAcoes([]);
    void pegarLocal();
  };

  if (!colab) return null;
  if (!quarta && !liberarDia) return <Bloqueado liberar={gestor ? () => setLiberar(true) : undefined} />;

  const passo = salvo ? 4 : foto ? 3 : equipe && acoes.length ? 3 : equipe ? 2 : 1;
  const pronto = equipe && acoes.length > 0;
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(relogio);

  return (
    <div className="mx-auto max-w-[1040px]">
      {!quarta && liberarDia && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-ambar/25 px-4 py-3 text-[13px] font-bold text-[#7a5200]">
          <ShieldCheck size={17} /> Lançamento liberado pelo SESMT fora da quarta-feira.
          <button className="ml-auto underline" onClick={() => setLiberar(false)}>desfazer</button>
        </div>
      )}

      {/* progresso */}
      <ol className="mb-6 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.1em]">
        {["Equipe", "Ação", "Foto", "Pronto"].map((t, i) => (
          <li key={t} className="flex flex-1 items-center gap-2">
            <span className={clsx("grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] transition-colors", passo > i + 1 || salvo ? "bg-oliva text-white" : passo === i + 1 ? "bg-vinho-700 text-white" : "bg-black/8 text-black/35")}>
              {passo > i + 1 || (salvo && i < 4) ? <Check size={14} strokeWidth={3} /> : i + 1}
            </span>
            <span className={clsx("hidden sm:block", passo >= i + 1 ? "text-vinho-900" : "text-black/30")}>{t}</span>
            {i < 3 && <span className="h-px flex-1 bg-black/10" />}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        {salvo ? (
          <motion.div key="ok" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="card overflow-hidden">
            <div className="grid md:grid-cols-[1fr_1.1fr]">
              <div className="relative bg-vinho-900 p-6">
                {foto && <img src={foto.url} alt="Foto carimbada" className="w-full rounded-2xl shadow-2xl" />}
              </div>
              <div className="flex flex-col justify-center p-8">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
                  className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-oliva text-white"><Check size={34} strokeWidth={3} /></motion.div>
                <h2 className="display text-[42px] leading-none text-vinho-900">Lançamento salvo</h2>
                <p className="mt-3 text-[14.5px] font-medium leading-relaxed text-black/55">
                  {salvo.qtd} {salvo.qtd > 1 ? "ações registradas" : "ação registrada"} em <b>{equipe}</b>. {!remotoAtivo ? "Guardado com segurança neste aparelho (servidor ainda não configurado)." : navigator.onLine
                    ? "Enviando para o servidor…" : "Sem sinal agora: está guardado no aparelho e será enviado automaticamente quando a rede voltar."}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <button className="btn btn-vinho" onClick={() => foto && baixar(foto.blob, salvo.nome)}><Download size={18} /> Baixar foto</button>
                  <button className="btn btn-claro" onClick={novo}><Camera size={18} /> Novo lançamento</button>
                </div>
                <Link to="/meus" className="mt-5 text-[13px] font-bold text-vinho-700 underline-offset-4 hover:underline">Ver meus lançamentos →</Link>
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
                  <div className="truncate text-[17px] font-extrabold text-vinho-900">{colab.n} <span className="font-mono text-[13px] font-semibold text-black/40">· {colab.c}</span></div>
                </div>
                <div className="text-right">
                  <div className="num font-mono text-[18px] font-bold text-vinho-800">{hora}</div>
                  <div className="text-[11.5px] font-semibold text-black/45">{brData(hoje.d)}</div>
                </div>
              </div>

              {/* equipe */}
              <div className="card p-5">
                <div className="eyebrow mb-3">1 · Equipe visitada</div>
                {equipe ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-vinho-50 p-3.5">
                    <Check size={18} className="text-oliva" strokeWidth={3} />
                    <span className="font-mono text-[16px] font-bold text-vinho-900">{equipe}</span>
                    <button className="ml-auto grid h-8 w-8 place-items-center rounded-full text-black/40 hover:bg-white hover:text-vinho-700" onClick={() => { setEquipe(""); setBusca(""); }} aria-label="Trocar equipe"><X size={16} /></button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search size={17} className="absolute left-4 top-[15px] text-black/35" />
                      <input className="campo !pl-11 font-mono uppercase" placeholder="Prefixo da equipe" value={busca} onChange={e => setBusca(e.target.value)} />
                    </div>
                    <ul className="mt-2 space-y-1">
                      {sugestoes.map(e => (
                        <li key={e.p}>
                          <button onClick={() => setEquipe(e.p)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-vinho-50">
                            <span className="font-mono text-[14px] font-bold text-vinho-900">{e.p}</span>
                            <span className="ml-auto text-[12px] font-semibold text-black/40">{e.pr} · {e.b}</span>
                          </button>
                        </li>
                      ))}
                      {busca.trim().length > 2 && !equipes.some(e => e.p === busca.trim().toUpperCase()) && (
                        <li>
                          <button onClick={() => setEquipe(busca.trim().toUpperCase())} className="w-full rounded-xl border border-dashed border-vinho-400 px-3 py-2.5 text-left text-[13px] font-bold text-vinho-700 hover:bg-vinho-50">
                            Usar “{busca.trim().toUpperCase()}” (equipe fora da lista)
                          </button>
                        </li>
                      )}
                    </ul>
                  </>
                )}
              </div>

              {/* ações */}
              <div className="card p-5">
                <div className="eyebrow mb-1">2 · O que você realizou?</div>
                <p className="mb-3 text-[12px] font-medium text-black/45">Pode marcar mais de uma: contam como 1 visita e uma ação de cada tipo.</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {ACOES_ATIVAS.map(i => {
                    const Icone = ICONES[i];
                    const on = acoes.includes(i);
                    return (
                      <button key={i} onClick={() => setAcoes(a => (on ? a.filter(x => x !== i) : [...a, i]))} aria-pressed={on}
                        className={clsx("relative flex min-h-[78px] flex-col items-start justify-between rounded-2xl border-2 p-3.5 text-left transition-all active:scale-[.97]",
                          on ? "border-vinho-700 bg-vinho-700 text-white shadow-[0_12px_24px_-12px_rgba(112,22,39,.8)]" : "border-black/8 bg-white hover:border-vinho-300")}>
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
                <div className="eyebrow">3 · Foto da evidência</div>
                <button onClick={() => void pegarLocal()} className={clsx("flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-bold", local ? "bg-oliva/12 text-oliva" : "bg-black/6 text-black/50")}>
                  {buscandoLocal ? <LoaderCircle size={13} className="animate-spin" /> : local ? <MapPin size={13} /> : <MapPinOff size={13} />}
                  <span className="max-w-[180px] truncate">{buscandoLocal ? "buscando local…" : local ? local.label : "sem localização · tocar p/ tentar"}</span>
                </button>
              </div>

              <div className="relative mx-5 mb-5 aspect-[4/3] overflow-hidden rounded-2xl bg-vinho-950">
                {foto ? (
                  <img src={foto.url} alt="Pré-visualização carimbada" className="h-full w-full object-contain" />
                ) : stream ? (
                  <>
                    <video ref={video} playsInline muted className="h-full w-full object-cover" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-vinho-950/90 via-vinho-950/60 to-transparent p-4 pt-12 text-white">
                      <div className="flex items-baseline gap-3"><span className="num text-[26px] font-bold">{hora}</span><span className="text-[12px] capitalize text-white/80">{diaSemanaExtenso(relogio)}, {brData(hoje.d)}</span></div>
                      <div className="mt-1 text-[12px] font-semibold">Observador: {colab.n} · {colab.c}</div>
                      <div className="truncate text-[11.5px] text-white/75">{local?.label ?? "Localização indisponível"}</div>
                    </div>
                    <button onClick={fecharCamera} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur"><X size={17} /></button>
                  </>
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_40%,#5a1120,#2b0810)] px-8 text-center text-white">
                    <div>
                      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-white/10 ring-1 ring-white/20"><Camera size={28} /></div>
                      <p className="text-[13.5px] font-medium text-white/70">A foto sai com <b className="text-white">data, hora, local e seu nome</b> carimbados.</p>
                    </div>
                  </div>
                )}
                {processando && <div className="absolute inset-0 grid place-items-center bg-black/50 backdrop-blur-sm"><LoaderCircle className="animate-spin text-white" size={34} /></div>}
              </div>
              {camErro && <p className="mx-5 mb-3 text-[12.5px] font-bold text-vinho-600">{camErro}</p>}

              <div className="mt-auto flex flex-wrap gap-3 px-5 pb-5">
                {foto ? (
                  <>
                    <button className="btn btn-claro" onClick={() => { URL.revokeObjectURL(foto.url); setFoto(null); void abrirCamera(); }}><RefreshCcw size={17} /> Refazer</button>
                    <button className="btn btn-vinho flex-1" disabled={!pronto || processando} onClick={() => void salvar()}><Check size={18} strokeWidth={3} /> Salvar lançamento</button>
                  </>
                ) : stream ? (
                  <button className="btn btn-vinho flex-1 !h-14" onClick={() => void capturar()} disabled={processando}><Camera size={20} /> Tirar foto</button>
                ) : (
                  <>
                    <button className="btn btn-vinho flex-1" disabled={!pronto} onClick={() => void abrirCamera()}><Camera size={19} /> Abrir câmera</button>
                    <button className="btn btn-claro" disabled={!pronto} onClick={() => arquivo.current?.click()} title="Usar a câmera do aparelho"><ImagePlus size={18} /></button>
                  </>
                )}
                {!pronto && !foto && <p className="w-full text-[12px] font-semibold text-black/40">Escolha a equipe e a ação para liberar a câmera.</p>}
              </div>
              <input ref={arquivo} type="file" accept="image/*" capture="environment" hidden onChange={e => { void doArquivo(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
