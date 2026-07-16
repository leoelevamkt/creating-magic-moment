import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { RATE_LIMITS, enforceRateLimit } from '@/lib/rate-limit.server'

const GuardianSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(4).max(40),
  relation: z.string().trim().min(1).max(60),
})
const EmergencyContactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(4).max(40),
  relation: z.string().trim().min(1).max(60),
})
export type Guardian = z.infer<typeof GuardianSchema>
export type EmergencyContact = z.infer<typeof EmergencyContactSchema>

const ProfessionalSchema = z.object({
  name: z.string().trim().min(2).max(120),
  role: z.string().trim().max(80).optional().nullable(),
  contact: z.string().trim().max(120).optional().nullable(),
})
export type Professional = z.infer<typeof ProfessionalSchema>

const CreateInput = z.object({
  name: z.string().min(2),
  sex: z.enum(['feminino', 'masculino', 'outro', 'nao_informado']).optional().nullable(),
  birthDate: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  schooling: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  medications: z.string().optional().nullable(),
  professionals: z.array(ProfessionalSchema).max(20).optional().default([]),
  assignedTo: z.string().uuid().optional().nullable(),
  hypotheses: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  hasGuardians: z.boolean().optional().default(false),
  guardians: z.array(GuardianSchema).max(10).optional().default([]),
  emergencyContact: EmergencyContactSchema.nullable().optional(),
})


export const listPatients = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('patients')
      .select('id, name, sex, birth_date, cpf, schooling, city, phone, medications, professionals, status, has_guardians, guardians, emergency_contact, created_at')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data ?? []
  })

export const createPatient = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateInput.parse(input))
  .handler(async ({ context, data }) => {
    const guardians = data.hasGuardians ? (data.guardians ?? []) : []
    const { error, data: row } = await context.supabase
      .from('patients')
      .insert({
        created_by: context.userId,
        name: data.name,
        sex: data.sex ?? null,
        birth_date: data.birthDate || null,
        cpf: data.cpf || null,
        schooling: data.schooling || null,
        city: data.city || null,
        phone: data.phone || null,
        medications: data.medications || null,
        professionals: data.professionals ?? [],
        hypotheses: data.hypotheses || null,
        notes: data.notes || null,
        has_guardians: !!data.hasGuardians,
        guardians,
        emergency_contact: data.emergencyContact ?? null,
        status: 'active',
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return { id: row!.id }
  })

const BulkInput = z.object({
  patients: z.array(CreateInput).min(1).max(500),
})
export const bulkCreatePatients = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BulkInput.parse(input))
  .handler(async ({ context, data }) => {
    const rows = data.patients.map((p) => ({
      created_by: context.userId,
      name: p.name,
      sex: p.sex ?? null,
      birth_date: p.birthDate || null,
      cpf: p.cpf || null,
      schooling: p.schooling || null,
      city: p.city || null,
      hypotheses: p.hypotheses || null,
      notes: p.notes || null,
      status: 'active' as const,
    }))
    const { error, data: inserted } = await context.supabase
      .from('patients')
      .insert(rows)
      .select('id')
    if (error) throw new Error(error.message)
    return { inserted: inserted?.length ?? 0 }
  })


export const patientStats = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [patients, evaluations, tasks] = await Promise.all([
      context.supabase.from('patients').select('id', { count: 'exact', head: true }),
      context.supabase.from('evaluations').select('id', { count: 'exact', head: true }),
      context.supabase.from('test_tasks').select('id', { count: 'exact', head: true }),
    ])
    return {
      patients: patients.count ?? 0,
      evaluations: evaluations.count ?? 0,
      tasks: tasks.count ?? 0,
    }
  })

