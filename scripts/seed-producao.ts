/**
 * Seed de PRODUÇÃO: sem nenhuma pessoa nem histórico (isso vem do Supabase). Só o catálogo de equipes (prefixos), que não é dado pessoal.
 * Requer public/seed/roster.json real (seed:real).   bun run seed:real && bun scripts/seed-producao.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const real = JSON.parse(readFileSync("public/seed/roster.json", "utf8")) as { equipes: unknown[] };
mkdirSync("public/seed", { recursive: true });
writeFileSync("public/seed/roster.json", JSON.stringify({ colabs: [], equipes: real.equipes }));
writeFileSync("public/seed/registros.json", "[]");
writeFileSync("public/seed/meta.json", JSON.stringify({ origem: "producao", gerado: new Date().toISOString() }));
console.log(`PRODUCAO: 0 colaboradores, ${real.equipes.length} equipes, 0 registros`);
