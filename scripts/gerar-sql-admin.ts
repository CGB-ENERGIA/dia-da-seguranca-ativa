/**
 * Gera supabase/exclusao-senha.sql (IGNORADO pelo git) com o usuário e o hash bcrypt da senha do administrador.
 *   bun scripts/gerar-sql-admin.ts "@Usuario" "senha"
 */
import { mkdirSync, writeFileSync } from "node:fs";

const [usuario, senha] = process.argv.slice(2);
if (!usuario || !senha) throw new Error('Uso: bun scripts/gerar-sql-admin.ts "@Usuario" "senha"');
const hash = (await Bun.password.hash(senha, { algorithm: "bcrypt", cost: 10 })).replace(/^\$2b\$/, "$2a$"); // pgcrypto lê $2a$
const q = (v: string) => `'${v.replace(/'/g, "''")}'`;

mkdirSync("supabase", { recursive: true });
writeFileSync("supabase/exclusao-senha.sql",
`-- Senha do administrador (hash bcrypt, não a senha). Rode DEPOIS de supabase/exclusao.sql.
insert into public.dsa_admin (usuario, hash) values (${q(usuario.toLowerCase())}, ${q(hash)})
on conflict (usuario) do update set hash = excluded.hash;
`);
console.log(`supabase/exclusao-senha.sql gerado para ${usuario.toLowerCase()}`);
