import { ACAO_CURTA, TZ } from "./dates";

export interface Carimbo {
  quando: Date;
  local: string;
  coordenadas?: string;
  nome: string;
  chapa: number;
  equipe: string;
  acoes: number[];
}

const carregar = (src: string) =>
  new Promise<HTMLImageElement>((ok, no) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = no;
    i.src = src;
  });

const BASE = import.meta.env.BASE_URL;

/** Reduz a captura (lado maior ≤ 1600 px) e desenha o carimbo: data, hora, localidade e observador. */
export async function carimbar(fonte: CanvasImageSource, w: number, h: number, c: Carimbo): Promise<Blob> {
  const esc = Math.min(1, 1600 / Math.max(w, h));
  const W = Math.round(w * esc), H = Math.round(h * esc);
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d")!;
  g.drawImage(fonte, 0, 0, W, H);

  const u = Math.max(W, H) / 1000; // unidade proporcional
  const pad = 26 * u;
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(c.quando);
  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(c.quando);
  const acoes = c.acoes.map(i => ACAO_CURTA[i]).join(" · ");

  // linhas de texto inferiores
  const linhas = [
    { t: `Observador: ${c.nome}  ·  Chapa ${c.chapa}`, s: 25, w: 600 },
    { t: `${acoes}  —  ${c.equipe}`, s: 25, w: 500 },
    { t: c.local + (c.coordenadas ? `  (${c.coordenadas})` : ""), s: 22, w: 400 },
  ];
  const alturaPainel = pad * 2 + 70 * u + linhas.reduce((a, l) => a + l.s * u * 1.5, 0);

  const grad = g.createLinearGradient(0, H - alturaPainel * 1.25, 0, H);
  grad.addColorStop(0, "rgba(32,6,13,0)");
  grad.addColorStop(0.35, "rgba(32,6,13,.78)");
  grad.addColorStop(1, "rgba(32,6,13,.94)");
  g.fillStyle = grad;
  g.fillRect(0, H - alturaPainel * 1.25, W, alturaPainel * 1.25);

  // faixa de marca
  g.fillStyle = "#f2b134";
  g.fillRect(pad, H - alturaPainel + pad * 0.4, 5 * u, 62 * u);

  g.textBaseline = "alphabetic";
  g.fillStyle = "#fff";
  g.font = `700 ${58 * u}px "Manrope Variable", system-ui, sans-serif`;
  const wh = g.measureText(hora).width;
  g.fillText(hora, pad + 20 * u, H - alturaPainel + pad * 0.4 + 46 * u);
  g.font = `500 ${24 * u}px "Manrope Variable", system-ui, sans-serif`;
  g.fillStyle = "rgba(255,255,255,.82)";
  g.fillText(data, pad + 20 * u + wh + 22 * u, H - alturaPainel + pad * 0.4 + 44 * u);

  let y = H - alturaPainel + pad + 92 * u;
  for (const l of linhas) {
    g.font = `${l.w} ${l.s * u}px "Manrope Variable", system-ui, sans-serif`;
    g.fillStyle = "#fff";
    let t = l.t;
    while (g.measureText(t).width > W - pad * 2 - 20 * u && t.length > 8) t = t.slice(0, -2);
    if (t !== l.t) t += "…";
    g.fillText(t, pad + 20 * u, y);
    y += l.s * u * 1.5;
  }

  // marca d'água (logo branco)
  try {
    const logo = await carregar(`${BASE}logo-cgb-branco.png`);
    const lw = 170 * u, lh = lw * (logo.height / logo.width);
    g.globalAlpha = 0.92;
    g.drawImage(logo, W - pad - lw, H - pad - lh - 4 * u, lw, lh);
    g.globalAlpha = 1;
  } catch { /* logo indisponível: segue sem */ }

  g.fillStyle = "rgba(255,255,255,.7)";
  g.font = `600 ${16 * u}px "Manrope Variable", system-ui, sans-serif`;
  g.textAlign = "right";
  g.fillText("DIA DA SEGURANÇA ATIVA", W - pad, H - pad - 70 * u);
  g.textAlign = "left";

  return new Promise<Blob>((ok, no) => cv.toBlob(b => (b ? ok(b) : no(new Error("canvas"))), "image/jpeg", 0.85));
}
