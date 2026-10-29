import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { motion, useAnimationControls } from "motion/react";
import { ArrowRight, CalendarCheck2, WifiOff } from "lucide-react";
import { CountUp, Logo } from "../components/ui";
import { useAuth } from "../store/auth";
import { todosRegistros, useData } from "../store/data";
import { agora } from "../lib/dates";

/** Campo de losangos (motivo do logo) que acende com o cursor e respira em ondas. */
function CampoLosangos() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const g = cv.getContext("2d")!;
    const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0;
    const alvo = { x: -999, y: -999 }, mouse = { x: -999, y: -999 };
    const T = 72;
    const ajustar = () => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2);
      w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const mover = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      alvo.x = e.clientX - r.left; alvo.y = e.clientY - r.top;
    };
    const desenhar = (ms: number) => {
      const t = ms / 1000;
      mouse.x += (alvo.x - mouse.x) * 0.12; mouse.y += (alvo.y - mouse.y) * 0.12;
      g.clearRect(0, 0, w, h);
      const cols = Math.ceil(w / T) + 2, rows = Math.ceil(h / (T / 2)) + 2;
      for (let j = -1; j < rows; j++) {
        for (let i = -1; i < cols; i++) {
          const cx = i * T + (j % 2 ? T / 2 : 0), cy = j * (T / 2);
          const d = Math.hypot(cx - mouse.x, cy - mouse.y);
          const luz = Math.max(0, 1 - d / 280);
          const onda = (Math.sin(cx * 0.006 + cy * 0.004 - t * 0.9) + 1) / 2;
          const s = T / 2 - 4 - luz * 5 + onda * 1.5;
          g.beginPath();
          g.moveTo(cx, cy - s); g.lineTo(cx + s, cy); g.lineTo(cx, cy + s); g.lineTo(cx - s, cy); g.closePath();
          const a = 0.035 + onda * 0.05 + luz * 0.34;
          g.fillStyle = luz > 0.55 ? `rgba(242,177,52,${a * 0.9})` : `rgba(205,111,129,${a})`;
          g.fill();
          g.strokeStyle = `rgba(255,255,255,${0.04 + luz * 0.22})`;
          g.lineWidth = 1;
          g.stroke();
        }
      }
      if (!reduz) raf = requestAnimationFrame(desenhar);
    };
    ajustar(); desenhar(0);
    if (!reduz) raf = requestAnimationFrame(desenhar);
    addEventListener("resize", ajustar);
    addEventListener("pointermove", mover);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", ajustar); removeEventListener("pointermove", mover); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];

