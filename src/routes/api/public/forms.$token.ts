import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const jsonHeaders = { 'Content-Type': 'application/json' }

const SubmitBody = z.object({
  responses: z.record(z.string(), z.any()),
})

/** Constrói o payload de INSERT em `patients` a partir das respostas de um pré-cadastro. */
function buildPatientFromResponses(
  responses: Record<string, unknown>,
  createdBy: string,
): Record<string, unknown> | null {
  const s = (k: string) => {
    const v = responses[k]
    if (v === undefined || v === null) return null
    const str = String(v).trim()
    return str.length > 0 ? str : null
  }

  const name = s('p_nome')
  if (!name) return null

  const enderecoParts = [
    s('p_rua') && `${s('p_rua')}${s('p_numero') ? `, ${s('p_numero')}` : ''}`,
    s('p_complemento'),
    s('p_bairro'),
    s('p_cep') && `CEP ${s('p_cep')}`,
    s('p_uf'),
  ].filter(Boolean)

  const guardians: Array<Record<string, string>> = []
  for (const i of [1, 2]) {
    const nome = s(`r${i}_nome`)
    if (!nome) continue
    guardians.push({
      name: nome,
      relationship: s(`r${i}_parentesco`) ?? '',
      cpf: s(`r${i}_cpf`) ?? '',
      phone: s(`r${i}_telefone`) ?? '',
      profession: s(`r${i}_profissao`) ?? '',
    })
  }

  const asList = (k: string): string[] => {
    const v = responses[k]
    if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean)
    return []
  }

  const checklistBlocks: Array<[string, string[]]> = [
    ['Atenção', asList('dif_atencao')],
    ['Comportamento', asList('dif_comportamento')],
    ['Aprendizagem', asList('dif_aprendizagem')],
    ['Social/comunicação', asList('dif_social')],
    ['Sensorial', asList('dif_sensorial')],
    ['Sono/rotina', asList('dif_sono')],
  ].filter(([, arr]) => arr.length > 0) as Array<[string, string[]]>

  const notesBlocks: string[] = []
  notesBlocks.push('— Pré-cadastro recebido pelo formulário público —')
  if (enderecoParts.length) notesBlocks.push(`Endereço: ${enderecoParts.join(' — ')}`)
  if (s('p_email')) notesBlocks.push(`E-mail: ${s('p_email')}`)
  if (s('p_rg')) notesBlocks.push(`RG: ${s('p_rg')}`)
  if (s('foi_encaminhado')) {
    const enc = [s('encaminhado_por_tipo'), s('encaminhado_por_nome')].filter(Boolean).join(' — ')
    notesBlocks.push(`Encaminhamento: ${s('foi_encaminhado')}${enc ? ` (${enc})` : ''}`)
  }
  const acomp = asList('faz_acompanhamento')
  if (acomp.length) notesBlocks.push(`Acompanhamentos: ${acomp.join(', ')}`)
  if (s('acompanhamento_detalhes')) notesBlocks.push(`Detalhes: ${s('acompanhamento_detalhes')}`)
  if (checklistBlocks.length) {
    notesBlocks.push('')
    notesBlocks.push('Dificuldades observadas:')
    for (const [label, items] of checklistBlocks) {
      notesBlocks.push(`• ${label}: ${items.join('; ')}`)
    }
  }
  if (s('observacoes')) {
    notesBlocks.push('')
    notesBlocks.push(`Observações: ${s('observacoes')}`)
  }

  const birth = s('p_data_nascimento') // <input type="date"> → YYYY-MM-DD
  const medsList = s('medicacoes_lista')
  const takesMeds = s('toma_medicacao')

  return {
    name,
    birth_date: birth,
    cpf: s('p_cpf'),
    phone: s('p_telefone'),
    sex: s('p_sexo'),
    city: s('p_cidade'),
    hypotheses: s('queixa_principal'),
    medications: takesMeds === 'Sim' ? medsList ?? 'Sim (sem detalhes)' : null,
    guardians: guardians as unknown,
    has_guardians: guardians.length > 0,
    notes: notesBlocks.join('\n'),
    created_by: createdBy,
  }
}

export const Route = createFileRoute('/api/public/forms/$token')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { data, error } = await (supabaseAdmin as any)
          .from('patient_forms')
          .select('id, title, description, fields, status, expires_at')
          .eq('token', params.token)
          .maybeSingle()
        if (error) return new Response(error.message, { status: 500 })
        if (!data) return new Response('Formulário não encontrado.', { status: 404 })
        if (data.status !== 'pending')
          return new Response(JSON.stringify({ status: data.status }), {
            status: 410,
            headers: jsonHeaders,
          })
        if (data.expires_at && new Date(data.expires_at).getTime() < Date.now())
          return new Response('Formulário expirado.', { status: 410 })
        return new Response(
          JSON.stringify({
            title: data.title,
            description: data.description,
            fields: data.fields,
          }),
          { headers: jsonHeaders },
        )
      },
      POST: async ({ params, request }) => {
        let body: unknown
        try {
          body = await request.json()
        } catch {
          return new Response('JSON inválido.', { status: 400 })
        }
        const parsed = SubmitBody.safeParse(body)
        if (!parsed.success)
          return new Response('Respostas inválidas.', { status: 400 })

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { data: form, error: e1 } = await (supabaseAdmin as any)
          .from('patient_forms')
          .select('id, status, expires_at, patient_id, title, created_by, fields')
          .eq('token', params.token)
          .maybeSingle()
        if (e1) return new Response(e1.message, { status: 500 })
        if (!form) return new Response('Formulário não encontrado.', { status: 404 })
        if (form.status !== 'pending')
          return new Response('Este formulário já foi respondido.', { status: 410 })
        if (form.expires_at && new Date(form.expires_at).getTime() < Date.now())
          return new Response('Formulário expirado.', { status: 410 })

        // Pré-cadastro: cria o paciente antes de marcar como submetido.
        let patientId: string | null = form.patient_id
        if (!patientId) {
          if (!form.created_by) {
            return new Response(
              'Formulário sem profissional associado — não é possível criar paciente.',
              { status: 500 },
            )
          }
          const patientPayload = buildPatientFromResponses(
            parsed.data.responses,
            form.created_by as string,
          )
          if (!patientPayload) {
            return new Response(
              'É obrigatório informar ao menos o nome do paciente.',
              { status: 400 },
            )
          }
          const { data: newPatient, error: eIns } = await (supabaseAdmin as any)
            .from('patients')
            .insert(patientPayload)
            .select('id')
            .single()
          if (eIns) return new Response(eIns.message, { status: 500 })
          patientId = newPatient.id as string
        }


        const { error: e2 } = await (supabaseAdmin as any)
          .from('patient_forms')
          .update({
            responses: parsed.data.responses,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            patient_id: patientId,
          })
          .eq('id', form.id)
        if (e2) return new Response(e2.message, { status: 500 })

        return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders })
      },
    },
  },
})
