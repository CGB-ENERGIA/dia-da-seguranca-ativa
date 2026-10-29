import { useMemo } from "react";
import { todosRegistros, useData } from "./data";
import { useFiltros } from "./filtros";
import { aplicar, enriquecer } from "../lib/analytics";

/** Registros enriquecidos (join com colaborador) e o recorte filtrado. Recalcula só quando dados/filtros mudam. */
export function useDados() {
  const { historico, remotos, locais, mapa, colabs, equipes } = useData();
  const f = useFiltros(s => s.f);
  const linhas = useMemo(() => enriquecer(todosRegistros({ historico, remotos, locais }), mapa), [historico, remotos, locais, mapa]);
  const filtradas = useMemo(() => aplicar(linhas, f), [linhas, f]);
  // mesmo recorte, mas sem o filtro de ação (para os cartões de ação mostrarem o total de cada tipo)
  const semAcao = useMemo(() => aplicar(linhas, { ...f, acao: -1 }), [linhas, f]);
  return { f, linhas, filtradas, semAcao, colabs, equipes, mapa };
}
