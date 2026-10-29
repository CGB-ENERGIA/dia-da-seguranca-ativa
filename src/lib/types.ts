export interface Colab {
  c: number; // chapa
  n: string; // nome curto
  nome: string;
  f: string; // função
  p: string; // processo
  b: string; // base (seção)
  g: string; // gerência
  gr: string; // grupo
  s: "A" | "D"; // ativo | desligado
  ger: string;
  l: 0 | 1; // liderança: aparece na meta e pode lançar
}
export interface Equipe {
  p: string; // prefixo
  pr: string; // processo
  b: string; // base
  g: string; // gerência
  y: number[]; // anos em que a equipe existe
}
export type SyncState = "pending" | "synced" | "error";
export interface Reg {
  id: string;
  d: string; // YYYY-MM-DD (hora local de Fortaleza)
  t: string; // HH:mm
  chapa: number;
  equipe: string;
  acao: number; // índice em ACOES
  origem: "hist" | "app";
  sync?: SyncState;
  fotoId?: string;
  lat?: number;
  lon?: number;
  local?: string;
}
