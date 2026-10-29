/**
 * Converte as planilhas reais (DIA DSA - 24/26.xlsx) no seed usado pelo painel.
 * Saída: public/seed/{roster,registros}.json  (ignorado pelo git — contém dados pessoais).
 *
 *   bun run seed:real "C:\caminho\para\pasta-das-planilhas"
 */
import * as XLSX from "xlsx";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "C:/Users/Marcus Vinicius/OneDrive - GRUPO CGB/Área de Trabalho/QSMS/DSA";
const ATUAL = process.argv[3] ?? "C:/Users/Marcus Vinicius/OneDrive - GRUPO CGB/Área de Trabalho/QSMS/Colaboradores/2026/10 - Out.26.xlsx";
const files = [
  { y: 2024, f: "DIA DSA - 24.xlsx" },
  { y: 2026, f: "DIA DSA - 26.xlsx" },
];
const ACOES = ["BLITZ", "DDS/DSS", "INSPEÇÃO DE FERRAMENTAS", "INSPEÇÃO EPI/EPC", "INSPEÇÃO VEICULAR", "TREINAMENTO", "POC"];

const sheet = (wb: XLSX.WorkBook, name: string, range?: number) =>
  XLSX.utils.sheet_to_json<any>(wb.Sheets[name], { defval: null, range });

/** serial do Excel (hora local, sem fuso) -> "YYYY-MM-DDTHH:mm" */
const iso = (n: number) => {
  const d = new Date(Math.round((n - 25569) * 86400000));
  return d.toISOString().slice(0, 16);
};
const trim = (v: unknown) => String(v ?? "").trim();

const colabs = new Map<number, any>();
const equipes = new Map<string, any>();
const registros: [string, number, string, number][] = [];

for (const { y, f } of files) {
  const wb = XLSX.readFile(join(dir, f));
  const short = new Map<number, string>();
  for (const r of sheet(wb, "D. REALIZADOS")) short.set(Number(r["CHAPA"]), trim(r["NOME"]));
  const grupo = new Map<number, string>();
  for (const r of sheet(wb, "FICHA TÉCNICA")) grupo.set(Number(r["CHAPA"]), trim(r["GRUPO"]));

  for (const r of sheet(wb, "COLAB.")) {
    const c = Number(r["CHAPA"]);
    if (!c) continue;
    colabs.set(c, {
      c,
      n: short.get(c) || trim(r["NOME"]).split(" ")[0],
      nome: trim(r["NOME"]),
      f: trim(r["FUNÇÃO"]),
      p: trim(r["PROCESSO"]),
      b: trim(r["SEÇÃO"]),
      g: trim(r["GERÊNCIA"]),
      gr: grupo.get(c) || "",
      s: trim(r["SITUAÇÃO"]).toUpperCase() === "ATIVO" ? "A" : "D",
      ger: trim(r["GERENTE"]),
      l: 0,
    });
  }

  for (const r of sheet(wb, "D. EQUIPES", 3)) {
    const p = trim(r["Prefixo"]);
    if (!p) continue;
    const cur = equipes.get(p) ?? { p, pr: "", b: "", g: "", y: [] as number[] };
    Object.assign(cur, { pr: trim(r["Processo"]), b: trim(r["Base"]), g: trim(r["Gerência"]) });
    if (!cur.y.includes(y)) cur.y.push(y);
    equipes.set(p, cur);
  }
  // 2024 cobre 2024 e 2025 (a planilha acumula os dois anos)
  if (y === 2024) for (const e of equipes.values()) if (e.y.includes(2024) && !e.y.includes(2025)) e.y.push(2025);

  for (const r of sheet(wb, "DADOS 2")) {
    if (!r["Data"]) continue;
    let acao = trim(r["Ação"]).toUpperCase();
    if (acao === "DDS" || acao === "DSS") acao = "DDS/DSS";
    const ai = ACOES.indexOf(acao);
    if (ai < 0) continue;
    registros.push([iso(r["Data"]), Number(r["Chapa"]), trim(r["Equipevisitada"] ?? r["Equipe visitada"]), ai]);
  }
}

/* ——— cadastro atual (Base): define quem é liderança ——— */
const LIDER = /SUPERVISOR|COORDENADOR|ENGENHEIRO SEG|T[ÉE]CNICO SEG|T[ÉE]C.? (DE )?PLANEJ|L[ÍI]DER DE PLANEJ/i;
const grupoDe = (f: string) => (/SEG/i.test(f) ? "SEGURANÇA" : /COORDENADOR/i.test(f) ? "GERENTES" : "SUPERVISORES");
const curto = (n: string) => { const p = n.split(" ").filter(x => x.length > 2); return p.length > 1 ? `${p[0][0]}${p[0].slice(1).toLowerCase()} ${p[p.length - 1][0]}.` : p[0] ?? n; };
for (const c of colabs.values()) c.s = "D"; // quem não está no cadastro atual fica inativo
const wbA = XLSX.readFile(ATUAL);
let lideres = 0;
for (const r of sheet(wbA, "Base")) {
  const c = Number(r["CHAPA"]);
  if (!c) continue;
  const funcao = trim(r["FUNÇÃO"]);
  const ativo = ["ATIVO", "FÉRIAS"].includes(trim(r["SITUAÇÃO"]).toUpperCase());
  const lider = LIDER.test(funcao) && !/ENFERMAGEM|ADMINISTRATIVO/i.test(funcao) ? 1 : 0;
  const antigo = colabs.get(c);
  if (!lider && !antigo) continue; // só entram no app: liderança ou quem tem histórico
  colabs.set(c, {
    c, n: antigo?.n ?? curto(trim(r["NOME"])), nome: trim(r["NOME"]), f: funcao, p: trim(r["PROCESSO"]),
    b: trim(r["BASE"]), g: trim(r["GERENCIA"]), gr: lider ? (antigo?.gr && antigo.gr !== "FISCAIS" ? antigo.gr : grupoDe(funcao)) : antigo?.gr ?? "FISCAIS",
    s: ativo ? "A" : "D", ger: antigo?.ger ?? "", l: lider as 0 | 1,
  });
  if (lider && ativo) lideres++;
}
console.log(`lideranças ativas: ${lideres}`);

registros.sort((a, b) => a[0].localeCompare(b[0]));
const out = join(process.cwd(), "public", "seed");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "roster.json"), JSON.stringify({ colabs: [...colabs.values()], equipes: [...equipes.values()] }));
writeFileSync(join(out, "registros.json"), JSON.stringify(registros));
writeFileSync(join(out, "meta.json"), JSON.stringify({ origem: "real", gerado: new Date().toISOString() }));
console.log(`OK: ${colabs.size} colaboradores, ${equipes.size} equipes, ${registros.length} registros -> ${out}`);
