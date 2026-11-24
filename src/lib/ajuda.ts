/** Textos do ícone "i": o que é, como ler e por que importa. Cada indicador do relatório aponta para uma chave daqui. */
export interface Ajuda { o: string; l: string; i: string }

export const AJUDA: Record<string, Ajuda> = {
  // ---- Painel de Ações
  total: { o: "Quantidade de ações de segurança registradas no período filtrado (Blitz, DDS/DSS, inspeções e treinamentos).", l: "Muda conforme os filtros de ano, mês, quarta-feira, base, gerência, grupo e processo.", i: "É o termômetro do programa: mostra o quanto a liderança está presente em campo." },
  visitas: { o: "Equipes diferentes visitadas. Várias ações do mesmo observador na mesma equipe e no mesmo dia contam como uma única visita.", l: "Compare com o total de ações: muitas ações em poucas visitas indica concentração em poucas equipes.", i: "Garante que o contato com as equipes seja amplo, e não repetido sempre nas mesmas." },
  observadores: { o: "Lideranças que registraram ao menos uma ação no período filtrado.", l: "Quanto mais perto do total de lideranças ativas, maior a participação.", i: "Mostra se o programa está distribuído ou depende de poucas pessoas." },
  meta: { o: "Percentual de cumprimento da meta pelas lideranças ativas: quartas-feiras em que houve ao menos a meta de ações, sobre as quartas esperadas.", l: "100% significa que todos cumpriram a meta em todas as quartas. Quartas dispensadas (férias, atestado etc.) não contam contra.", i: "Indica a constância do programa, não só o volume." },
  tipos: { o: "Total de ações por tipo: Blitz, DDS/DSS, Insp. Ferramentas, Insp. EPI/EPC, Insp. Veicular e Treinamento.", l: "Clique em um tipo para filtrar toda a tela. A barra inferior mostra a participação do tipo no total.", i: "Revela o equilíbrio entre ações preventivas e de orientação." },
  evolucao: { o: "Ações e visitas em cada quarta-feira do período.", l: "Barras e linha mostram altos e baixos. Queda em semanas seguidas pede atenção.", i: "Permite perceber cedo se o ritmo do programa está caindo." },
  gerencia: { o: "Ações do período agrupadas por gerência do observador.", l: "Barras maiores têm mais ações. Clique para filtrar.", i: "Mostra quais gerências estão mais e menos engajadas." },
  base: { o: "Ações do período agrupadas por base operacional.", l: "Barras maiores têm mais ações. Clique para filtrar.", i: "Ajuda a direcionar apoio às bases com menos registros." },
  quartaMes: { o: "Ações por ordem da quarta-feira no mês (1ª a 5ª).", l: "Compare as barras: se a 1ª ou a última quarta são sempre menores, há um padrão.", i: "Identifica semanas do mês em que a adesão costuma cair." },
  processo: { o: "Ações do período agrupadas pelo processo do observador.", l: "Barras maiores indicam processos com mais registros.", i: "Mostra se áreas administrativas e operacionais participam de forma equilibrada." },
  calor: { o: "Mapa de bases por quartas-feiras recentes. Cada quadrado é a quantidade de ações da base naquela quarta.", l: "Cor mais forte = mais ações. Quadrados claros indicam quarta com pouca ou nenhuma ação.", i: "Localiza rapidamente onde e quando o programa falhou." },

  // ---- Colaboradores
  podio: { o: "Os três observadores com mais ações no período filtrado.", l: "O número grande é o total de ações; ao lado, as visitas a equipes.", i: "Reconhece quem mais contribui e serve de referência para os demais." },
  relatorioColab: { o: "Lista de todos os observadores com ações, quartas cumpridas e percentual da meta.", l: "Na etiqueta, 3/4 · 75% significa que cumpriu a meta em 3 de 4 quartas. Verde 80% ou mais, amarelo 40% ou mais, vermelho abaixo.", i: "Mostra individualmente quem precisa de apoio ou reconhecimento." },
  aderencia: { o: "Média do cumprimento da meta entre os observadores ativos do recorte atual.", l: "Quanto mais cheio o anel, mais perto de 100% de quartas cumpridas.", i: "É o indicador mais direto de constância das lideranças." },
  zerados: { o: "Observadores ativos sem nenhuma ação no período filtrado.", l: "Número grande e nomes abaixo. Ajuste os filtros para ver períodos específicos.", i: "Aponta quem não está participando e precisa de contato." },

  // ---- Equipes
  taxa: { o: "Equipes visitadas dividido pelo total de equipes ativas.", l: "100% = toda equipe recebeu ao menos uma visita. Equipes inativas não entram na conta.", i: "Garante que nenhuma equipe fique sem acompanhamento de segurança." },
  visitasBase: { o: "Visitas às equipes por base. Cada combinação de observador, equipe e dia conta como uma visita.", l: "Barras maiores = mais visitas. Clique para filtrar.", i: "Mostra onde as equipes estão sendo mais e menos visitadas." },
  maisVisitadas: { o: "Equipes com mais visitas no período.", l: "O número à direita é a quantidade de visitas.", i: "Ajuda a evitar concentração de visitas nas mesmas equipes." },
  naoVisitadas: { o: "Equipes ativas que não receberam nenhuma visita no período filtrado.", l: "A lista é a pendência: são as equipes a visitar nas próximas quartas.", i: "Orienta a programação das próximas visitas." },

  // ---- Insights (cartões)
  "Última quarta-feira": { o: "Total de ações da quarta-feira mais recente, comparado com a média das 3 quartas anteriores.", l: "Percentual positivo = acima da média recente; negativo = abaixo.", i: "Dá a leitura imediata de como foi a semana mais recente." },
  "Ritmo do programa": { o: "Média de ações por quarta-feira encerrada no período e projeção para o fim do ano.", l: "Considera só quartas já encerradas. A projeção supõe manter o ritmo atual.", i: "Ajuda a prever se o programa chegará ao esperado no ano." },
  "Adesão das lideranças": { o: "Média de cumprimento da meta pelas lideranças ativas e quantas atingem 80% ou mais.", l: "Verde a partir de 80%, amarelo entre 50% e 79%, vermelho abaixo de 50%.", i: "Mede o engajamento real das lideranças, não só o volume de ações." },
  "Cobertura de equipes": { o: "Percentual de equipes ativas que receberam ao menos uma visita no período.", l: "Verde a partir de 70%, amarelo a partir de 40%. O texto informa quantas equipes seguem sem visita.", i: "Mostra se o contato com o campo está chegando a todas as equipes." },
  "Mix de ações": { o: "Tipo de ação mais frequente e quanto as inspeções somam no total.", l: "O percentual é a participação do tipo líder entre todas as ações.", i: "Um mix muito concentrado pode indicar falta de variedade nas atividades." },
  "Destaques": { o: "Base com mais ações e o observador que mais registrou no período.", l: "É um ranking de volume, sem considerar o tamanho da base.", i: "Valoriza e dá visibilidade a quem mais contribui." },
  "Lançamento no dia": { o: "Percentual das ações lançadas na própria quarta-feira, dia do programa.", l: "Verde a partir de 85%. O texto mostra lançamentos na quinta e em outros dias.", i: "Registro no dia garante dados confiáveis e fotos com horário correto." },
  "Atenção: lideranças paradas": { o: "Quantidade de lideranças sem nenhuma ação nas últimas 4 quartas-feiras.", l: "Os nomes aparecem no texto e na lista completa ao final da página.", i: "Permite agir cedo com quem se afastou do programa." },
  "Qualidade dos dados": { o: "Percentual de ações lançadas com equipe que existe no cadastro.", l: "Abaixo de 98% aparece o alerta. Corrija em Configurações > Equipes.", i: "Equipes fora do cadastro distorcem os relatórios de cobertura." },

  // ---- Insights (gráficos)
  ritmoQuarta: { o: "Ações lançadas em cada quarta-feira e a média móvel das últimas 4 quartas.", l: "Barras são cada quarta; a linha amarela suaviza as oscilações. Linha subindo = programa acelerando.", i: "Mostra a tendência real, sem se enganar com uma semana isolada." },
  adesaoQuarta: { o: "Percentual da meta cumprido pelas lideranças ativas em cada quarta.", l: "Quanto mais alto, mais lideranças fizeram o mínimo esperado naquele dia.", i: "Mostra a constância do programa ao longo do tempo." },
  mixMes: { o: "Distribuição dos tipos de ação mês a mês.", l: "Cada cor é um tipo de ação; a altura da barra é o total do mês.", i: "Permite ver se o foco do programa mudou ao longo do ano." },
  coberturaBase: { o: "Percentual das equipes ativas de cada base que receberam ao menos uma visita.", l: "100% = todas as equipes da base visitadas.", i: "Mostra quais bases têm equipes esquecidas." },
  faixas: { o: "Quantas lideranças estão em cada faixa de cumprimento da meta.", l: "Faixas mais à esquerda são de menor aderência. O ideal é concentrar na faixa mais alta.", i: "Separa quem está cumprindo de quem precisa de apoio." },
  aderGerencia: { o: "Média da aderência à meta dos observadores de cada gerência.", l: "Barras maiores = gerências mais constantes.", i: "Permite comparar o engajamento entre gerências." },
  diaLancamento: { o: "Em que dia da semana cada ação foi lançada.", l: "O esperado é a quarta-feira. Quinta e outros dias indicam registro atrasado.", i: "Lançamento fora do dia reduz a confiança na informação." },
  horario: { o: "Distribuição das ações ao longo do dia, pelo horário do lançamento.", l: "Colunas mais altas mostram os horários de maior movimento.", i: "Ajuda a entender quando as ações acontecem e se há registros fora de hora." },
  paradas: { o: "Lideranças sem nenhuma ação nas últimas 4 quartas-feiras.", l: "Cada nome é uma pessoa para acompanhar, com a base ao lado.", i: "É a lista de contato para retomar a participação." },
};
