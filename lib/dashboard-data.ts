import { and, count, desc, eq, ilike, or } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ensureCatalog } from '@/app/actions/clinical'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditLog, evaluations, patients, profiles, sessionsPlan, testCatalog, testTasks, user } from '@/lib/db/schema'

export async function getContext() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  let [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.user.id)).limit(1)
  if (!profile) {
    const [{ value: profileCount }] = await db.select({ value: count() }).from(profiles)
    ;[profile] = await db.insert(profiles).values({ userId: session.user.id, role: profileCount > 0 ? 'staff' : 'admin' }).returning()
  }
  // Garante o catálogo compartilhado da clínica na primeira utilização.
  await ensureCatalog(session.user.id)
  return { session, profile }
}

// Todos os dados são compartilhados pela clínica (admin + funcionárias).
export async function getDashboardData(search = '') {
  const patientFilter = search
    ? or(ilike(patients.name, `%${search}%`), ilike(patients.cpf, `%${search}%`))
    : undefined
  const [patientRows, evaluationRows, catalogRows, taskRows] = await Promise.all([
    db.select().from(patients).where(patientFilter).orderBy(desc(patients.updatedAt)),
    db.select().from(evaluations).orderBy(desc(evaluations.createdAt)),
    db.select().from(testCatalog).orderBy(testCatalog.name),
    db
      .select({ task: testTasks, patient: patients, test: testCatalog })
      .from(testTasks)
      .leftJoin(patients, eq(testTasks.patientId, patients.id))
      .leftJoin(testCatalog, eq(testTasks.testId, testCatalog.id))
      .orderBy(desc(testTasks.updatedAt)),
  ])
  return { patients: patientRows, evaluations: evaluationRows, catalog: catalogRows, tasks: taskRows }
}

export async function getPatientDetail(patientId: number) {
  const [patient] = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1)
  if (!patient) return null
  const [catalog, tasks, evaluationRows, sessions, history] = await Promise.all([
    db.select().from(testCatalog).orderBy(testCatalog.name),
    db
      .select({ task: testTasks, test: testCatalog })
      .from(testTasks)
      .leftJoin(testCatalog, eq(testTasks.testId, testCatalog.id))
      .where(eq(testTasks.patientId, patientId))
      .orderBy(desc(testTasks.updatedAt)),
    db.select().from(evaluations).where(eq(evaluations.patientId, patientId)).orderBy(desc(evaluations.createdAt)),
    db.select().from(sessionsPlan).where(eq(sessionsPlan.patientId, patientId)).orderBy(desc(sessionsPlan.sessionDate)),
    db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.entityType, 'patient'), eq(auditLog.entityId, String(patientId))))
      .orderBy(desc(auditLog.createdAt)),
  ])
  return { patient, catalog, tasks, evaluations: evaluationRows, sessions, history }
}

export async function getAgenda() {
  const [sessions, patientRows, catalog] = await Promise.all([
    db
      .select({ session: sessionsPlan, patient: patients })
      .from(sessionsPlan)
      .leftJoin(patients, eq(sessionsPlan.patientId, patients.id))
      .orderBy(sessionsPlan.sessionDate, sessionsPlan.startTime),
    db.select().from(patients).where(eq(patients.status, 'active')).orderBy(patients.name),
    db.select().from(testCatalog).where(eq(testCatalog.status, 'active')).orderBy(testCatalog.name),
  ])
  return { sessions, patients: patientRows, catalog }
}

export async function getTeam() {
  return db
    .select({ userId: profiles.userId, role: profiles.role, name: user.name, email: user.email, createdAt: user.createdAt })
    .from(profiles)
    .leftJoin(user, eq(profiles.userId, user.id))
    .orderBy(desc(profiles.createdAt))
}
