'use server'

import { and, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditLog, evaluations, patients, profiles, sessionsPlan, testCatalog, testTasks } from '@/lib/db/schema'
import { starterTests } from '@/lib/test-catalog'
import { generateEvaluationSynthesis, generateTestSynthesis, type PatientContext } from '@/lib/ai'

function ageFromBirthDate(birthDate: string) {
  const b = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

function toPatientContext(p: typeof patients.$inferSelect): PatientContext {
  return { name: p.name, age: ageFromBirthDate(p.birthDate), schooling: p.schooling, hypotheses: p.hypotheses }
}

function aiErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (/credit card|billing|payment|unlock your free credits/i.test(message)) {
    return 'A IA precisa de um cartão cadastrado no AI Gateway da Vercel para liberar os créditos gratuitos. Adicione um cartão em vercel.com e tente novamente. Você também pode preencher a classificação e a síntese manualmente.'
  }
  if (/unauthenticated|api key|AI_GATEWAY_API_KEY/i.test(message)) {
    return 'A chave do AI Gateway não está configurada. Verifique a variável AI_GATEWAY_API_KEY nas configurações do projeto.'
  }
  if (/rate.?limit|free tier|do not have access/i.test(message)) {
    return 'Limite do plano gratuito atingido para este modelo. Aguarde alguns instantes e tente novamente, ou adicione créditos no AI Gateway da Vercel. Você também pode preencher manualmente.'
  }
  return 'Não foi possível gerar com IA agora. Tente novamente ou preencha manualmente.'
}

export type ActionState = { ok: boolean; message: string } | null
export type AiResultState = { ok: boolean; message: string; classification?: string; synthesis?: string } | null

async function access() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Não autorizado')
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.user.id)).limit(1)
  return { userId: session.user.id, name: session.user.name, role: profile?.role ?? 'staff' }
}

// Catálogo compartilhado por toda a clínica: garante que sempre exista uma base.
export async function ensureCatalog(seededBy: string) {
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(testCatalog)
  if (total > 0) return
  await db.insert(testCatalog).values(
    starterTests.map((test) => ({
      userId: seededBy,
      name: test.name,
      acronym: test.acronym,
      category: test.category,
      source: test.source,
      status: 'active',
      ageRange: test.ageRange,
      applicationMode: 'Online ou presencial, conforme manual',
      estimatedMinutes: test.minutes,
      verifiedAt: new Date().toISOString().slice(0, 10),
      notes: 'Confirmar situação vigente no SATEPSI e a habilitação da clínica antes do uso.',
    })),
  )
}

export async function createPatient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId } = await access()
  const parsed = z
    .object({
      name: z.string().min(3, 'Informe o nome completo'),
      birthDate: z.string().min(1, 'Informe a data de nascimento'),
      cpf: z.string().min(11, 'CPF inválido'),
      schooling: z.string().min(2, 'Informe a escolaridade'),
      city: z.string().min(2, 'Informe a cidade'),
      hypotheses: z.string().optional(),
      notes: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  const [patient] = await db.insert(patients).values({ userId, ...parsed.data }).returning()
  await db.insert(auditLog).values({ userId, actorId: userId, action: 'patient.created', entityType: 'patient', entityId: String(patient.id), details: `Paciente ${patient.name} cadastrado` })
  revalidatePath('/patients')
  revalidatePath('/')
  return { ok: true, message: 'Paciente cadastrado com sucesso' }
}

export async function createEvaluation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, name } = await access()
  const patientId = Number(formData.get('patientId'))
  const testIds = formData.getAll('testIds').map(Number).filter(Boolean)
  const title = String(formData.get('title') || 'Avaliação neuropsicológica')
  const modality = String(formData.get('modality') || 'presencial')
  const scheduledValue = String(formData.get('scheduledAt') || '')
  const scheduledAt = scheduledValue ? new Date(scheduledValue) : null
  if (!patientId) return { ok: false, message: 'Selecione um paciente' }
  if (!testIds.length) return { ok: false, message: 'Selecione ao menos um teste' }
  const [evaluation] = await db.insert(evaluations).values({ userId, patientId, title, modality, scheduledAt }).returning()
  await db.insert(testTasks).values(testIds.map((testId) => ({ userId, evaluationId: evaluation.id, patientId, testId, status: 'todo', scheduledAt })))
  await db.insert(auditLog).values({ userId, actorId: userId, action: 'evaluation.created', entityType: 'patient', entityId: String(patientId), details: `${name} planejou ${testIds.length} teste(s) — ${title}` })
  revalidatePath('/')
  revalidatePath('/kanban')
  revalidatePath('/patients')
  revalidatePath(`/patients/${patientId}`)
  return { ok: true, message: `${testIds.length} tarefa(s) criada(s) no quadro` }
}