export const getPatientDetail = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    const { data: patient, error } = await context.supabase
      .from('patients')
      .select('id, name, sex, birth_date, cpf, schooling, city, phone, medications, professionals, hypotheses, notes, overall_synthesis, status, has_guardians, guardians, emergency_contact, created_at')
      .eq('id', data.id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!patient) throw new Error('Paciente não encontrado.')

    const today = new Date().toISOString().slice(0, 10)
    const [sessionsRes, tasksRes, evalsRes] = await Promise.all([
      context.supabase
        .from('sessions_plan')
        .select('id, title, session_date, start_time, end_time, modality, status, objectives, notes, created_at, created_by')
        .eq('patient_id', data.id)
        .order('session_date', { ascending: true }),
      context.supabase
        .from('test_tasks')
        .select(
          'id, status, scheduled_at, started_at, completed_at, duration_minutes, correction_notes, raw_score, standard_score, classification, synthesis, admin_notes, approved_at, evaluation_id, test_id, test_catalog(acronym, name, category)',
        )
        .eq('patient_id', data.id)
        .order('scheduled_at', { ascending: false, nullsFirst: false }),
      context.supabase
        .from('evaluations')
        .select('id, title, modality, scheduled_at, status, synthesis, created_at')
        .eq('patient_id', data.id)
        .order('created_at', { ascending: false }),
    ])
    if (sessionsRes.error) throw new Error(sessionsRes.error.message)
    if (tasksRes.error) throw new Error(tasksRes.error.message)
    if (evalsRes.error) throw new Error(evalsRes.error.message)

    const sessions = sessionsRes.data ?? []
    const upcoming = sessions.filter((s) => s.session_date >= today && s.status !== 'cancelled')

    // history: derive from creations/approvals
    const actorIds = new Set<string>()
    sessions.forEach((s) => s.created_by && actorIds.add(s.created_by))
    let actors: Record<string, string> = {}
    if (actorIds.size > 0) {
      const { data: profs } = await context.supabase
        .from('profiles')
        .select('id, name')
        .in('id', Array.from(actorIds))
      actors = Object.fromEntries((profs ?? []).map((p) => [p.id, p.name]))
    }
    const history: Array<{ at: string; text: string }> = []
    sessions.forEach((s) =>
      history.push({
        at: s.created_at,
        text: `${actors[s.created_by] ?? 'Equipe'} agendou sessão em ${s.session_date}`,
      }),
    )
    ;(tasksRes.data ?? []).forEach((t) => {
      if (t.approved_at)
        history.push({
          at: t.approved_at,
          text: `Resultado aprovado (${(t.test_catalog as { acronym: string | null } | null)?.acronym ?? 'teste'})`,
        })
      else if (t.completed_at)
        history.push({
          at: t.completed_at,
          text: `Resultado registrado (${(t.test_catalog as { acronym: string | null } | null)?.acronym ?? 'teste'})`,
        })
    })
    history.sort((a, b) => (a.at < b.at ? 1 : -1))

    return {
      patient,
      upcoming,
      tasks: tasksRes.data ?? [],
      evaluations: evalsRes.data ?? [],
      history: history.slice(0, 20),
    }
  })

const UpdateTaskInput = z.object({
  id: z.string().uuid(),
  raw_score: z.string().optional().nullable(),
  standard_score: z.string().optional().nullable(),
  classification: z.string().optional().nullable(),
  correction_notes: z.string().optional().nullable(),
  synthesis: z.string().optional().nullable(),
  duration_minutes: z.number().int().nullable().optional(),
  markCompleted: z.boolean().optional(),
})

