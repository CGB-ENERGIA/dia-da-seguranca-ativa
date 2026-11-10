/**
 * Carrega no Supabase (dsa_registros) uma planilha exportada do formulário antigo
 * (colunas: Carimbo de data/hora · Matrícula: · Equipe visitada: · Ação: · Evidência:),
 * corrigindo o prefixo da equipe conforme o cadastro (data/equipes.json). Idempotente (ids determinísticos).
 *
 *   bun scripts/carregar-planilha-forms.ts "C:\caminho\DSA.xlsx"            # simula (não grava)
 *   bun scripts/carregar-planilha-forms.ts "C:\caminho\DSA.xlsx" --gravar   # grava no banco
 */
import * as XLSX from "xlsx";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { criarNormalizador } from "./prefixo";

const arquivo = process.argv[2];
const gravar = process.argv.includes("--gravar");
if (!arquivo) throw new Error("Informe o caminho da planilha");
const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_ANON_KEY;
if (gravar && (!url || !key)) throw new Error("Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (.env)");

const ACOES = ["BLITZ", "DDS/DSS", "INSPEÇÃO DE FERRAMENTAS", "INSPEÇÃO EPI/EPC", "INSPEÇÃO VEICULAR", "TREINAMENTO", "POC"];
const norm = criarNormalizador(JSON.parse(readFileSync("data/equipes.json", "utf8")));
const uuid = (s: string) => {
  const h = createHash("sha1").update(s).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const iso = (n: number) => new Date(Math.round((n - 25569) * 86400000)).toISOString(); // hora local digitada, sem fuso

const wb = XLSX.readFile(arquivo);
const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]], { defval: null });

const linhas: any[] = [], metodos: Record<string, number> = {}, revisar = new Map<string, number>();
let ignoradas = 0;
rows.forEach((r, i) => {
  const ts = r["Carimbo de data/hora"], chapa = Number(r["Matrícula:"]);
  let acao = String(r["Ação:"] ?? "").trim().toUpperCase();
  if (acao === "DDS" || acao === "DSS") acao = "DDS/DSS";
  if (!ts || !chapa || !ACOES.includes(acao)) { ignoradas++; return; }
  const bruto = String(r["Equipe visitada:"] ?? "").trim();
  const n = norm(bruto);
  metodos[n.metodo] = (metodos[n.metodo] ?? 0) + 1;
  if (n.metodo === "ambiguo" || n.metodo === "desconhecido") revisar.set(`${bruto} -> ${n.prefixo} (${n.metodo})`, (revisar.get(`${bruto} -> ${n.prefixo} (${n.metodo})`) ?? 0) + 1);
  const d = iso(ts);
  linhas.push({ id: uuid(`forms|${ts}|${chapa}|${bruto}|${acao}|${i}`), chapa, equipe: n.prefixo, acao, data: d.slice(0, 10), hora: d.slice(11, 16) });
});

console.log(`linhas válidas: ${linhas.length} · ignoradas: ${ignoradas}`);
console.log("prefixos:", metodos);
console.log("para revisão:", Object.fromEntries(revisar));
const datas = linhas.map(l => l.data).sort();
console.log(`período: ${datas[0]} a ${datas.at(-1)}`);

if (!gravar) { console.log("\n(simulação — use --gravar para enviar ao banco)"); process.exit(0); }
let ok = 0;
for (let i = 0; i < linhas.length; i += 500) {
  const res = await fetch(`${url}/rest/v1/dsa_registros?on_conflict=id`, {
    method: "POST",
    headers: { apikey: key!, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(linhas.slice(i, i + 500)),
  });
  if (!res.ok) throw new Error(`lote ${i}: ${res.status} ${await res.text()}`);
  ok += Math.min(500, linhas.length - i);
}
console.log(`gravadas: ${ok}`);
