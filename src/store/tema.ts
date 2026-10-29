import { create } from "zustand";

export type Tema = "claro" | "escuro";

const guardado = (): Tema => {
  try {
    const t = localStorage.getItem("dsa:tema");
    if (t === "claro" || t === "escuro") return t;
  } catch { /* sem storage */ }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
};

const aplicar = (t: Tema) => {
  document.documentElement.classList.toggle("dark", t === "escuro");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "escuro" ? "#0f0809" : "#4a0f1d");
};

export const useTema = create<{ tema: Tema; alternar: () => void }>((set, get) => ({
  tema: guardado(),
  alternar: () => {
    const t: Tema = get().tema === "claro" ? "escuro" : "claro";
    try { localStorage.setItem("dsa:tema", t); } catch { /* sem storage */ }
    aplicar(t);
    set({ tema: t });
  },
}));

aplicar(useTema.getState().tema);
