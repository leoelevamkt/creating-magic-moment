import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const LaudoInput = z.object({
  patientId: z.string().uuid(),
  // Identificação
  psychologist: z.string().optional().nullable(),
  crp: z.string().optional().nullable(),
  solicitante: z.string().optional().nullable(),
  finalidade: z.string().optional().nullable(),
  local_avaliacao: z.string().optional().nullable(),
  periodo: z.string().optional().nullable(),
  num_encontros: z.string().optional().nullable(),
  // Seções
  demand: z.string().optional().nullable(),
  procedures: z.string().optional().nullable(),
  instrumentos_aplicados: z.string().optional().nullable(),
  instrumentos_complementares: z.string().optional().nullable(),
  entrevista_terceiros: z.string().optional().nullable(),
  analise_anamnese: z.string().optional().nullable(),
  analise_intelectiva: z.string().optional().nullable(),
  analise_atencao: z.string().optional().nullable(),
  analise_memoria: z.string().optional().nullable(),
  analise_linguagem: z.string().optional().nullable(),
  analise_velocidade: z.string().optional().nullable(),
  analise_visuoespacial: z.string().optional().nullable(),
  analise_emocional: z.string().optional().nullable(),
  analise_personalidade: z.string().optional().nullable(),
  analise_habilidades_sociais: z.string().optional().nullable(),
  analise_responsividade: z.string().optional().nullable(),
  analise_criatividade: z.string().optional().nullable(),
  sintese: z.string().optional().nullable(),
  hypotheses: z.string().optional().nullable(),
  recommendations: z.string().optional().nullable(),
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
    const prompt = `Você é uma psicóloga clínica brasileira especializada em avaliação neuropsicológica. Gere um rascunho de LAUDO PSICOLÓGICO DE AVALIAÇÃO NEUROPSICOLÓGICA em português, no estilo formal e técnico brasileiro, alinhado à Resolução CFP 06/2019 e DSM-5-TR / CID-11.

Use linguagem técnica, parágrafos bem elaborados, e integre os dados do paciente, anamnese, triagem DSM-5-TR e resultados aprovados de testes.

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
  "demand": "Descrição da demanda em 1-2 parágrafos (queixa, motivo do encaminhamento, objetivos).",
  "procedures": "Descrição geral dos procedimentos, período de avaliação, número de encontros.",
  "instrumentos_aplicados": "Lista formatada em bullets (- **NOME (SIGLA)** (Autor, ano). Objetivo: ...) dos testes psicológicos aplicados.",
  "instrumentos_complementares": "Instrumentos complementares aplicados (bullets), se houver.",
  "entrevista_terceiros": "Descrição de entrevistas/escalas com terceiros (pais, cônjuge, escola), se aplicável.",
  "analise_anamnese": "3-6 parágrafos analisando a história pessoal, familiar, escolar, ocupacional, emocional e funcionamento cotidiano do paciente.",
  "analise_intelectiva": "Análise do funcionamento intelectual e cognitivo com base nos resultados (WAIS/WISC/Raven, etc), em parágrafos.",
  "analise_atencao": "Análise das funções atencionais e executivas (BPA, FDT, TEACO, Torre de Londres, etc).",
  "analise_memoria": "Análise da memória e aprendizagem (RAVLT, dígitos, etc).",
  "analise_linguagem": "Análise do funcionamento da linguagem (vocabulário, compreensão, fluência).",
  "analise_velocidade": "Análise da velocidade de processamento.",
  "analise_visuoespacial": "Análise das funções visuoespaciais e visuoconstrutivas.",
  "analise_emocional": "Análise do funcionamento emocional (BDI, BAI, sintomas depressivos/ansiosos).",
  "analise_personalidade": "Análise da personalidade (BFP, Pfister, etc).",
  "analise_habilidades_sociais": "Análise do repertório de habilidades sociais (IHS-2).",
  "analise_responsividade": "Análise da responsividade social e traços do espectro autista (SRS-2, CAT-Q, EQ).",
  "analise_criatividade": "Análise da criatividade, se avaliada (TCF-AA).",
  "sintese": "Síntese integrativa dos achados em 3-5 parágrafos, articulando anamnese + testes + observações clínicas.",
  "hypotheses": "Hipóteses diagnósticas fundamentadas no DSM-5-TR/CID-11, no formato: 'os achados sustentam o diagnóstico de ***Transtorno X - código DSM-5-TR: XXX; CID-11: XXX***'. Cite comorbidades quando pertinente. Não afirme diagnóstico definitivo sem base.",
  "recommendations": "Encaminhamentos e orientações em bullets ou parágrafos: psicoterapia, avaliação psiquiátrica, apoio escolar/profissional, treinos específicos, orientações familiares."
}

Cada seção deve ter conteúdo real baseado nos dados. Se um domínio não foi avaliado, escreva "Não foi avaliado no presente processo." em vez de deixar vazio.`

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
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
      return JSON.parse(raw) as Partial<LaudoData>
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

    const calcAge = (birth: string | null | undefined) => {
      if (!birth) return '—'
      const b = new Date(birth)
      const diff = Date.now() - b.getTime()
      const age = Math.floor(diff / (365.25 * 24 * 3600 * 1000))
      return `${age} anos`
    }

    const h1 = (text: string) =>
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 320, after: 160 },
        children: [new TextRun({ text, bold: true, size: 28 })],
      })

    const h2 = (text: string) =>
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text, bold: true, size: 24 })],
      })

    const p = (text: string, opts?: { bold?: boolean }) =>
      new Paragraph({
        spacing: { after: 120 },
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: text || '—', size: 22, bold: opts?.bold })],
      })

    const paragraphsOf = (text?: string | null) =>
      (text || '—').split(/\n+/).filter(Boolean).map((line) => p(line))

    const kv = (label: string, value: string) =>
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: `${label}: `, bold: true, size: 22 }),
          new TextRun({ text: value || '—', size: 22 }),
        ],
      })

    // Instrumentos: se não vier da IA, monta a partir das tasks aprovadas
    const instrumentosAuto =
      data.instrumentos_aplicados ||
      (ctx.tasks.length
        ? ctx.tasks
            .map((t) => {
              const tc = t.test_catalog as { acronym: string | null; name: string | null } | null
              return `- ${tc?.acronym ?? '—'} — ${tc?.name ?? ''}`
            })
            .join('\n')
        : 'Nenhum instrumento aplicado registrado.')

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
              size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          children: [
            new Paragraph({
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 320 },
              children: [
                new TextRun({
                  text: 'LAUDO PSICOLÓGICO DE AVALIAÇÃO NEUROPSICOLÓGICA',
                  bold: true,
                  size: 32,
                }),
              ],
            }),

            h1('1. IDENTIFICAÇÃO'),
            kv('Psicóloga responsável', `${data.psychologist || ctx.psychologistName || '—'} (CRP ${data.crp || '—'})`),
            kv('Solicitante', data.solicitante || '—'),
            kv('Finalidade', data.finalidade || 'Investigação de transtornos do neurodesenvolvimento e funções cognitivas'),
            kv('Local da avaliação', data.local_avaliacao || '—'),
            new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: 'Dados de identificação:', bold: true, size: 22 })] }),
            kv('Nome', patient.name ?? '—'),
            kv('CPF', patient.cpf ?? '—'),
            kv('Data de nascimento', patient.birth_date ?? '—'),
            kv('Idade', calcAge(patient.birth_date)),
            kv('Escolaridade', patient.schooling ?? '—'),
            kv('Cidade', patient.city ?? '—'),
            kv('Data do laudo', today),

            h1('2. DESCRIÇÃO DA DEMANDA'),
            ...paragraphsOf(data.demand),

            h1('3. PROCEDIMENTOS'),
            ...paragraphsOf(data.procedures),
            data.periodo ? kv('Período', data.periodo) : new Paragraph({ children: [] }),
            data.num_encontros ? kv('Número de encontros', data.num_encontros) : new Paragraph({ children: [] }),
            h2('3.1. Instrumentos psicológicos aplicados'),
            ...paragraphsOf(instrumentosAuto),
            h2('3.2. Instrumentos complementares'),
            ...paragraphsOf(data.instrumentos_complementares),
            h2('3.3. Entrevistas e escalas com terceiros'),
            ...paragraphsOf(data.entrevista_terceiros),

            h1('4. ANÁLISE'),
            h2('4.1. Análise da anamnese e entrevistas'),
            ...paragraphsOf(data.analise_anamnese),
            h2('4.2. Área intelectiva'),
            ...paragraphsOf(data.analise_intelectiva),
            h2('4.3. Atenção e funções executivas'),
            ...paragraphsOf(data.analise_atencao),
            h2('4.4. Memória e aprendizagem'),
            ...paragraphsOf(data.analise_memoria),
            h2('4.5. Linguagem'),
            ...paragraphsOf(data.analise_linguagem),
            h2('4.6. Velocidade de processamento'),
            ...paragraphsOf(data.analise_velocidade),
            h2('4.7. Funções visuoespaciais e visuoconstrutivas'),
            ...paragraphsOf(data.analise_visuoespacial),
            h2('4.8. Funcionamento emocional'),
            ...paragraphsOf(data.analise_emocional),
            h2('4.9. Personalidade'),
            ...paragraphsOf(data.analise_personalidade),
            h2('4.10. Habilidades sociais'),
            ...paragraphsOf(data.analise_habilidades_sociais),
            h2('4.11. Responsividade social'),
            ...paragraphsOf(data.analise_responsividade),
            h2('4.12. Criatividade'),
            ...paragraphsOf(data.analise_criatividade),

            h1('5. SÍNTESE INTEGRATIVA'),
            ...paragraphsOf(data.sintese),

            h1('6. HIPÓTESES DIAGNÓSTICAS'),
            ...paragraphsOf(data.hypotheses),

            h1('7. ENCAMINHAMENTOS E RECOMENDAÇÕES'),
            ...paragraphsOf(data.recommendations),

            new Paragraph({ spacing: { before: 640 }, children: [new TextRun({ text: '' })] }),
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
    const filename = `laudo-${(patient.name ?? 'paciente').replace(/[^a-zA-Z0-9]+/g, '_')}-${today.replace(/\//g, '-')}.docx`
    return { base64, filename }
  })
