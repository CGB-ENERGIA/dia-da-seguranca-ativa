/**
 * Carrega o histórico (public/seed/registros.json real) em dsa_registros via API, em lotes. Idempotente (ids determinísticos).
 *   bun run seed:real && bun scripts/carregar-historico.ts
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (.env)");

const ACOES = ["BLITZ", "DDS/DSS", "INSPEÇÃO DE FERRAMENTAS", "INSPEÇÃO EPI/EPC", "INSPEÇÃO VEICULAR", "TREINAMENTO", "POC"];
const regs = JSON.parse(readFileSync("public/seed/registros.json", "utf8")) as [string, number, string, number][];
const uuid = (s: string) => {
  const h = createHash("sha1").update(s).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
// mesmos ids do gerar-sql-historico.ts
const linhas = regs.map((r, i) => ({ id: uuid(`${r.join("|")}|${i}`), chapa: r[1], equipe: r[2], acao: ACOES[r[3]], data: r[0].slice(0, 10), hora: r[0].slice(11, 16) }));

let ok = 0;
for (let i = 0; i < linhas.length; i += 1000) {
  const res = await fetch(`${url}/rest/v1/dsa_registros?on_conflict=id`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(linhas.slice(i, i + 1000)),
  });
  if (!res.ok) throw new Error(`lote ${i}: ${res.status} ${await res.text()}`);
  ok += Math.min(1000, linhas.length - i);
  console.log(`${ok}/${linhas.length}`);
}