export default function Login() {
  const entrar = useAuth(s => s.entrar);
  const mapa = useData(s => s.mapa);
  const pronto = useData(s => s.pronto);
  const origem = useData(s => s.origem);
  const { historico, remotos, locais } = useData();
  const total = useMemo(() => todosRegistros({ historico, remotos, locais }).filter(r => r.d.startsWith(String(new Date().getFullYear()))).length, [historico, remotos, locais]);
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState("");
  const tremer = useAnimationControls();
  const hoje = agora();

  const colab = useMemo(() => (valor ? mapa.get(Number(valor)) : undefined), [valor, mapa]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!colab) { setErro(valor ? "Matrícula não encontrada." : "Digite sua matrícula."); void tremer.start({ x: [0, -9, 9, -6, 6, 0], transition: { duration: 0.4 } }); return; }
    if (colab.s === "D") { setErro("Cadastro desligado. Fale com o SESMT."); return; }
    entrar(colab.c);
  };

  return (
    <div className="grid min-h-full bg-creme lg:grid-cols-[1.18fr_1fr]">
      {/* ——— palco ——— */}
      <section className="relative isolate flex min-h-[46vh] flex-col justify-between overflow-hidden bg-vinho-900 px-7 py-8 text-white sm:px-12 sm:py-11 lg:min-h-screen">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_15%_0%,#7a1a2e_0%,#4a0f1d_55%,#2b0810_100%)]" />
        <div className="absolute inset-0 -z-10"><CampoLosangos /></div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-vinho-950/90 to-transparent" />

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="flex items-center justify-between">
          <Logo branco className="h-9 w-auto sm:h-11" />
          <span className="hidden rounded-full border border-white/15 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/70 sm:block">
            Segurança do Trabalho
          </span>
        </motion.div>

        <div className="mt-14 max-w-[720px] lg:mt-0">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
            className="mb-5 flex items-center gap-1.5" aria-label="Dias da semana: quarta-feira em destaque">
            {DIAS.map((d, i) => (
              <motion.span key={i}
                initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.05, type: "spring", stiffness: 300, damping: 18 }}
                className={`relative grid h-8 w-8 place-items-center rounded-full text-[12px] font-extrabold ${i === 3 ? "bg-ambar text-vinho-950" : "bg-white/8 text-white/45"}`}>
                {d}
                {i === 3 && <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-ambar/50" />}
              </motion.span>
            ))}
            <span className="ml-3 text-[12.5px] font-semibold text-white/60">toda quarta-feira</span>
          </motion.div>

          <h1 className="display text-[clamp(52px,8.2vw,118px)] leading-[0.92] tracking-[-0.02em]">
            {["Dia da", "Segurança"].map((l, i) => (
              <span key={l} className="block overflow-hidden pb-[0.06em]">
                <motion.span className="block" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ delay: 0.15 + i * 0.12, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>{l}</motion.span>
              </span>
            ))}
            <span className="block overflow-hidden pb-[0.08em]">
              <motion.span className="block italic text-ambar" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ delay: 0.39, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>Ativa.</motion.span>
            </span>
          </h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
            className="mt-6 max-w-[460px] text-[16px] font-medium leading-relaxed text-white/70">
            Uma visita, uma ação, uma foto. Registre o que você viu em campo — com data, hora e local — e deixe a segurança aparecer.
          </motion.p>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          className="mt-10 flex flex-wrap items-end gap-x-10 gap-y-4 lg:mt-0">
          <div>
            <div className="display text-[54px] leading-none text-white">
              {pronto ? <CountUp valor={total} /> : "—"}
            </div>
            <div className="eyebrow !text-white/50">ações registradas em {new Date().getFullYear()}</div>
          </div>
          <div className="flex items-center gap-2 pb-1 text-[12.5px] font-semibold text-white/55">
            <WifiOff size={15} /> Funciona sem sinal · envia quando a rede voltar
          </div>
        </motion.div>
      </section>

      {/* ——— acesso ——— */}
      <section className="relative flex items-center justify-center px-6 py-12 sm:px-12">
        <motion.form onSubmit={enviar} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-[400px]">
          <Logo className="mb-10 h-14 w-auto" />
          <div className="eyebrow mb-2">Acesso do observador</div>
          <h2 className="display text-[40px] leading-[1.02] text-vinho-900">Quem está em campo hoje?</h2>
          <p className="mt-3 text-[14.5px] font-medium text-black/55">Digite sua matrícula (chapa) para começar.</p>

          <motion.div animate={tremer} className="mt-8">
            <label htmlFor="chapa" className="eyebrow mb-2 block">Matrícula</label>
            <input id="chapa" inputMode="numeric" autoComplete="off" autoFocus placeholder="00000"
              value={valor} onChange={e => { setValor(e.target.value.replace(/\D/g, "").slice(0, 7)); setErro(""); }}
              className="campo !h-16 !rounded-2xl text-center font-mono text-[26px] tracking-[0.3em]" />
            <div className="mt-3 min-h-[44px]">
              {colab ? (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-2xl bg-vinho-50 px-4 py-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-vinho-700 text-[12px] font-extrabold text-white">{colab.n.slice(0, 2).toUpperCase()}</div>
                  <div className="leading-tight">
                    <div className="text-[14px] font-bold text-vinho-900">Olá, {colab.n}</div>
                    <div className="text-[11.5px] font-medium text-black/50">{colab.f.toLowerCase()} · {colab.b}</div>
                  </div>
                </motion.div>
              ) : erro ? (
                <div role="alert" className="px-1 text-[13px] font-bold text-vinho-600">{erro}</div>
              ) : null}
            </div>
          </motion.div>

          <button className="btn btn-vinho group mt-3 !h-14 w-full text-[15.5px]" disabled={!pronto}>
            {pronto ? "Entrar" : "Carregando…"}
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>

          <div className="mt-8 flex items-center gap-2.5 rounded-2xl border border-black/8 bg-white/60 px-4 py-3 text-[12.5px] font-semibold text-black/55">
            <CalendarCheck2 size={17} className="shrink-0 text-vinho-600" />
            {hoje.weekday === 3 ? "Hoje é quarta-feira: lançamentos liberados." : "Lançamentos são liberados às quartas-feiras."}
          </div>
          {origem === "demo" && (
            <p className="mt-4 text-center text-[11.5px] font-semibold text-black/40">
              Versão de demonstração · dados fictícios · experimente a matrícula 90010
            </p>
          )}
        </motion.form>
      </section>
    </div>
  );
}
