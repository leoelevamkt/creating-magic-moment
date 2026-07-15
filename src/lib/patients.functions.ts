import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const CreateInput = z.object({
  name: z.string().min(2),
  birthDate: z.string().min(4),
  cpf: z.string().min(3),
  schooling: z.string().min(1),
  city: z.string().min(1),
  hypotheses: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const listPatients = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('patients')
      .select('id, name, birth_date, cpf, schooling, city, status, created_at')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data ?? []
  })

export const createPatient = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateInput.parse(input))
  .handler(async ({ context, data }) => {
    const { error, data: row } = await context.supabase
      .from('patients')
      .insert({
        created_by: context.userId,
        name: data.name,
        birth_date: data.birthDate,
        cpf: data.cpf,
        schooling: data.schooling,
        city: data.city,
        hypotheses: data.hypotheses || null,
        notes: data.notes || null,
        status: 'active',
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return { id: row!.id }
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
      .select('id, name, birth_date, cpf, schooling, city, hypotheses, notes, status, created_at')
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
    const patch: Record<string, unknown> = {
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
        model: 'google/gemini-3-flash-preview',
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
