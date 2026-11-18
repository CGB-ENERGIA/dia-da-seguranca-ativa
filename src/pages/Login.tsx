import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { motion, useAnimationControls } from "motion/react";
import { ArrowRight, CalendarCheck2, WifiOff } from "lucide-react";
import { CampoSenha, CountUp, Logo, TemaToggle } from "../components/ui";
import BuscaNome from "../components/BuscaNome";
import { validarAdmin } from "../lib/admin";
import { podeAcessar, useAuth, type Perfil } from "../store/auth";
import { loginChapa, loginUsuario, RpcAusente, usuariosPublicos } from "../lib/remote";
import { kvGet, kvSet } from "../lib/db";
import { todosRegistros, useData } from "../store/data";
import { agora } from "../lib/dates";
import type { Colab } from "../lib/types";

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

export default function Login({ modo = "registrar" }: { modo?: "registrar" | "relatorio" }) {
  const entrar = useAuth(s => s.entrar);
  const garantirColab = useData(s => s.garantirColab);
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const { historico, remotos, locais, colabs, pronto } = useData();
  const total = useMemo(() => todosRegistros({ historico, remotos, locais }).filter(r => r.d.startsWith(String(new Date().getFullYear()))).length, [historico, remotos, locais]);
  const lideres = useMemo(() => colabs.filter(c => c.l === 1 && c.s === "A"), [colabs]);
  const [publicos, setPublicos] = useState<Colab[] | null>(null);
  const [legado, setLegado] = useState(false); // servidor de usuários ainda não instalado
  const [sel, setSel] = useState<Colab | null>(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const tremer = useAnimationControls();
  const hoje = agora();

  // nomes do autocomplete do registro: usuários ativos do servidor (ou, sem o servidor de usuários, as lideranças do cadastro)
  useEffect(() => {
    if (modo !== "registrar") return;
    const paraColab = (u: { chapa: number; nome: string; funcao: string | null; base: string | null }): Colab => {
      const p = u.nome.split(" ")[0] ?? u.nome;
      return { c: u.chapa, n: p[0] + p.slice(1).toLowerCase(), nome: u.nome, f: u.funcao ?? "", p: "", b: u.base ?? "", g: "", gr: "", s: "A", ger: "", l: 1 };
    };
    usuariosPublicos().then(l => { setPublicos(l.map(paraColab)); void kvSet("usuarios-publicos", l); })
      .catch(async e => {
        if (e instanceof RpcAusente) { setLegado(true); return; }
        const c = await kvGet<Parameters<typeof paraColab>[0][]>("usuarios-publicos");
        if (c) setPublicos(c.map(paraColab));
      });
  }, [modo]);

  const falhar = (msg: string) => { setErro(msg); void tremer.start({ x: [0, -9, 9, -6, 6, 0], transition: { duration: 0.4 } }); };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true); setErro("");
    try {
      let perfil: Perfil;
      if (modo === "relatorio") {
        try { perfil = (await loginUsuario(usuario, senha)) as Perfil; }
        catch (err) {
          if (!(err instanceof RpcAusente)) throw err;
          const u = await validarAdmin(usuario, senha); // enquanto o cadastro de usuários não está no banco
          if (!u) throw new Error("Usuário ou senha incorretos.");
          perfil = { usuario: u, nome: "Marcus Vinicius Silva Queiros", chapa: 12375, nivel: "admin", legado: true };
        }
        if (!podeAcessar(perfil.nivel, "consulta")) throw new Error("Seu usuário não tem acesso ao relatório.");
        entrar(perfil, senha);
      } else {
        if (!sel) throw new Error("Escolha seu nome na lista.");
        if (legado) perfil = { usuario: String(sel.c), nome: sel.nome, chapa: sel.c, funcao: sel.f, base: sel.b, processo: sel.p, gerencia: sel.g, nivel: "observador", legado: true };
        else perfil = (await loginChapa(sel.c, senha)) as Perfil;
        entrar(perfil, legado ? "" : senha);
      }
      garantirColab(perfil);
    } catch (err) {
      falhar(err instanceof TypeError ? "Sem conexão com o servidor. O login precisa de internet." : (err as Error).message);
    } finally { setEnviando(false); }
  };

  return (
    <div className="grid min-h-full bg-canvas lg:grid-cols-[1.18fr_1fr]">
      {/* ——— palco ——— */}
      <section className="relative isolate flex min-h-[46dvh] flex-col justify-between overflow-hidden bg-vinho-900 px-7 py-8 text-white sm:px-12 sm:py-11 lg:min-h-dvh">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_15%_0%,#7a1a2e_0%,#4a0f1d_55%,#2b0810_100%)]" />
        <div className="absolute inset-0 -z-10"><CampoLosangos /></div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-vinho-950/90 to-transparent" />

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="flex items-center justify-between">
          <Logo branco className="h-9 w-auto sm:h-11" />
          <span className="hidden rounded-full border border-white/15 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/70 sm:block">Segurança do Trabalho</span>
        </motion.div>

        <div className="mt-14 max-w-[720px] lg:mt-0">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mb-6 flex items-center gap-1.5" aria-label="Dias da semana: quarta-feira em destaque">
            {DIAS.map((d, i) => (
              <motion.span key={i} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.05, type: "spring", stiffness: 300, damping: 18 }}
                className={`relative grid h-8 w-8 place-items-center rounded-full text-[12px] font-extrabold ${i === 3 ? "bg-ambar text-vinho-950" : "bg-white/8 text-white/45"}`}>
                {d}
                {i === 3 && <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-ambar/50" />}
              </motion.span>
            ))}
            <span className="ml-3 text-[12.5px] font-semibold text-white/60">toda quarta-feira</span>
          </motion.div>

          <h1 className="display text-[clamp(44px,6.6vw,96px)] leading-[0.98]">
            {["Dia da", "Segurança"].map((l, i) => (
              <span key={l} className="block overflow-hidden pb-[0.08em]">
                <motion.span className="block" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ delay: 0.15 + i * 0.12, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>{l}</motion.span>
              </span>
            ))}
            <span className="block overflow-hidden pb-[0.1em]">
              <motion.span className="block bg-gradient-to-r from-ambar to-[#ffd98a] bg-clip-text text-transparent" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ delay: 0.39, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>Ativa.</motion.span>
            </span>
          </h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }} className="mt-6 max-w-[460px] text-[16px] font-medium leading-relaxed text-white/70">
            Uma visita, uma ação, uma foto. Registre o que você viu em campo — com data, hora e local — e deixe a segurança aparecer.
          </motion.p>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-10 flex flex-wrap items-end gap-x-10 gap-y-4 lg:mt-0">
          <div>
            <div className="display text-[48px] leading-none text-white">{pronto ? <CountUp valor={total} /> : "—"}</div>
            <div className="eyebrow !text-white/50">ações registradas em {new Date().getFullYear()}</div>
          </div>
          <div className="flex items-center gap-2 pb-1 text-[12.5px] font-semibold text-white/55"><WifiOff size={15} /> Funciona sem sinal · envia quando a rede voltar</div>
          <div className="w-full pt-1 text-[11.5px] font-semibold text-white/40">Desenvolvido por Marcus Vinicius Silva Queiros</div>
        </motion.div>
      </section>

      {/* ——— acesso ——— */}
      <section className="relative flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="absolute right-5 top-5"><TemaToggle /></div>
        <motion.form onSubmit={enviar} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-[400px]">
          <Logo className="mb-10 h-14 w-auto dark:hidden" />
          <Logo branco className="mb-10 hidden h-14 w-auto dark:block" />
          <div className="eyebrow mb-2">{modo === "relatorio" ? "Acesso ao relatório" : "Acesso do observador"}</div>
          <h2 className="display text-[34px] leading-[1.08] text-brand">{modo === "relatorio" ? "Acompanhe os números." : "Quem está em campo hoje?"}</h2>
          <p className="mt-3 text-[14.5px] font-medium text-ink/55">{modo === "relatorio" ? "Entre com seu usuário e senha." : "Escolha seu nome na lista e digite sua senha."}</p>

          <motion.div animate={tremer} className="mt-8">
            {modo === "relatorio" ? (
              <div className="space-y-4">
                <label className="block"><span className="eyebrow mb-2 block">Usuário</span>
                  <input className="campo !h-14 !rounded-2xl" autoFocus autoComplete="username" autoCapitalize="none" placeholder="@usuario" value={usuario} onChange={e => { setUsuario(e.target.value); setErro(""); }} />
                </label>
                <label className="block"><span className="eyebrow mb-2 block">Senha</span>
                  <CampoSenha className="!h-14 !rounded-2xl" valor={senha} onChange={v => { setSenha(v); setErro(""); }} autoComplete="current-password" placeholder="••••••" />
                </label>
                <div className="min-h-[24px]">{erro && <div role="alert" className="px-1 text-[13px] font-bold text-vinho-500">{erro}</div>}</div>
              </div>
            ) : (
              <>
                <BuscaNome opcoes={legado ? lideres : (publicos ?? [])} sel={sel} onSel={c => { setSel(c); setErro(""); }} aviso="Nome não encontrado. Fale com o SESMT para liberar seu acesso." />
                {!legado && (
                  <label className="mt-1 block"><span className="eyebrow mb-2 block">Senha</span>
                    <CampoSenha className="!h-14 !rounded-2xl" valor={senha} onChange={v => { setSenha(v); setErro(""); }} autoComplete="current-password" placeholder="••••••" />
                  </label>
                )}
                <div className="min-h-[28px] pt-2">{erro && <div role="alert" className="px-1 text-[13px] font-bold text-vinho-500">{erro}</div>}</div>
              </>
            )}
          </motion.div>

          <button className="btn btn-vinho group mt-3 !h-14 w-full text-[15.5px]" disabled={!pronto || enviando || (modo === "relatorio" ? !usuario || !senha : !sel || (!legado && !senha))}>
            {!pronto ? "Carregando…" : enviando ? "Verificando…" : modo === "relatorio" ? "Abrir relatório" : "Entrar"}
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>

          <div className={"mt-8 items-center gap-2.5 rounded-2xl border border-ink/10 bg-card/60 px-4 py-3 text-[12.5px] font-semibold text-ink/55 " + (modo === "relatorio" ? "hidden" : "flex")}>
            <CalendarCheck2 size={17} className="shrink-0 text-vinho-500" />
            {hoje.weekday === 3 ? "Hoje é quarta-feira: lançamentos liberados." : "Lançamentos são liberados às quartas-feiras."}
          </div>
        </motion.form>
      </section>
    </div>
  );
}
