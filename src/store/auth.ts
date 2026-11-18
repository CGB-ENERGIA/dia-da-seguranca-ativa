import { create } from "zustand";

export type Nivel = "admin" | "gestor" | "consulta" | "observador";

export interface Perfil {
  usuario: string;
  nome: string;
  chapa: number | null;
  funcao?: string | null;
  base?: string | null;
  processo?: string | null;
  gerencia?: string | null;
  nivel: Nivel;
  /** precisa definir uma nova senha antes de usar o sistema (primeiro acesso ou senha redefinida pelo administrador) */
  trocarSenha?: boolean;
  /** sessão aberta sem o servidor de usuários (antes de instalar supabase/usuarios.sql) */
  legado?: boolean;
}

export const NIVEIS: Record<Nivel, { rotulo: string; texto: string }> = {
  admin: { rotulo: "Administrador", texto: "Acesso total: relatório, configurações, banco de dados (com exclusão) e usuários." },
  gestor: { rotulo: "Gestor", texto: "Relatório, configurações e banco de dados (somente leitura). Não gerencia usuários nem exclui registros." },
  consulta: { rotulo: "Consulta", texto: "Relatório: painel, insights, colaboradores e equipes. Sem configurações nem banco de dados." },
  observador: { rotulo: "Observador", texto: "Apenas o registro de ações em campo. Não abre o relatório." },
};
const RANK: Record<Nivel, number> = { observador: 0, consulta: 1, gestor: 2, admin: 3 };
export const podeAcessar = (nivel: Nivel | undefined, minimo: Nivel) => !!nivel && RANK[nivel] >= RANK[minimo];

const CHAVE = "dsa:sessao";
const ler = (): Perfil | null => {
  try {
    for (const k of ["dsa:adm", "dsa:chapa"]) localStorage.removeItem(k); // sessões da versão anterior
    const j = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as Perfil | null;
    return j && j.usuario && j.nivel in RANK ? j : null;
  } catch { return null; }
};

/** A senha fica só na memória (some ao recarregar): é usada para confirmar ações de administrador. */
let senhaEmMemoria = "";
export const senhaAtual = () => senhaEmMemoria;
export const lembrarSenha = (s: string) => { senhaEmMemoria = s; };

interface AuthState {
  perfil: Perfil | null;
  entrar: (p: Perfil, senha?: string) => void;
  sair: () => void;
  /** o servidor avisou que a senha precisa ser redefinida: abre a janela obrigatória */
  exigirTroca: (msg: string) => boolean;
}

export const useAuth = create<AuthState>(set => ({
  perfil: ler(),
  entrar: (p, senha = "") => {
    try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch { /* sem storage */ }
    senhaEmMemoria = senha;
    set({ perfil: p });
  },
  exigirTroca: msg => {
    if (!/Redefina sua senha/i.test(msg)) return false;
    const p = useAuth.getState().perfil;
    if (p) useAuth.getState().entrar({ ...p, trocarSenha: true }, senhaEmMemoria);
    return true;
  },
  sair: () => {
    try { localStorage.removeItem(CHAVE); } catch { /* sem storage */ }
    senhaEmMemoria = "";
    set({ perfil: null });
  },
}));
