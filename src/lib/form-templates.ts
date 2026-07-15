export type FormField = {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'choice' | 'scale'
  options?: string[]
  min?: number
  max?: number
  required?: boolean
  help?: string
}

export type FormTemplate = {
  id: string
  title: string
  description: string
  fields: FormField[]
}

export const formTemplates: FormTemplate[] = [
  {
    id: 'anamnese-breve',
    title: 'Anamnese breve',
    description:
      'Formulário inicial de anamnese para o paciente preencher antes do primeiro atendimento.',
    fields: [
      { key: 'queixa', label: 'Qual a principal queixa ou motivo da avaliação?', type: 'textarea', required: true },
      { key: 'historia_atual', label: 'Descreva brevemente sua história atual (últimos meses)', type: 'textarea' },
      { key: 'historia_medica', label: 'Histórico médico relevante (doenças, cirurgias, medicações em uso)', type: 'textarea' },
      { key: 'historia_escolar', label: 'Trajetória escolar / acadêmica', type: 'textarea' },
      { key: 'historia_familiar', label: 'Composição familiar e relacionamentos importantes', type: 'textarea' },
      { key: 'historia_social', label: 'Vida social e atividades de lazer', type: 'textarea' },
      { key: 'medicacoes', label: 'Medicações em uso (nome e dose)', type: 'text' },
      { key: 'expectativas', label: 'O que espera da avaliação?', type: 'textarea' },
    ],
  },
  {
    id: 'rastreio-dsm5tr',
    title: 'Rastreio de sintomas (DSM-5-TR autorrelato)',
    description:
      'Avalie a intensidade dos sintomas nas últimas 2 semanas em uma escala de 0 (nunca) a 4 (quase todos os dias).',
    fields: [
      { key: 'humor_deprimido', label: 'Humor deprimido, tristeza ou desesperança', type: 'scale', min: 0, max: 4, required: true },
      { key: 'anedonia', label: 'Pouco interesse ou prazer nas atividades', type: 'scale', min: 0, max: 4, required: true },
      { key: 'ansiedade', label: 'Ansiedade, preocupação excessiva ou tensão', type: 'scale', min: 0, max: 4, required: true },
      { key: 'panico', label: 'Ataques de pânico ou medo intenso repentino', type: 'scale', min: 0, max: 4 },
      { key: 'sono', label: 'Dificuldade para dormir ou dormir demais', type: 'scale', min: 0, max: 4 },
      { key: 'apetite', label: 'Mudança significativa de apetite ou peso', type: 'scale', min: 0, max: 4 },
      { key: 'concentracao', label: 'Dificuldade de concentração ou memória', type: 'scale', min: 0, max: 4 },
      { key: 'irritabilidade', label: 'Irritabilidade ou explosões de raiva', type: 'scale', min: 0, max: 4 },
      { key: 'isolamento', label: 'Isolamento social ou evitação de pessoas', type: 'scale', min: 0, max: 4 },
      { key: 'ideacao', label: 'Pensamentos de morte ou de se machucar', type: 'scale', min: 0, max: 4 },
      { key: 'observacoes', label: 'Observações adicionais', type: 'textarea' },
    ],
  },
  {
    id: 'escala-generica',
    title: 'Escala genérica de sintomas',
    description: 'Escala breve de autorrelato de funcionamento cotidiano.',
    fields: [
      { key: 'sono_qualidade', label: 'Como avalia a qualidade do seu sono?', type: 'choice', options: ['Ótima', 'Boa', 'Regular', 'Ruim', 'Péssima'], required: true },
      { key: 'energia', label: 'Nível de energia no dia a dia (0-10)', type: 'number', min: 0, max: 10 },
      { key: 'humor', label: 'Humor predominante na última semana', type: 'choice', options: ['Muito bom', 'Bom', 'Neutro', 'Baixo', 'Muito baixo'] },
      { key: 'estresse', label: 'Nível de estresse percebido (0-10)', type: 'number', min: 0, max: 10 },
      { key: 'funcionamento_trabalho', label: 'Impacto dos sintomas no trabalho/estudos', type: 'choice', options: ['Nenhum', 'Leve', 'Moderado', 'Grave'] },
      { key: 'funcionamento_social', label: 'Impacto dos sintomas nas relações sociais', type: 'choice', options: ['Nenhum', 'Leve', 'Moderado', 'Grave'] },
      { key: 'comentarios', label: 'Comentários livres', type: 'textarea' },
    ],
  },
]

export const templateById = (id: string) => formTemplates.find((t) => t.id === id)
