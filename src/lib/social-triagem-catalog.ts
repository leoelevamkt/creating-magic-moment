// Triagem social — critérios de vulnerabilidade / proteção.
// Uso auxiliar para decisão de gratuidade e subsídio. Não é instrumento validado.

/** Salário mínimo nacional vigente (BRL). Ajuste anualmente. */
export const SALARIO_MINIMO_BRL = 1518

export type SocialItem = { code: string; label: string }
export type SocialSection = {
  id: string
  name: string
  help?: string
  items: SocialItem[]
}

export const SOCIAL_TRIAGEM_SECTIONS: SocialSection[] = [
  {
    id: 'vulnerabilidade',
    name: 'Fatores de vulnerabilidade',
    help: 'Marque os que se aplicam à família/paciente.',
    items: [
      { code: 'V1', label: 'Responsável único / monoparentalidade' },
      { code: 'V2', label: 'Desemprego ou informalidade sem renda estável' },
      { code: 'V3', label: 'Moradia cedida, alugada com atraso ou insegura' },
      { code: 'V4', label: 'Insegurança alimentar (falta ou restrição de alimentos)' },
      { code: 'V5', label: 'Endividamento significativo' },
      { code: 'V6', label: 'Baixa escolaridade dos responsáveis (< ensino médio)' },
      { code: 'V7', label: 'Cuidador com transtorno mental ou doença crônica' },
      { code: 'V8', label: 'Histórico de violência doméstica ou negligência' },
      { code: 'V9', label: 'Uso problemático de substâncias na família' },
      { code: 'V10', label: 'Território de alta vulnerabilidade (comunidade, área de risco)' },
      { code: 'V11', label: 'Barreira de acesso a saúde/educação (transporte, distância, filas)' },
      { code: 'V12', label: 'Membro com deficiência sem apoio adequado' },
    ],
  },
  {
    id: 'beneficios',
    name: 'Benefícios sociais em uso',
    items: [
      { code: 'B1', label: 'Bolsa Família / Auxílio Brasil' },
      { code: 'B2', label: 'BPC / LOAS' },
      { code: 'B3', label: 'Auxílio-doença / benefício por incapacidade' },
      { code: 'B4', label: 'Tarifa social de energia / água' },
      { code: 'B5', label: 'Acompanhamento CRAS / CREAS' },
      { code: 'B6', label: 'Vaga em escola pública / creche pública' },
      { code: 'B7', label: 'Atendimento SUS / CAPS' },
      { code: 'B8', label: 'Cadastro Único (CadÚnico) atualizado' },
    ],
  },
  {
    id: 'protetivos',
    name: 'Fatores protetivos',
    items: [
      { code: 'P1', label: 'Rede de apoio familiar presente' },
      { code: 'P2', label: 'Vínculo escolar estável' },
      { code: 'P3', label: 'Acompanhamento médico regular' },
      { code: 'P4', label: 'Adesão prévia a tratamento psicoterápico' },
      { code: 'P5', label: 'Responsáveis engajados na avaliação' },
      { code: 'P6', label: 'Participação comunitária ou religiosa protetiva' },
    ],
  },
]

/** Regras de faixa de renda per capita em salários mínimos. */
export type FaixaTarifa = 'gratuidade' | 'subsidio' | 'particular'

export function faixaTarifa(perCapitaSM: number): FaixaTarifa {
  if (perCapitaSM <= 1) return 'gratuidade'
  if (perCapitaSM <= 3) return 'subsidio'
  return 'particular'
}

export const FAIXA_LABELS: Record<FaixaTarifa, { label: string; badge: string; hint: string }> = {
  gratuidade: {
    label: 'Elegível a gratuidade',
    badge: 'Gratuidade',
    hint: 'Renda per capita ≤ 1 salário mínimo — priorizar atendimento gratuito ou parceria com serviço público.',
  },
  subsidio: {
    label: 'Elegível a subsídio',
    badge: 'Subsídio',
    hint: 'Renda per capita entre 1 e 3 salários mínimos — considerar tabela social / desconto.',
  },
  particular: {
    label: 'Fora da faixa social',
    badge: 'Particular',
    hint: 'Renda per capita acima de 3 salários mínimos — atendimento particular padrão.',
  },
}
