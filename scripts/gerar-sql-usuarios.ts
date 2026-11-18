/**
 * Gera supabase/usuarios-seed.sql (IGNORADO pelo git) a partir da planilha de usuários, guardando só o HASH bcrypt das senhas.
 *   bun scripts/gerar-sql-usuarios.ts "Usuário e acessos.xlsx" "@MarcusQueiros"
 * O segundo argumento é o usuário que será ADMINISTRADOR; todos os outros entram como "observador" (só registram ações).
 * O nível de cada um é ajustado depois na aba Usuários do relatório. Linhas já existentes não são sobrescritas.
 */
import * as XLSX from "xlsx";
import { mkdirSync, writeFileSync } from "node:fs";

const [arquivo, admin] = process.argv.slice(2);
if (!arquivo || !admin) throw new Error('Uso: bun scripts/gerar-sql-usuarios.ts "planilha.xlsx" "@UsuarioAdmin"');
const wb = XLSX.readFile(arquivo);
const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]], { defval: null });
const q = (v: unknown) => (v == null || v === "" ? "null" : `'${String(v).trim().replace(/'/g, "''")}'`);

const linhas: string[] = [];
for (const r of rows) {
  const usuario = String(r.USUARIO ?? "").trim().toLowerCase(), senha = String(r.SENHA ?? "");
  if (!usuario || !senha) continue;
  const hash = (await Bun.password.hash(senha, { algorithm: "bcrypt", cost: 10 })).replace(/^\$2b\$/, "$2a$"); // pgcrypto lê $2a$
  const nivel = usuario === admin.trim().toLowerCase() ? "admin" : "observador";
  linhas.push(`(${q(usuario)}, ${r.CHAPA ?? "null"}, ${q(r.NOME)}, ${q(r["FUNÇÃO"])}, ${q(r.BASE)}, ${q(r.PROCESSO)}, ${q(r.GERENCIA)}, '${nivel}', true, '${hash}')`);
}
mkdirSync("supabase", { recursive: true });
writeFileSync("supabase/usuarios-seed.sql",
`-- Usuários da planilha (${linhas.length}); senhas só como hash. Rode DEPOIS de supabase/usuarios.sql.
insert into public.dsa_usuarios (usuario, chapa, nome, funcao, base, processo, gerencia, nivel, ativo, hash) values
${linhas.join(",\n")}
on conflict (usuario) do nothing;
`);
console.log(`supabase/usuarios-seed.sql: ${linhas.length} usuários (admin: ${admin.toLowerCase()})`);
