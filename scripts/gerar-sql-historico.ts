/**
 * Gera supabase/historico/parte-NN.sql com o histórico de ações (public/seed/registros.json, criado por seed:real),
 * em blocos de 1500 linhas para caber no SQL Editor. Ids determinísticos: pode rodar de novo sem duplicar.
 * Arquivos têm dados pessoais (matrículas) e são ignorados pelo git.
 *   bun run seed:real && bun run sql:historico
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const ACOES = ["BLITZ", "DDS/DSS", "INSPEÇÃO DE FERRAMENTAS", "INSPEÇÃO EPI/EPC", "INSPEÇÃO VEICULAR", "TREINAMENTO", "POC"];
const regs = JSON.parse(readFileSync("public/seed/registros.json", "utf8")) as [string, number, string, number][];
const q = (v: string) => `'${v.replace(/'/g, "''")}'`;
const uuid = (s: string) => {
  const h = createHash("sha1").update(s).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

rmSync("supabase/historico", { recursive: true, force: true });
mkdirSync("supabase/historico", { recursive: true });
const TAM = 1500;
let parte = 0;
for (let i = 0; i < regs.length; i += TAM) {
  const linhas = regs.slice(i, i + TAM).map((r, k) =>
    `(${q(uuid(`${r.join("|")}|${i + k}`))}, ${r[1]}, ${q(r[2])}, ${q(ACOES[r[3]])}, ${q(r[0].slice(0, 10))}, ${q(r[0].slice(11, 16))})`);
  writeFileSync(`supabase/historico/parte-${String(++parte).padStart(2, "0")}.sql`,
    `-- Histórico, parte ${parte} (${linhas.length} linhas)\ninsert into public.dsa_registros (id, chapa, equipe, acao, data, hora) values\n${linhas.join(",\n")}\non conflict (id) do nothing;\n`);
}
console.log(`${regs.length} registros em ${parte} arquivos -> supabase/historico/`);
