import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { RATE_LIMITS, enforceRateLimit } from '@/lib/rate-limit.server'
import { getRequest } from '@tanstack/react-start/server'
import watermarkAsset from '@/assets/laudo/watermark.png.asset.json'
import signatureAsset from '@/assets/laudo/signature.png.asset.json'

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

// Endereço / contato exibidos no rodapé (mesmo modelo do laudo enviado)
const FOOTER_ADDRESS =
  "Av. Assis Brasil, n° 2827, sala 1502 A, Bairro Passo D'Areia, Porto Alegre/RS | Telefone: (51) 98309.6917 | psigabrielamayerle@gmail.com"
const FOOTER_DISCLAIMER =
  '"Estes resultados são de conteúdo sigiloso e devem ser utilizados somente por profissionais envolvidos no manejo psicológico, psiquiátrico e clínico deste paciente. Caso o uso deste material venha a ser feito, é de inteira responsabilidade do requerente".'

// Cor do tema (rosa suave da marca)
const BRAND_PINK = 'C9899A'
const BRAND_PINK_DARK = 'A96676'

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
    await enforceRateLimit(RATE_LIMITS.aiReport, `user:${context.userId}`)
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

Devolva JSON estrito com os campos: demand, procedures, instrumentos_aplicados, instrumentos_complementares, entrevista_terceiros, analise_anamnese, analise_intelectiva, analise_atencao, analise_memoria, analise_linguagem, analise_velocidade, analise_visuoespacial, analise_emocional, analise_personalidade, analise_habilidades_sociais, analise_responsividade, analise_criatividade, sintese, hypotheses, recommendations. Cada seção com conteúdo real. Se um domínio não foi avaliado, escreva "Não foi avaliado no presente processo.".`

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

// Fetches a binary asset from same origin (works on Cloudflare Workers).
async function fetchAssetBuffer(pathOrUrl: string): Promise<Uint8Array | null> {
  try {
    let url = pathOrUrl
    if (url.startsWith('/')) {
      const req = getRequest()
      const origin = new URL(req.url).origin
      url = `${origin}${pathOrUrl}`
    }
    const r = await fetch(url)
    if (!r.ok) return null
    return new Uint8Array(await r.arrayBuffer())
  } catch {
    return null
  }
}

// Generate PNG chart via QuickChart (Chart.js) — real data from approved tests.
async function generateScoresChart(
  tasks: Array<{
    standard_score: string | null
    test_catalog: { acronym: string | null; name: string | null } | null
  }>,
): Promise<Uint8Array | null> {
  const rows = tasks
    .map((t) => {
      const raw = (t.standard_score ?? '').replace(',', '.')
      const num = Number(raw)
      const acr = t.test_catalog?.acronym ?? t.test_catalog?.name ?? ''
      return Number.isFinite(num) && acr ? { label: acr, value: num } : null
    })
    .filter((x): x is { label: string; value: number } => !!x)
  if (rows.length === 0) return null

  const config = {
    type: 'bar',
    data: {
      labels: rows.map((r) => r.label),
      datasets: [
        {
          label: 'Escore padronizado',
          data: rows.map((r) => r.value),
          backgroundColor: `#${BRAND_PINK}`,
          borderColor: `#${BRAND_PINK_DARK}`,
          borderWidth: 1,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Perfil de desempenho — escores padronizados',
          font: { size: 16, family: 'Calibri' },
          color: '#333',
        },
        legend: { display: false },
        annotation: {
          annotations: {
            band: {
              type: 'box',
              yMin: 90,
              yMax: 110,
              backgroundColor: 'rgba(201, 137, 154, 0.10)',
              borderWidth: 0,
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 140,
          title: { display: true, text: 'Escore padronizado', color: '#555' },
          grid: { color: '#EEE' },
        },
        x: { ticks: { autoSkip: false, maxRotation: 60, minRotation: 45 } },
      },
    },
  }

  try {
    const r = await fetch('https://quickchart.io/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chart: config,
        width: 900,
        height: 500,
        devicePixelRatio: 2,
        backgroundColor: 'white',
        format: 'png',
      }),
    })
    if (!r.ok) return null
    return new Uint8Array(await r.arrayBuffer())
  } catch {
    return null
  }
}

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
      Header,
      Footer,
      ImageRun,
      PageNumber,
      BorderStyle,
      HorizontalPositionRelativeFrom,
      HorizontalPositionAlign,
      VerticalPositionRelativeFrom,
      VerticalPositionAlign,
      TextWrappingType,
    } = (await import('docx')) as typeof import('docx')

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

    // Carregar em paralelo: marca d'água, assinatura, gráfico
    const [watermarkBuf, signatureBuf, chartBuf] = await Promise.all([
      fetchAssetBuffer(watermarkAsset.url),
      fetchAssetBuffer(signatureAsset.url),
      generateScoresChart(ctx.tasks),
    ])

    const h1 = (text: string) =>
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 320, after: 160 },
        children: [new TextRun({ text, bold: true, size: 26, color: BRAND_PINK_DARK, font: 'Calibri' })],
      })

    const h2 = (text: string) =>
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text, bold: true, size: 24, color: BRAND_PINK_DARK, font: 'Calibri' })],
      })

    const p = (text: string, opts?: { bold?: boolean }) =>
      new Paragraph({
        spacing: { after: 120, line: 300 },
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: text || '—', size: 22, bold: opts?.bold, font: 'Calibri' })],
      })

    const paragraphsOf = (text?: string | null) =>
      (text || '—')
        .split(/\n+/)
        .filter(Boolean)
        .map((line) => {
          // detect bullet lines
          const bullet = line.match(/^\s*[-•*]\s+(.*)$/)
          if (bullet) {
            return new Paragraph({
              spacing: { after: 80, line: 280 },
              bullet: { level: 0 },
              children: [new TextRun({ text: bullet[1], size: 22, font: 'Calibri' })],
            })
          }
          return p(line)
        })

    const kv = (label: string, value: string) =>
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: `${label}: `, bold: true, size: 22, font: 'Calibri' }),
          new TextRun({ text: value || '—', size: 22, font: 'Calibri' }),
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

    // Marca d'água (imagem flutuante atrás do texto, centralizada na página)
    const watermarkParagraph = watermarkBuf
      ? new Paragraph({
          children: [
            new ImageRun({
              type: 'png',
              data: watermarkBuf,
              transformation: { width: 420, height: 594 },
              floating: {
                horizontalPosition: {
                  relative: HorizontalPositionRelativeFrom.PAGE,
                  align: HorizontalPositionAlign.CENTER,
                },
                verticalPosition: {
                  relative: VerticalPositionRelativeFrom.PAGE,
                  align: VerticalPositionAlign.CENTER,
                },
                behindDocument: true,
                wrap: { type: TextWrappingType.NONE },
              },
            }),
          ],
        })
      : new Paragraph({ children: [] })

    const footerParagraphs = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: BRAND_PINK, space: 4 } },
        spacing: { before: 60, after: 40 },
        children: [new TextRun({ text: FOOTER_ADDRESS, size: 16, font: 'Calibri', color: '555555' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [new TextRun({ text: FOOTER_DISCLAIMER, italics: true, size: 16, font: 'Calibri', color: '666666' })],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: 'Página ', size: 16, font: 'Calibri', color: '555555' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Calibri', color: '555555' }),
          new TextRun({ text: ' de ', size: 16, font: 'Calibri', color: '555555' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: 'Calibri', color: '555555' }),
        ],
      }),
    ]

    const analysisChildren: Array<InstanceType<typeof Paragraph>> = [
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
    ]

    const chartBlock: Array<InstanceType<typeof Paragraph>> = chartBuf
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 120 },
            children: [
              new ImageRun({
                type: 'png',
                data: chartBuf,
                transformation: { width: 560, height: 311 },
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: 'Gráfico 1 — Perfil de desempenho nos testes aprovados (escore padronizado).',
                italics: true,
                size: 18,
                font: 'Calibri',
                color: '555555',
              }),
            ],
          }),
        ]
      : []

    const signatureBlock: Array<InstanceType<typeof Paragraph>> = [
      new Paragraph({ spacing: { before: 640 }, children: [new TextRun({ text: '' })] }),
      ...(signatureBuf
        ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  type: 'png',
                  data: signatureBuf,
                  transformation: { width: 260, height: 180 },
                }),
              ],
            }),
          ]
        : [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: '_______________________________________', font: 'Calibri' })],
            }),
          ]),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: data.psychologist || ctx.psychologistName || 'Psicóloga responsável',
            bold: true,
            font: 'Calibri',
            size: 22,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `CRP ${data.crp || '—'}`, font: 'Calibri', size: 22 })],
      }),
    ]

    const doc = new Document({
      creator: 'NeuroFlux',
      title: `Laudo — ${patient.name}`,
      styles: {
        default: { document: { run: { font: 'Calibri', size: 22 } } },
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
              margin: { top: 1440, right: 1440, bottom: 1800, left: 1440 },
            },
          },
          headers: {
            default: new Header({ children: [watermarkParagraph] }),
          },
          footers: {
            default: new Footer({ children: footerParagraphs }),
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
                  size: 30,
                  font: 'Calibri',
                  color: BRAND_PINK_DARK,
                }),
              ],
            }),

            h1('1. IDENTIFICAÇÃO'),
            kv(
              'Psicóloga responsável',
              `${data.psychologist || ctx.psychologistName || '—'} (CRP ${data.crp || '—'})`,
            ),
            kv('Solicitante', data.solicitante || '—'),
            kv(
              'Finalidade',
              data.finalidade || 'Investigação de transtornos do neurodesenvolvimento e funções cognitivas',
            ),
            kv('Local da avaliação', data.local_avaliacao || '—'),
            new Paragraph({
              spacing: { before: 120, after: 80 },
              children: [new TextRun({ text: 'Dados de identificação:', bold: true, size: 22, font: 'Calibri' })],
            }),
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
            ...analysisChildren,
            ...chartBlock,

            h1('5. SÍNTESE INTEGRATIVA'),
            ...paragraphsOf(data.sintese),

            h1('6. HIPÓTESES DIAGNÓSTICAS'),
            ...paragraphsOf(data.hypotheses),

            h1('7. ENCAMINHAMENTOS E RECOMENDAÇÕES'),
            ...paragraphsOf(data.recommendations),

            ...signatureBlock,
          ],
        },
      ],
    })

    const buf = await Packer.toBuffer(doc)
    const base64 = Buffer.from(buf).toString('base64')
    const filename = `laudo-${(patient.name ?? 'paciente').replace(/[^a-zA-Z0-9]+/g, '_')}-${today.replace(/\//g, '-')}.docx`
    return { base64, filename }
  })
