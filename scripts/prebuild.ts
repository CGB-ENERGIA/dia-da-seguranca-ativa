/**
 * Garante public/seed/* antes do build.
 *  - Já existe (seed:real / seed:demo rodado antes)  -> não mexe.
 *  - Não existe (build limpo, ex.: Vercel via Git)    -> gera o seed de PRODUÇÃO: sem pessoas e sem histórico
 *    (cadastro e histórico vêm do Supabase); só o catálogo de equipes de data/equipes.json (não é dado pessoal).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

if (!existsSync("public/seed/roster.json")) {
  const equipes = JSON.parse(readFileSync("data/equipes.json", "utf8"));
  mkdirSync("public/seed", { recursive: true });
  writeFileSync("public/seed/roster.json", JSON.stringify({ colabs: [], equipes }));
  writeFileSync("public/seed/registros.json", "[]");
  writeFileSync("public/seed/meta.json", JSON.stringify({ origem: "producao", gerado: new Date().toISOString() }));
  console.log(`prebuild: seed de produção gerado (${equipes.length} equipes)`);
} else {
  console.log("prebuild: public/seed já existe");
}
