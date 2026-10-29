/**
 * Gera supabase/colaboradores-seed.sql a partir do cadastro real (public/seed/roster.json, criado por seed:real).
 * O arquivo contém dados pessoais e é ignorado pelo git — cole no SQL Editor do Supabase.
 *   bun run seed:real && bun run sql:colabs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const roster = JSON.parse(readFileSync("public/seed/roster.json", "utf8")) as { colabs: any[] };
const q = (v: unknown) => `'${String(v ?? "").replace(/'/g, "''")}'`;
const linhas = roster.colabs.map(c =>
  `(${c.c}, ${q(c.nome)}, ${q(c.n)}, ${q(c.f)}, ${q(c.b)}, ${q(c.p)}, ${q(c.g)}, ${q(c.gr)}, ${q(c.ger)}, ${q(c.s === "A" ? "ATIVO" : "DESLIGADO")}, ${c.l ? "true" : "false"})`);

mkdirSync("supabase", { recursive: true });
writeFileSync("supabase/colaboradores-seed.sql",
`-- Colaboradores (${roster.colabs.length}). Rode DEPOIS do setup.sql.
insert into public.dsa_colaboradores (chapa, nome, nome_curto, funcao, base, processo, gerencia, grupo, gerente, situacao, lider) values
${linhas.join(",\n")}
on conflict (chapa) do update set
  nome = excluded.nome, nome_curto = excluded.nome_curto, funcao = excluded.funcao, base = excluded.base, processo = excluded.processo,
  gerencia = excluded.gerencia, grupo = excluded.grupo, gerente = excluded.gerente, situacao = excluded.situacao, lider = excluded.lider;
`);
console.log(`supabase/colaboradores-seed.sql: ${roster.colabs.length} linhas`);