export async function updateTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, name, role } = await access()
  const taskId = Number(formData.get('taskId'))
  const action = String(formData.get('action'))
  const notes = String(formData.get('notes') || '')
  const [current] = await db.select().from(testTasks).where(eq(testTasks.id, taskId)).limit(1)
  if (!current) return { ok: false, message: 'Tarefa não encontrada' }
  let values: Partial<typeof testTasks.$inferInsert> = {}
  let label = action
  if (action === 'start') {
    values = { status: 'correcting', startedAt: new Date(), assigneeId: userId }
    label = 'iniciou a correção'
  }
  if (action === 'submit') {
    const now = new Date()
    values = {
      status: 'review',
      completedAt: now,
      correctionNotes: notes,
      durationMinutes: current.startedAt ? Math.max(1, Math.round((now.getTime() - current.startedAt.getTime()) / 60000)) : null,
    }
    label = 'enviou para aprovação'
  }
  if (action === 'approve') {
    if (role !== 'admin') return { ok: false, message: 'Apenas o admin pode aprovar' }
    values = { status: 'approved', approvedAt: new Date(), approvedBy: userId, adminNotes: notes }
    label = 'aprovou (OK do admin)'
  }
  if (action === 'return') {
    if (role !== 'admin') return { ok: false, message: 'Apenas o admin pode devolver' }
    values = { status: 'correcting', adminNotes: notes }
    label = 'devolveu para ajustes'
  }
  await db.update(testTasks).set({ ...values, updatedAt: new Date() }).where(eq(testTasks.id, taskId))
  await db.insert(auditLog).values({ userId, actorId: userId, action: `task.${action}`, entityType: 'patient', entityId: String(current.patientId), details: `${name} ${label}${notes ? `: ${notes}` : ''}` })
  revalidatePath('/')
  revalidatePath('/kanban')
  revalidatePath(`/patients/${current.patientId}`)
  return { ok: true, message: 'Tarefa atualizada' }
}

export async function createStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { role } = await access()
  if (role !== 'admin') return { ok: false, message: 'Apenas o admin pode criar acessos' }
  const parsed = z
    .object({
      name: z.string().min(3, 'Informe o nome'),
      email: z.string().email('E-mail inválido'),
      password: z.string().min(8, 'A senha precisa de ao menos 8 caracteres'),
      role: z.enum(['admin', 'staff']),
    })
    .safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  try {
    const created = await auth.api.signUpEmail({ body: { name: parsed.data.name, email: parsed.data.email, password: parsed.data.password } })
    const newUserId = created.user.id
    const [existing] = await db.select().from(profiles).where(eq(profiles.userId, newUserId)).limit(1)
    if (existing) await db.update(profiles).set({ role: parsed.data.role }).where(eq(profiles.userId, newUserId))
    else await db.insert(profiles).values({ userId: newUserId, role: parsed.data.role })
  } catch (error) {
    const message = error instanceof Error && error.message.includes('already') ? 'Já existe um acesso com este e-mail' : 'Não foi possível criar o acesso'
    return { ok: false, message }
  }
  revalidatePath('/settings')
  return { ok: true, message: 'Acesso criado com sucesso' }
}

export async function setRole(formData: FormData): Promise<void> {
  const { role } = await access()
  if (role !== 'admin') return
  const targetUserId = String(formData.get('userId'))
  const newRole = String(formData.get('role')) === 'admin' ? 'admin' : 'staff'
  await db.update(profiles).set({ role: newRole, updatedAt: new Date() }).where(eq(profiles.userId, targetUserId))
  revalidatePath('/settings')
}

// ----- Agenda / planejamento de sessões -----
export async function createSession(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, name } = await access()
  const parsed = z
    .object({
      patientId: z.coerce.number().min(1, 'Selecione um paciente'),
      title: z.string().optional(),
      sessionDate: z.string().min(1, 'Informe a data'),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      modality: z.enum(['presencial', 'online']).default('presencial'),
      objectives: z.string().optional(),
      notes: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  const plannedTestIds = formData.getAll('plannedTestIds').map(String).filter(Boolean)
  const { patientId, title, sessionDate, startTime, endTime, modality, objectives, notes } = parsed.data
  await db.insert(sessionsPlan).values({
    userId, patientId, title: title || 'Sessão', sessionDate, startTime: startTime || null, endTime: endTime || null,
    modality, objectives: objectives || null, notes: notes || null, plannedTestIds: JSON.stringify(plannedTestIds), createdBy: userId,
  })
  await db.insert(auditLog).values({ userId, actorId: userId, action: 'session.created', entityType: 'patient', entityId: String(patientId), details: `${name} agendou sessão em ${sessionDate}` })
  revalidatePath('/agenda')
  revalidatePath(`/patients/${patientId}`)
  return { ok: true, message: 'Sessão agendada' }
}

export async function updateSession(formData: FormData): Promise<void> {
  await access()
  const id = Number(formData.get('sessionId'))
  const action = String(formData.get('action'))
  if (action === 'delete') await db.delete(sessionsPlan).where(eq(sessionsPlan.id, id))
  else await db.update(sessionsPlan).set({ status: action, updatedAt: new Date() }).where(eq(sessionsPlan.id, id))
  revalidatePath('/agenda')
}

// ----- Resultados dos testes -----
export async function saveTaskResult(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, name } = await access()
  const taskId = Number(formData.get('taskId'))
  const rawScore = String(formData.get('rawScore') || '')
  const standardScore = String(formData.get('standardScore') || '')
  const classification = String(formData.get('classification') || '')
  const synthesis = String(formData.get('synthesis') || '')
  const [current] = await db.select().from(testTasks).where(eq(testTasks.id, taskId)).limit(1)
  if (!current) return { ok: false, message: 'Tarefa não encontrada' }
  await db.update(testTasks).set({ rawScore, standardScore, classification, synthesis, updatedAt: new Date() }).where(eq(testTasks.id, taskId))
  await db.insert(auditLog).values({ userId, actorId: userId, action: 'task.result', entityType: 'patient', entityId: String(current.patientId), details: `${name} registrou resultado do teste` })
  revalidatePath('/kanban')
  revalidatePath(`/patients/${current.patientId}`)
  return { ok: true, message: 'Resultado salvo' }
}