export const updateTaskResult = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpdateTaskInput.parse(i))
  .handler(async ({ context, data }) => {
    const patch: {
      raw_score: string | null
      standard_score: string | null
      classification: string | null
      correction_notes: string | null
      synthesis: string | null
      duration_minutes: number | null
      status?: 'review'
      completed_at?: string
    } = {
      raw_score: data.raw_score ?? null,
      standard_score: data.standard_score ?? null,
      classification: data.classification ?? null,
      correction_notes: data.correction_notes ?? null,
      synthesis: data.synthesis ?? null,
      duration_minutes: data.duration_minutes ?? null,
    }
    if (data.markCompleted) {
      patch.status = 'review'
      patch.completed_at = new Date().toISOString()
    }
    const { error } = await context.supabase.from('test_tasks').update(patch).eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const generateEvaluationSynthesis = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { evaluationId: string }) => i)
  .handler(async ({ context, data }) => {
    await enforceRateLimit(RATE_LIMITS.aiSynthesis, `user:${context.userId}`)
    const { data: ev, error } = await context.supabase
      .from('evaluations')
      .select('id, title, patient_id, patients(name, birth_date, schooling, hypotheses)')
      .eq('id', data.evaluationId)
      .maybeSingle()
    if (error || !ev) throw new Error(error?.message ?? 'Avaliação não encontrada.')
    const { data: tasks, error: tErr } = await context.supabase
      .from('test_tasks')
      .select('raw_score, standard_score, classification, synthesis, correction_notes, test_catalog(name, acronym, category)')
      .eq('evaluation_id', data.evaluationId)
    if (tErr) throw new Error(tErr.message)
    const withResults = (tasks ?? []).filter((t) => t.synthesis || t.raw_score || t.standard_score || t.classification)
    if (withResults.length === 0) throw new Error('Registre pelo menos um resultado antes de gerar a síntese.')

    const patient = ev.patients as { name: string; birth_date: string; schooling: string; hypotheses: string | null } | null
    const prompt = `Você é neuropsicóloga clínica. Elabore uma síntese integradora por domínios cognitivos (atenção, funções executivas, memória, linguagem, visuoconstrução, inteligência, personalidade quando aplicável) a partir dos resultados abaixo. Escreva em português, tom técnico e humano, 3 a 6 parágrafos, sem inventar dados. Sempre indique quando um resultado está dentro da média, acima ou abaixo. Não inclua conclusão diagnóstica definitiva.

Paciente: ${patient?.name ?? '—'} (nascimento ${patient?.birth_date ?? '—'}, escolaridade ${patient?.schooling ?? '—'}).
Hipóteses diagnósticas: ${patient?.hypotheses ?? 'não informadas'}.
Avaliação: ${ev.title}.

Resultados:
${withResults
  .map((t) => {
    const c = t.test_catalog as { name: string; acronym: string | null; category: string } | null
    return `- ${c?.acronym ?? c?.name ?? 'Teste'} (${c?.category ?? '—'}): bruto=${t.raw_score ?? '—'}, padronizado=${t.standard_score ?? '—'}, classificação=${t.classification ?? '—'}. ${t.synthesis ?? t.correction_notes ?? ''}`.trim()
  })
  .join('\n')}`

    const key = process.env.LOVABLE_API_KEY
    if (!key) throw new Error('LOVABLE_API_KEY ausente.')
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Lovable-API-Key': key },
      body: JSON.stringify({
        model: 'google/gemini-3.1-pro-preview',
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (res.status === 429) throw new Error('Limite de uso do serviço de IA. Tente novamente em instantes.')
    if (res.status === 402) throw new Error('Créditos de IA esgotados. Adicione créditos ao workspace.')
    if (!res.ok) throw new Error(`Falha na IA: ${res.status}`)
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const content = json.choices?.[0]?.message?.content?.trim()
    if (!content) throw new Error('Resposta vazia da IA.')

    const { error: upErr } = await context.supabase
      .from('evaluations')
      .update({ synthesis: content })
      .eq('id', data.evaluationId)
    if (upErr) throw new Error(upErr.message)
    return { synthesis: content }
  })

const UpdatePatientInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  sex: z.enum(['feminino', 'masculino', 'outro', 'nao_informado']).optional().nullable(),
  birthDate: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  schooling: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  medications: z.string().optional().nullable(),
  professionals: z.array(ProfessionalSchema).max(20).optional(),
  hypotheses: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['active', 'archived', 'discharged']).optional(),
  hasGuardians: z.boolean().optional(),
  guardians: z.array(GuardianSchema).max(10).optional(),
  emergencyContact: EmergencyContactSchema.nullable().optional(),
})

