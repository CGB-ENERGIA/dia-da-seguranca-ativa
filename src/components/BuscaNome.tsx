import { useMemo, useState, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import type { Colab } from "../lib/types";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Campo de nome com autocomplete (ignora acento e ordem das palavras). */
export default function BuscaNome({ opcoes, sel, onSel, rotulo = "Seu nome", aviso }: {
  opcoes: Colab[]; sel: Colab | null; onSel: (c: Colab | null) => void; rotulo?: string; aviso?: string;
}) {
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const [hi, setHi] = useState(0);

  const sugestoes = useMemo(() => {
    const q = norm(texto).split(" ").filter(Boolean);
    if (!q.length) return [];
    return opcoes.filter(c => { const n = norm(c.nome); return q.every(p => n.includes(p)); })
      .sort((x, y) => norm(x.nome).indexOf(q[0]) - norm(y.nome).indexOf(q[0]) || x.nome.localeCompare(y.nome)).slice(0, 7);
  }, [texto, opcoes]);

  const escolher = (c: Colab) => { onSel(c); setTexto(c.nome); setAberto(false); };
  const teclas = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!aberto || !sugestoes.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHi(h => (h + 1) % sugestoes.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi(h => (h - 1 + sugestoes.length) % sugestoes.length); }
    else if (e.key === "Enter") { e.preventDefault(); escolher(sugestoes[hi] ?? sugestoes[0]); }
    else if (e.key === "Escape") setAberto(false);
  };
  const primeiro = (c: Colab) => c.nome.split(" ")[0][0] + c.nome.split(" ")[0].slice(1).toLowerCase();

  return (
    <div>
      <label htmlFor="nome" className="eyebrow mb-2 block">{rotulo}</label>
      <div className="relative">
        <input id="nome" autoComplete="off" autoFocus placeholder="Comece a digitar…" role="combobox" aria-expanded={aberto} aria-controls="lista-nomes"
          value={texto} onChange={e => { setTexto(e.target.value); onSel(null); setAberto(true); setHi(0); }}
          onFocus={() => setAberto(true)} onBlur={() => setTimeout(() => setAberto(false), 120)} onKeyDown={teclas}
          className="campo !h-16 !rounded-2xl !text-[17px]" />
        {aberto && sugestoes.length > 0 && !sel && (
          <ul id="lista-nomes" role="listbox" className="absolute inset-x-0 top-[68px] z-30 overflow-hidden rounded-2xl border border-ink/10 bg-card p-1.5 shadow-[0_24px_48px_-16px_rgba(0,0,0,.45)]">
            {sugestoes.map((c, i) => (
              <li key={c.c} role="option" aria-selected={i === hi}>
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => escolher(c)} onMouseEnter={() => setHi(i)}
                  className={"flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition " + (i === hi ? "bg-soft" : "")}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-vinho-700 text-[12px] font-extrabold text-white">{c.nome.slice(0, 2)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-bold text-brand">{c.nome}</span>
                    <span className="block truncate text-[11.5px] font-medium text-ink/45">{c.f.toLowerCase()} · {c.b}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-3 min-h-[44px]">
        {sel ? (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-2xl bg-soft px-4 py-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-vinho-700 text-[12px] font-extrabold text-white">{sel.nome.slice(0, 2)}</div>
            <div className="leading-tight">
              <div className="text-[14px] font-bold text-brand">Olá, {primeiro(sel)}</div>
              <div className="text-[11.5px] font-medium text-ink/50">{sel.f.toLowerCase()} · {sel.b}</div>
            </div>
          </motion.div>
        ) : texto && !sugestoes.length ? (
          <div className="px-1 text-[13px] font-bold text-vinho-500">{aviso ?? "Nome não encontrado."}</div>
        ) : null}
      </div>
    </div>
  );
}

export { norm };
