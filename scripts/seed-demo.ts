/**
 * Gera dados FICTÍCIOS (sem pessoas reais) para demonstração e deploy público.
 * Mesmo formato do import-real.ts. Determinístico (seed fixa).
 *
 *   bun run seed:demo
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

let s = 20260429;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const wpick = <T,>(a: [T, number][]) => {
  const t = a.reduce((x, y) => x + y[1], 0);
  let r = rnd() * t;
  for (const [v, w] of a) if ((r -= w) <= 0) return v;
  return a[0][0];
};

const BASES: [string, number][] = [["BCB", 30], ["PDT", 26], ["STI", 20], ["PDS", 18], ["ITM", 12], ["BDC", 5]];
const PROC: [string, string, number][] = [
  ["Plantão", "GSTC", 30], ["Corte e Religação", "GSTC", 12], ["Ligação Nova", "GSTC", 10], ["Perdas", "GSTC", 8],
  ["Construção", "GOMAN", 14], ["Linha viva", "GOMAN", 6], ["Poda", "GOMAN", 5], ["Inspeção", "GERE", 9], ["Segurança", "SESMT", 14],
];
const PROCW: [[string, string], number][] = PROC.map(x => [[x[0], x[1]], x[2]]);
const NOMES = ["Adriano", "Bruna", "Caio", "Daniela", "Elias", "Fabiana", "Gustavo", "Helena", "Igor", "Jaqueline", "Kleber", "Larissa", "Murilo", "Natália", "Otávio", "Priscila", "Rafael", "Sabrina", "Tiago", "Úrsula", "Vitor", "Wesley", "Yara", "Zeca"];
const SOBRE = ["Almeida", "Barros", "Cardoso", "Duarte", "Esteves", "Farias", "Guedes", "Henrique", "Ibiapina", "Jardim", "Lacerda", "Moura", "Nogueira", "Pacheco", "Queiroz", "Ribeiro", "Sampaio", "Tavares", "Uchoa", "Vasconcelos"];
const GERENTES = ["Gerente A", "Gerente B", "Gerente C", "Gerente D"];

const colabs: any[] = [];
for (let i = 0; i < 72; i++) {
  const [p, g] = wpick(PROCW);
  const nome = pick(NOMES), sob = pick(SOBRE);
  const gr = g === "SESMT" ? "SEGURANÇA" : i % 11 === 0 ? "GERENTES" : i % 3 === 0 ? "SUPERVISORES" : "FISCAIS";
  colabs.push({
    c: 90000 + i * 7 + 3, n: `${nome} ${sob[0]}.`, nome: `${nome} ${sob} (demo)`,
    f: gr === "SUPERVISORES" ? "SUPERVISOR OPERACIONAL" : gr === "SEGURANÇA" ? "TÉCNICO SEG DO TRABALHO" : "FISCAL OPERACIONAL",
    p, b: wpick(BASES), g, gr, s: i % 17 === 0 ? "D" : "A", ger: pick(GERENTES),
  });
}

const equipes: any[] = [];
for (const [b] of BASES) {
  const n = b === "BCB" ? 34 : b === "BDC" ? 8 : 18;
  for (let i = 1; i <= n; i++) {
    const [pr, g] = wpick(PROCW.filter(x => x[0][1] !== "SESMT"));
    const t = pr === "Poda" ? "P" : pr === "Construção" ? "O" : pr === "Linha viva" ? "V" : pr === "Plantão" ? "E" : "C";
    equipes.push({ p: `MA-${b}-${t}${String(i).padStart(3, "0")}M`, pr, b, g, y: [2024, 2025, 2026] });
  }
}

const AC: [number, number][] = [[0, 34], [1, 22], [3, 9], [4, 11], [5, 4], [2, 2], [6, 18]];
const registros: [string, number, string, number][] = [];
const hoje = new Date();
const ativos = colabs.filter(c => c.s === "A");
for (let d = new Date(Date.UTC(2024, 0, 3)); d <= hoje; d = new Date(d.getTime() + 7 * 86400000)) {
  const ano = d.getUTCFullYear();
  const bonus = ano === 2026 ? 1.25 : 1;
  for (const c of ativos) {
    if (rnd() < 0.5) continue; // não lançou nesse dia
    let n = Math.max(1, Math.round((0.3 + rnd() * 1.6) * bonus * (c.gr === "SEGURANÇA" ? 1.6 : 1)));
    const visitadas = equipes.filter(e => e.b === c.b || rnd() < 0.08);
    while (n-- > 0) {
      const e = pick(visitadas.length ? visitadas : equipes);
      const k = 1 + Math.floor(rnd() * 2); // até 2 ações na mesma equipe
      for (let j = 0; j < k; j++) {
        const ai = ano === 2026 && wpick(AC) === 6 ? 0 : wpick(AC);
        const h = 7 + Math.floor(rnd() * 10), m = Math.floor(rnd() * 60);
        registros.push([`${d.toISOString().slice(0, 10)}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, c.c, e.p, ai]);
      }
    }
  }
}
registros.sort((a, b) => a[0].localeCompare(b[0]));

const out = join(process.cwd(), "public", "seed");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "roster.json"), JSON.stringify({ colabs, equipes }));
writeFileSync(join(out, "registros.json"), JSON.stringify(registros));
writeFileSync(join(out, "meta.json"), JSON.stringify({ origem: "demo", gerado: new Date().toISOString() }));
console.log(`DEMO: ${colabs.length} colaboradores, ${equipes.length} equipes, ${registros.length} registros`);
