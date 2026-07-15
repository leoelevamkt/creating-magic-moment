import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const LaudoInput = z.object({
  patientId: z.string().uuid(),
  demand: z.string().optional().nullable(),
  procedures: z.string().optional().nullable(),
  results: z.string().optional().nullable(),
  hypotheses: z.string().optional().nullable(),
  conclusion: z.string().optional().nullable(),
  recommendations: z.string().optional().nullable(),
  psychologist: z.string().optional().nullable(),
  crp: z.string().optional().nullable(),
})

export type LaudoData = z.infer<typeof LaudoInput>

export const getLaudoContext = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { patientId: string }) => i)
  .handler(async ({ context, data }) => {
    const [patient, anamnese, screenings, tasks, profile] = await Promise.all([
      context.supabase
        .from('patients')
        .select('id, name, birth_date, cpf, schooling, city, hypotheses, notes')
        .eq('id', data.patientId)
        .maybeSingle(),
      context.supabase.from('anamneses').select('*').eq('patient_id', data.patientId).maybeSingle(),
      context.supabase
        .from('screenings')
        .select('id, instrument, domain, score, ai_analysis, notes, criteria')
        .eq('patient_id', data.patientId),
      context.supabase
        .from('test_tasks')
        .select(
          'id, status, raw_score, standard_score, classification, synthesis, correction_notes, test_catalog(acronym, name, category)',
        )
        .eq('patient_id', data.patientId)
        .eq('status', 'approved'),
      context.supabase.from('profiles').select('name').eq('id', context.userId).maybeSingle(),
    ])
    if (patient.error) throw new Error(patient.error.message)
    return {
      patient: patient.data,
      anamnese: anamnese.data,
      screenings: screenings.data ?? [],
      tasks: tasks.data ?? [],
      psychologistName: profile.data?.name ?? '',
    }
  })

export const generateLaudoDraft = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { patientId: string }) => i)
  .handler(async ({ context, data }) => {
    const key = process.env.LOVABLE_API_KEY
    if (!key) throw new Error('Lovable AI Gateway não configurado.')

    const ctx = await getLaudoContext({ data: { patientId: data.patientId } })
    const prompt = `Você é uma psicóloga clínica brasileira. Gere um rascunho de laudo psicológico em português, alinhado à Resolução CFP 06/2019 (identificação, demanda, procedimentos, análise, conclusão, encaminhamentos).

DADOS DO PACIENTE:
${JSON.stringify(ctx.patient, null, 2)}

ANAMNESE:
${JSON.stringify(ctx.anamnese, null, 2)}

TRIAGEM DSM-5-TR:
${JSON.stringify(ctx.screenings, null, 2)}

RESULTADOS DE TESTES APROVADOS:
${JSON.stringify(ctx.tasks, null, 2)}

Devolva JSON estrito no formato:
{
  "demand": "descrição da demanda/queixa em 1 parágrafo",
  "procedures": "descrição dos instrumentos e procedimentos aplicados",
  "results": "análise integrada dos resultados dos testes e triagem, em parágrafos",
  "hypotheses": "hipóteses diagnósticas fundamentadas (sem afirmar diagnóstico definitivo)",
  "conclusion": "conclusão técnica",
  "recommendations": "encaminhamentos e orientações"
}`

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`IA falhou [${res.status}]: ${t}`)
    }
    const j = await res.json()
    const raw = j.choices?.[0]?.message?.content ?? '{}'
    try {
      return JSON.parse(raw) as LaudoData
    } catch {
      throw new Error('Resposta inválida da IA.')
    }
  })

export const generateLaudoDocx = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => LaudoInput.parse(i))
  .handler(async ({ data }) => {
    const {
      Document,
      Packer,
      Paragraph,
      TextRun,
      HeadingLevel,
      AlignmentType,
      PageOrientation,
    } = await import('docx')

    const ctx = await getLaudoContext({ data: { patientId: data.patientId } })
    const patient = ctx.patient!
    const today = new Date().toLocaleDateString('pt-BR')

    const h = (text: string) =>
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text, bold: true, size: 26 })],
      })

    const p = (text: string) =>
      new Paragraph({
        spacing: { after: 120 },
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: text || '—', size: 22 })],
      })

    const paragraphsOf = (text?: string | null) =>
      (text || '—').split(/\n+/).map((line) => p(line))

    const identificacao = [
      p(`Nome: ${patient.name}`),
      p(`Data de nascimento: ${patient.birth_date}`),
      p(`CPF: ${patient.cpf}`),
      p(`Escolaridade: ${patient.schooling}`),
      p(`Cidade: ${patient.city}`),
      p(`Data do laudo: ${today}`),
    ]

    const testTable = ctx.tasks.length
      ? ctx.tasks
          .map((t) => {
            const tc = t.test_catalog as { acronym: string | null; name: string | null } | null
            const parts = [
              `${tc?.acronym ?? '—'} — ${tc?.name ?? ''}`,
              t.raw_score ? `Bruto: ${t.raw_score}` : null,
              t.standard_score ? `Padrão: ${t.standard_score}` : null,
              t.classification ? `Classificação: ${t.classification}` : null,
            ]
              .filter(Boolean)
              .join(' | ')
            const synth = t.synthesis ? `\n${t.synthesis}` : ''
            return `${parts}${synth}`
          })
          .flatMap((line) => paragraphsOf(line))
      : [p('Nenhum resultado aprovado registrado.')]

    const doc = new Document({
      creator: 'NeuroFlux',
      title: `Laudo — ${patient.name}`,
      styles: {
        default: { document: { run: { font: 'Arial', size: 22 } } },
      },
      sections: [
        {
          properties: {
            page: {
              size: {
                width: 12240,
                height: 15840,
                orientation: PageOrientation.PORTRAIT,
              },
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          children: [
            new Paragraph({
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 240 },
              children: [new TextRun({ text: 'LAUDO PSICOLÓGICO', bold: true, size: 32 })],
            }),
            h('1. Identificação'),
            ...identificacao,
            h('2. Demanda'),
            ...paragraphsOf(data.demand),
            h('3. Procedimentos'),
            ...paragraphsOf(data.procedures),
            h('4. Instrumentos aplicados e resultados'),
            ...testTable,
            h('5. Análise dos resultados'),
            ...paragraphsOf(data.results),
            h('6. Hipóteses diagnósticas'),
            ...paragraphsOf(data.hypotheses),
            h('7. Conclusão'),
            ...paragraphsOf(data.conclusion),
            h('8. Encaminhamentos e orientações'),
            ...paragraphsOf(data.recommendations),
            new Paragraph({ spacing: { before: 480 }, children: [new TextRun({ text: '' })] }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: '_______________________________________' })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `${data.psychologist || ctx.psychologistName || 'Psicóloga responsável'}`,
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `CRP ${data.crp || '—'}` })],
            }),
          ],
        },
      ],
    })

    const buf = await Packer.toBuffer(doc)
    const base64 = Buffer.from(buf).toString('base64')
    const filename = `laudo-${patient.name.replace(/[^a-zA-Z0-9]+/g, '_')}-${today.replace(/\//g, '-')}.docx`
    return { base64, filename }
  })
