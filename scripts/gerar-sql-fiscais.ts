/**
 * Gera supabase/fiscais-seed.sql (IGNORADO pelo git) a partir da planilha oficial de quem registra ações (aba "Fiscais").
 *   bun scripts/gerar-sql-fiscais.ts "usuários e senhas - Registros DSA.xlsx"
 * O que o SQL faz (pode rodar mais de uma vez):
 *  1) garante o cadastro completo em dsa_colaboradores (roster importado, sem sobrescrever);
 *  2) atualiza/cria os colaboradores da planilha como lideranças (lider = true) e tira a marca de liderança de quem NÃO está na planilha;
 *  3) cria o usuário de quem ainda não tem (login @PrimeiroÚltimo, senha SA@<chapa><inicial>, troca obrigatória no 1º acesso); só hash bcrypt.
 */
import * as XLSX from "xlsx";
import { readFileSync, writeFileSync } from "node:fs";

const arquivo = process.argv[2];
if (!arquivo) throw new Error('Uso: bun scripts/gerar-sql-fiscais.ts "planilha.xlsx"');
const rows = XLSX.utils.sheet_to_json<any>(XLSX.readFile(arquivo).Sheets["Fiscais"], { defval: null }).filter(r => r.CHAPA);
const vistas = new Set<number>(); // a planilha repete algumas pessoas: vale a primeira linha de cada chapa
const unicas = rows.filter(r => !vistas.has(Number(r.CHAPA)) && vistas.add(Number(r.CHAPA)));
const q = (v: unknown) => (v == null || v === "" ? "null" : `'${String(v).trim().replace(/'/g, "''")}'`);
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const roster = JSON.parse(readFileSync("public/seed/roster.json", "utf8")) as { colabs: any[] };
const seedUsuarios = readFileSync("supabase/usuarios-seed.sql", "utf8").toLowerCase();

const base = roster.colabs.map(c =>
  `(${c.c}, ${q(c.nome)}, ${q(c.n)}, ${q(c.f)}, ${q(c.b)}, ${q(c.p)}, ${q(c.g)}, ${q(c.gr)}, ${q(c.ger)}, ${q(c.s === "A" ? "ATIVO" : "DESLIGADO")}, ${c.l ? "true" : "false"})`);

const colabs: string[] = [], usuarios: string[] = [], usados = new Set<string>(), novos: string[] = [];
for (const r of unicas) {
  const chapa = Number(r.CHAPA), nome = String(r.NOME).trim().replace(/\s+/g, " ");
  const p = semAcento(nome).split(" ");
  const nomeCurto = cap(p[0]);
  colabs.push(`(${chapa}, ${q(nome)}, ${q(nomeCurto)}, ${q(r["FUNÇÃO"])}, ${q(r.BASE)}, ${q(r.PROCESSO)}, ${q(r.GERENCIA)}, 'FISCAIS', '', 'ATIVO', true)`);
  const login = `@${cap(p[0])}${cap(p[p.length - 1])}`.toLowerCase();
  if (seedUsuarios.includes(`'${login}'`)) continue; // já existe
  if (usados.has(login)) throw new Error(`login repetido: ${login} (${nome})`);
  usados.add(login);
  const senha = `SA@${chapa}${p[0][0].toLowerCase()}`;
  const hash = (await Bun.password.hash(senha, { algorithm: "bcrypt", cost: 10 })).replace(/^\$2b\$/, "$2a$");
  usuarios.push(`(${q(login)}, ${chapa}, ${q(nome)}, ${q(r["FUNÇÃO"])}, ${q(r.BASE)}, ${q(r.PROCESSO)}, ${q(r.GERENCIA)}, 'observador', true, '${hash}')`);
  novos.push(`${login}\t${chapa}\t${nome}\t${senha}`);
}
const chapas = unicas.map(r => Number(r.CHAPA)).join(", ");

writeFileSync("supabase/fiscais-seed.sql",
`-- Fiscais/lideranças que registram ações (${unicas.length}) e usuários novos (${usuarios.length}). Rode DEPOIS de usuarios.sql. Pode rodar mais de uma vez.

-- 1) cadastro completo (não sobrescreve o que já existe)
insert into public.dsa_colaboradores (chapa, nome, nome_curto, funcao, base, processo, gerencia, grupo, gerente, situacao, lider) values
${base.join(",\n")}
on conflict (chapa) do nothing;

-- 2) quem está na planilha vira liderança ativa; quem não está deixa de ser liderança (continua no histórico)
insert into public.dsa_colaboradores (chapa, nome, nome_curto, funcao, base, processo, gerencia, grupo, gerente, situacao, lider) values
${colabs.join(",\n")}
on conflict (chapa) do update set
  nome = excluded.nome, funcao = excluded.funcao, base = excluded.base, processo = excluded.processo, gerencia = excluded.gerencia,
  situacao = 'ATIVO', lider = true;
update public.dsa_colaboradores set lider = false where chapa not in (${chapas}) and lider = true;

-- 3) usuários que ainda não existem (senha provisória; troca obrigatória no primeiro acesso)
${usuarios.length ? `insert into public.dsa_usuarios (usuario, chapa, nome, funcao, base, processo, gerencia, nivel, ativo, hash) values
${usuarios.join(",\n")}
on conflict (usuario) do nothing;` : "-- (todos já têm usuário)"}
`);
writeFileSync("supabase/fiscais-novos-acessos.tsv", "usuario\tchapa\tnome\tsenha_inicial\n" + novos.join("\n") + "\n");
console.log(`${unicas.length} fiscais (${rows.length} linhas); ${usuarios.length} usuários novos; tabela em supabase/fiscais-novos-acessos.tsv`);
