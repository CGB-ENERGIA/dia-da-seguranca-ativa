/** Funções que lançam e entram na meta: Supervisor, Coordenador, Engenheiro/Técnico de Segurança, Téc. de Planejamento. */
const LIDER = /SUPERVISOR|COORDENADOR|ENGENHEIRO SEG|T[ÉE]CNICO SEG|T[ÉE]C\.? (DE )?PLANEJ|L[ÍI]DER DE PLANEJ/i;
export const ehLideranca = (funcao: string) => LIDER.test(funcao) && !/ENFERMAGEM|ADMINISTRATIVO/i.test(funcao);
