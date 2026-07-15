// Checklists resumidos por domínio (DSM-5-TR). Uso clínico auxiliar — não substitui avaliação completa.
export type DsmCriterion = { code: string; label: string }
export type DsmDomain = {
  id: string
  name: string
  cutoff?: string
  criteria: DsmCriterion[]
}

export const DSM5TR_DOMAINS: DsmDomain[] = [
  {
    id: 'depressive',
    name: 'Transtorno Depressivo Maior',
    cutoff: '≥ 5 critérios por ≥ 2 semanas, incluindo A1 ou A2.',
    criteria: [
      { code: 'A1', label: 'Humor deprimido na maior parte do dia, quase todos os dias' },
      { code: 'A2', label: 'Anedonia — perda de interesse ou prazer' },
      { code: 'A3', label: 'Alteração significativa de peso ou apetite' },
      { code: 'A4', label: 'Insônia ou hipersonia quase diária' },
      { code: 'A5', label: 'Agitação ou retardo psicomotor observável' },
      { code: 'A6', label: 'Fadiga ou perda de energia' },
      { code: 'A7', label: 'Sentimentos de inutilidade ou culpa excessiva' },
      { code: 'A8', label: 'Dificuldade de concentração ou indecisão' },
      { code: 'A9', label: 'Pensamentos recorrentes de morte ou ideação suicida' },
    ],
  },
  {
    id: 'gad',
    name: 'Transtorno de Ansiedade Generalizada',
    cutoff: 'A + B + ≥ 3 sintomas de C por ≥ 6 meses.',
    criteria: [
      { code: 'A', label: 'Ansiedade e preocupação excessivas na maioria dos dias, ≥ 6 meses' },
      { code: 'B', label: 'Dificuldade em controlar a preocupação' },
      { code: 'C1', label: 'Inquietação ou sensação de estar no limite' },
      { code: 'C2', label: 'Fatigabilidade' },
      { code: 'C3', label: 'Dificuldade de concentração ou "brancos"' },
      { code: 'C4', label: 'Irritabilidade' },
      { code: 'C5', label: 'Tensão muscular' },
      { code: 'C6', label: 'Perturbação do sono' },
    ],
  },
  {
    id: 'adhd',
    name: 'TDAH (adulto: ≥ 5 em cada grupo; criança: ≥ 6)',
    cutoff: 'Sintomas antes dos 12 anos, ≥ 2 contextos, prejuízo funcional.',
    criteria: [
      { code: 'I1', label: 'Desatento a detalhes / erros por descuido' },
      { code: 'I2', label: 'Dificuldade em manter atenção em tarefas' },
      { code: 'I3', label: 'Parece não ouvir quando lhe dirigem a palavra' },
      { code: 'I4', label: 'Não segue instruções e não conclui tarefas' },
      { code: 'I5', label: 'Dificuldade em organizar tarefas e atividades' },
      { code: 'I6', label: 'Evita tarefas que exigem esforço mental sustentado' },
      { code: 'I7', label: 'Perde objetos necessários para tarefas' },
      { code: 'I8', label: 'Facilmente distraído por estímulos externos' },
      { code: 'I9', label: 'Esquecimento em atividades cotidianas' },
      { code: 'H1', label: 'Remexe / bate mãos ou pés / se contorce' },
      { code: 'H2', label: 'Levanta em situações em que se espera permanecer sentado' },
      { code: 'H3', label: 'Corre ou escala em situações inapropriadas / inquietação' },
      { code: 'H4', label: 'Incapaz de brincar ou se envolver em atividades tranquilas' },
      { code: 'H5', label: '"A mil" / age como se estivesse "a todo vapor"' },
      { code: 'H6', label: 'Fala em excesso' },
      { code: 'H7', label: 'Responde antes de a pergunta ser concluída' },
      { code: 'H8', label: 'Dificuldade em esperar a vez' },
      { code: 'H9', label: 'Interrompe ou se intromete' },
    ],
  },
  {
    id: 'asd',
    name: 'Transtorno do Espectro Autista',
    cutoff: 'A: todos os 3 · B: ≥ 2 dos 4 · início precoce · prejuízo.',
    criteria: [
      { code: 'A1', label: 'Déficit em reciprocidade socioemocional' },
      { code: 'A2', label: 'Déficit em comportamentos comunicativos não verbais' },
      { code: 'A3', label: 'Déficit em desenvolver, manter e compreender relações' },
      { code: 'B1', label: 'Movimentos motores, uso de objetos ou fala estereotipados/repetitivos' },
      { code: 'B2', label: 'Insistência em rotinas / padrões ritualizados' },
      { code: 'B3', label: 'Interesses fixos e restritos, com intensidade atípica' },
      { code: 'B4', label: 'Hiper ou hiporreatividade sensorial / interesse sensorial incomum' },
    ],
  },
  {
    id: 'ptsd',
    name: 'Transtorno de Estresse Pós-Traumático',
    cutoff: 'A + ≥ 1 B + ≥ 1 C + ≥ 2 D + ≥ 2 E por ≥ 1 mês.',
    criteria: [
      { code: 'A', label: 'Exposição a evento traumático (morte, ameaça, violência sexual)' },
      { code: 'B1', label: 'Memórias intrusivas recorrentes do evento' },
      { code: 'B2', label: 'Pesadelos relacionados' },
      { code: 'B3', label: 'Reações dissociativas / flashbacks' },
      { code: 'C1', label: 'Evitação de memórias, pensamentos ou sentimentos do evento' },
      { code: 'C2', label: 'Evitação de lembretes externos (pessoas, lugares)' },
      { code: 'D1', label: 'Incapacidade de recordar aspecto importante do evento' },
      { code: 'D2', label: 'Crenças negativas persistentes sobre si / o mundo' },
      { code: 'D3', label: 'Culpa distorcida sobre causa / consequências' },
      { code: 'D4', label: 'Estado emocional negativo persistente' },
      { code: 'E1', label: 'Irritabilidade e comportamento agressivo' },
      { code: 'E2', label: 'Comportamento imprudente / autodestrutivo' },
      { code: 'E3', label: 'Hipervigilância' },
      { code: 'E4', label: 'Resposta de sobressalto exagerada' },
      { code: 'E5', label: 'Problemas de concentração' },
      { code: 'E6', label: 'Perturbação do sono' },
    ],
  },
  {
    id: 'ocd',
    name: 'Transtorno Obsessivo-Compulsivo',
    cutoff: 'Obsessões e/ou compulsões consumindo > 1h/dia ou causando sofrimento.',
    criteria: [
      { code: 'O1', label: 'Pensamentos, impulsos ou imagens recorrentes e intrusivos' },
      { code: 'O2', label: 'Tentativas de ignorar/suprimir ou neutralizar' },
      { code: 'C1', label: 'Comportamentos repetitivos ou atos mentais em resposta a obsessão' },
      { code: 'C2', label: 'Comportamentos destinados a prevenir/reduzir ansiedade' },
    ],
  },
]
