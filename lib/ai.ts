import 'server-only'
import { generateText, Output } from 'ai'
import { z } from 'zod'

const MODEL = 'openai/gpt-4o-mini'

const DISCLAIMER =
  'Texto gerado por IA como apoio à redação. Requer revisão, validação e responsabilidade técnica da psicóloga.'

export type TestResultInput = {
  testName: string
  acronym?: string | null
  category: string
  rawScore?: string | null
  standardScore?: string | null
  classification?: string | null
}

export type PatientContext = {
  name: string
  age: number
  schooling: string
  hypotheses?: string | null
}

// Gera (ou completa) a classificação e a síntese interpretativa de UM teste.
export async function generateTestSynthesis(patient: PatientContext, result: TestResultInput) {
  const hasClassification = Boolean(result.classification?.trim())
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({
      schema: z.object({
        classification: z
          .string()
          .describe('Classificação qualitativa do desempenho (ex.: Médio, Médio inferior, Superior). Se já fornecida, mantenha-a.'),
        synthesis: z
          .string()
          .describe('Síntese interpretativa em português, 2 a 4 frases, técnica e cautelosa, sem diagnóstico fechado.'),
      }),
    }),
    system:
      'Você é assistente de redação para psicólogas que fazem avaliação neuropsicológica no Brasil. ' +
      'Escreva em português técnico, claro e cauteloso. Nunca invente escores. Não feche diagnóstico. ' +
      'Baseie-se apenas nos dados fornecidos e no funcionamento cognitivo geral do instrumento. ' +
      'Descreva o construto avaliado e o que o desempenho sugere, indicando quando os dados são insuficientes.',
    prompt:
      `Paciente: ${patient.name}, ${patient.age} anos, escolaridade: ${patient.schooling}.\n` +
      (patient.hypotheses ? `Hipóteses/queixa: ${patient.hypotheses}.\n` : '') +
      `Teste aplicado: ${result.testName}${result.acronym ? ` (${result.acronym})` : ''} — domínio: ${result.category}.\n` +
      `Escore bruto: ${result.rawScore || 'não informado'}.\n` +
      `Escore padronizado/percentil: ${result.standardScore || 'não informado'}.\n` +
      (hasClassification
        ? `Classificação já definida pela psicóloga: "${result.classification}". Mantenha exatamente essa classificação e gere apenas a síntese.`
        : 'Classificação ainda não definida: proponha uma classificação qualitativa coerente com os escores informados e gere a síntese.'),
  })
  return { ...output, disclaimer: DISCLAIMER }
}

// Integra os resultados de todos os testes em uma síntese diagnóstica geral.
export async function generateEvaluationSynthesis(
  patient: PatientContext,
  results: Array<TestResultInput & { synthesis?: string | null }>,
) {
  const block = results
    .map(
      (r, i) =>
        `${i + 1}. ${r.testName}${r.acronym ? ` (${r.acronym})` : ''} [${r.category}] — bruto: ${r.rawScore || 'n/i'}; padronizado: ${r.standardScore || 'n/i'}; classificação: ${r.classification || 'n/i'}.` +
        (r.synthesis ? ` Síntese: ${r.synthesis}` : ''),
    )
    .join('\n')
  const { text } = await generateText({
    model: MODEL,
    system:
      'Você é assistente de redação para psicólogas que fazem avaliação neuropsicológica no Brasil. ' +
      'Escreva uma síntese integradora em português técnico, organizada por domínios cognitivos (atenção, memória, funções executivas, linguagem, etc.), ' +
      'relacionando os achados às hipóteses. Seja cauteloso, não feche diagnóstico e destaque a necessidade de integração clínica. ' +
      'Use parágrafos curtos. Ao final, inclua uma frase de recomendações gerais.',
    prompt:
      `Paciente: ${patient.name}, ${patient.age} anos, escolaridade: ${patient.schooling}.\n` +
      (patient.hypotheses ? `Hipóteses/queixa: ${patient.hypotheses}.\n` : '') +
      `Resultados dos testes:\n${block}\n\nGere a síntese integradora.`,
  })
  return { synthesis: text, disclaimer: DISCLAIMER }
}