export const updatePatient = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpdatePatientInput.parse(i))
  .handler(async ({ context, data }) => {
    const patch: {
      name: string; sex: string | null; birth_date: string | null; cpf: string | null; schooling: string | null; city: string | null;
      phone: string | null; medications: string | null;
      hypotheses: string | null; notes: string | null;
      status?: 'active' | 'archived' | 'discharged';
      has_guardians?: boolean; guardians?: unknown; emergency_contact?: unknown; professionals?: unknown;
    } = {
      name: data.name,
      sex: data.sex ?? null,
      birth_date: data.birthDate || null,
      cpf: data.cpf || null,
      schooling: data.schooling || null,
      city: data.city || null,
      phone: data.phone || null,
      medications: data.medications || null,
      hypotheses: data.hypotheses || null,
      notes: data.notes || null,
    }
    if (data.professionals !== undefined) patch.professionals = data.professionals
    if (data.status) patch.status = data.status
    if (typeof data.hasGuardians === 'boolean') {
      patch.has_guardians = data.hasGuardians
      patch.guardians = data.hasGuardians ? (data.guardians ?? []) : []
    } else if (data.guardians) {
      patch.guardians = data.guardians
    }
    if (data.emergencyContact !== undefined) patch.emergency_contact = data.emergencyContact
    const { error } = await context.supabase.from('patients').update(patch as never).eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const setPatientStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(['active', 'archived', 'discharged']),
    }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from('patients')
      .update({ status: data.status })
      .eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const deletePatient = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const isAdmin = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' })
    if (!isAdmin.data) throw new Error('Apenas administradores podem excluir pacientes.')
    const { error } = await context.supabase.from('patients').delete().eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const generatePatientOverallSynthesis = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    await enforceRateLimit(RATE_LIMITS.aiSynthesis, `user:${context.userId}`)
    const { data: patient, error } = await context.supabase
      .from('patients')
      .select('id, name, birth_date, schooling, city, hypotheses, notes')
      .eq('id', data.id)
      .maybeSingle()
    if (error || !patient) throw new Error(error?.message ?? 'Paciente não encontrado.')

    const [anamRes, screenRes, evalRes, tasksRes] = await Promise.all([
      context.supabase.from('anamneses').select('*').eq('patient_id', data.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      context.supabase.from('screenings').select('*').eq('patient_id', data.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      context.supabase.from('evaluations').select('title, synthesis, status').eq('patient_id', data.id),
      context.supabase.from('test_tasks').select('raw_score, standard_score, classification, synthesis, test_catalog(acronym, name, category)').eq('patient_id', data.id),
    ])

    const anam = anamRes.data as Record<string, unknown> | null
    const screen = screenRes.data as Record<string, unknown> | null
    const evaluations = (evalRes.data ?? []) as Array<{ title: string; synthesis: string | null; status: string }>
    const tasks = (tasksRes.data ?? []).filter((t) => t.synthesis || t.raw_score || t.standard_score || t.classification)

    const prompt = `Você é neuropsicóloga clínica sênior. Elabore uma SÍNTESE INTEGRADORA DO CASO em português, tom técnico e humano, 4 a 8 parágrafos, organizada por: (1) identificação e queixa, (2) história relevante, (3) achados da triagem, (4) achados dos testes por domínio cognitivo, (5) integração e hipóteses, (6) encaminhamentos/recomendações. Não invente dados. Não feche diagnóstico. Sinalize lacunas.

PACIENTE: ${patient.name} — nascimento ${patient.birth_date}, escolaridade ${patient.schooling}, cidade ${patient.city}.
HIPÓTESES DIAGNÓSTICAS: ${patient.hypotheses ?? 'não informadas'}.
OBSERVAÇÕES CLÍNICAS: ${patient.notes ?? '—'}.

ANAMNESE: ${anam ? JSON.stringify(anam) : 'não registrada'}.

TRIAGEM: ${screen ? JSON.stringify(screen) : 'não registrada'}.

AVALIAÇÕES:
${evaluations.length === 0 ? '- nenhuma' : evaluations.map((e) => `- ${e.title} (${e.status}): ${e.synthesis ?? 'sem síntese'}`).join('\n')}

TESTES APLICADOS:
${tasks.length === 0 ? '- nenhum resultado' : tasks.map((t) => {
  const c = t.test_catalog as { acronym: string | null; name: string; category: string } | null
  return `- ${c?.acronym ?? c?.name} (${c?.category ?? '—'}): bruto=${t.raw_score ?? '—'}, padronizado=${t.standard_score ?? '—'}, classificação=${t.classification ?? '—'}. ${t.synthesis ?? ''}`.trim()
}).join('\n')}`

    const key = process.env.LOVABLE_API_KEY
    if (!key) throw new Error('LOVABLE_API_KEY ausente.')
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Lovable-API-Key': key },
      body: JSON.stringify({
        model: 'google/gemini-3.1-pro-preview',
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (res.status === 429) throw new Error('Limite de uso do serviço de IA. Tente novamente em instantes.')
    if (res.status === 402) throw new Error('Créditos de IA esgotados. Adicione créditos ao workspace.')
    if (!res.ok) throw new Error(`Falha na IA: ${res.status}`)
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const content = json.choices?.[0]?.message?.content?.trim()
    if (!content) throw new Error('Resposta vazia da IA.')

    const { error: upErr } = await context.supabase
      .from('patients')
      .update({ overall_synthesis: content })
      .eq('id', data.id)
    if (upErr) throw new Error(upErr.message)
    return { synthesis: content }
  })
