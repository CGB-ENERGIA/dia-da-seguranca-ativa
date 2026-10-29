export const TZ = "America/Fortaleza";

export const ACOES = [
  "BLITZ",
  "DDS/DSS",
  "INSPEÇÃO DE FERRAMENTAS",
  "INSPEÇÃO EPI/EPC",
  "INSPEÇÃO VEICULAR",
  "TREINAMENTO",
  "POC",
] as const;
/** POC é legado (existe só no histórico); o formulário atual oferece as 6 primeiras. */
export const ACOES_ATIVAS = [0, 1, 2, 3, 4, 5];
export const ACAO_CURTA = ["Blitz", "DDS/DSS", "Insp. Ferramentas", "Insp. EPI/EPC", "Insp. Veicular", "Treinamento", "POC"];

export const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const MESES_LONGO = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const SEMANAS = ["1ª", "2ª", "3ª", "4ª", "5ª"];
export const SEMANAS_LONGO = ["1. Primeira", "2. Segunda", "3. Terceira", "4. Quarta", "5. Quinta"];

const fmtParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
});

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Data/hora de Fortaleza (UTC-3, sem horário de verão), independente do fuso do aparelho. */
export function agora(date = new Date()) {
  const p = Object.fromEntries(fmtParts.formatToParts(date).map(x => [x.type, x.value]));
  return {
    d: `${p.year}-${p.month}-${p.day}`,
    t: `${p.hour}:${p.minute}`,
    weekday: WD[p.weekday as string],
  };
}

export const ehQuarta = (date = new Date()) => agora(date).weekday === 3;

/** Nº da quarta-feira dentro do mês (1..5) a partir de YYYY-MM-DD. */
export const semanaDoMes = (d: string) => Math.ceil(Number(d.slice(8, 10)) / 7);

/** Quarta-feira de referência: a mais recente em ou antes de YYYY-MM-DD (lançamentos de quinta/sexta contam na quarta anterior). */
export function quartaDe(d: string): string {
  const dt = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)));
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() - 3 + 7) % 7));
  return dt.toISOString().slice(0, 10);
}

/** Todas as quartas-feiras do ano até `ate` (YYYY-MM-DD). */
export function quartasDoAno(ano: number, ate: string): string[] {
  const out: string[] = [];
  const dt = new Date(Date.UTC(ano, 0, 1));
  while (dt.getUTCDay() !== 3) dt.setUTCDate(dt.getUTCDate() + 1);
  for (; dt.getUTCFullYear() === ano; dt.setUTCDate(dt.getUTCDate() + 7)) {
    const s = dt.toISOString().slice(0, 10);
    if (s > ate) break;
    out.push(s);
  }
  return out;
}

export function proximaQuarta(date = new Date()): { d: string; dias: number } {
  const a = agora(date);
  const dias = ((3 - a.weekday + 7) % 7) || 7;
  const dt = new Date(Date.UTC(+a.d.slice(0, 4), +a.d.slice(5, 7) - 1, +a.d.slice(8, 10) + dias));
  return { d: dt.toISOString().slice(0, 10), dias };
}

export const brData = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
export const brDataCurta = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
export const diaSemanaExtenso = (date = new Date()) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long" }).format(date);
export const novoId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);