// Gera classificação + síntese de um teste com IA e persiste.
export async function aiTaskSynthesis(_prev: AiResultState, formData: FormData): Promise<AiResultState> {
  const { userId, name } = await access()
  const taskId = Number(formData.get('taskId'))
  const rawScore = String(formData.get('rawScore') || '')
  const standardScore = String(formData.get('standardScore') || '')
  const classification = String(formData.get('classification') || '')
  const rows = await db
    .select({ task: testTasks, test: testCatalog, patient: patients })
    .from(testTasks)
    .leftJoin(testCatalog, eq(testTasks.testId, testCatalog.id))
    .leftJoin(patients, eq(testTasks.patientId, patients.id))
    .where(eq(testTasks.id, taskId))
    .limit(1)
  const row = rows[0]
  if (!row?.patient || !row?.test) return { ok: false, message: 'Dados do teste incompletos' }
  try {
    const result = await generateTestSynthesis(toPatientContext(row.patient), {
      testName: row.test.name, acronym: row.test.acronym, category: row.test.category, rawScore, standardScore, classification,
    })
    await db.update(testTasks).set({ rawScore, standardScore, classification: result.classification, synthesis: result.synthesis, updatedAt: new Date() }).where(eq(testTasks.id, taskId))
    await db.insert(auditLog).values({ userId, actorId: userId, action: 'task.ai_synthesis', entityType: 'patient', entityId: String(row.task.patientId), details: `${name} gerou classificação e síntese com IA` })
    revalidatePath('/kanban')
    revalidatePath(`/patients/${row.task.patientId}`)
    return { ok: true, message: 'Classificação e síntese geradas', classification: result.classification, synthesis: result.synthesis }
  } catch (error) {
    return { ok: false, message: aiErrorMessage(error) }
  }
}

// Gera a síntese integradora da avaliação com IA.
export async function aiEvaluationSynthesis(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, name } = await access()
  const evaluationId = Number(formData.get('evaluationId'))
  const [evaluation] = await db.select().from(evaluations).where(eq(evaluations.id, evaluationId)).limit(1)
  if (!evaluation) return { ok: false, message: 'Avaliação não encontrada' }
  const [patient] = await db.select().from(patients).where(eq(patients.id, evaluation.patientId)).limit(1)
  if (!patient) return { ok: false, message: 'Paciente não encontrado' }
  const rows = await db
    .select({ task: testTasks, test: testCatalog })
    .from(testTasks)
    .leftJoin(testCatalog, eq(testTasks.testId, testCatalog.id))
    .where(eq(testTasks.evaluationId, evaluationId))
  const results = rows
    .filter((r) => r.test && (r.task.rawScore || r.task.standardScore || r.task.classification))
    .map((r) => ({ testName: r.test!.name, acronym: r.test!.acronym, category: r.test!.category, rawScore: r.task.rawScore, standardScore: r.task.standardScore, classification: r.task.classification, synthesis: r.task.synthesis }))
  if (!results.length) return { ok: false, message: 'Registre resultados dos testes antes de gerar a síntese' }
  try {
    const { synthesis } = await generateEvaluationSynthesis(toPatientContext(patient), results)
    await db.update(evaluations).set({ synthesis, updatedAt: new Date() }).where(eq(evaluations.id, evaluationId))
    await db.insert(auditLog).values({ userId, actorId: userId, action: 'evaluation.ai_synthesis', entityType: 'patient', entityId: String(patient.id), details: `${name} gerou a síntese integradora com IA` })
    revalidatePath(`/patients/${patient.id}`)
    return { ok: true, message: 'Síntese integradora gerada' }
  } catch (error) {
    return { ok: false, message: aiErrorMessage(error) }
  }
}
