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
export type SyncState = "pending" | "synced" | "error" | "rejected";
export interface Reg {
  id: string;
  d: string; // YYYY-MM-DD (hora local de Fortaleza)
  t: string; // HH:mm
  chapa: number;
  equipe: string;
  acao: number; // índice em ACOES
  origem: "hist" | "app";
  sync?: SyncState;
  foto?: string; // 1ª evidência no Storage (registros vindos do banco)
  fotos?: string[]; // todas as evidências no Storage (até 5)
  fotoIds?: string[]; // ids locais das fotos (até 5) antes do envio
  criado?: string; // quando o servidor recebeu
  orig?: string; // 'app' | 'historico'
  motivo?: string; // por que o banco recusou o lançamento
  fotoId?: string;
  lat?: number;
  lon?: number;
  local?: string;
}
