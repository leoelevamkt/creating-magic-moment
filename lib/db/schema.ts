import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(), userId: text('userId').notNull().unique(),
  role: text('role').notNull().default('staff'), active: boolean('active').notNull().default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(), updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const patients = pgTable('patients', {
  id: serial('id').primaryKey(), userId: text('userId').notNull(), name: text('name').notNull(),
  birthDate: date('birthDate').notNull(), cpf: text('cpf').notNull(), schooling: text('schooling').notNull(),
  city: text('city').notNull(), hypotheses: text('hypotheses'), notes: text('notes'),
  status: text('status').notNull().default('active'), createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const guardians = pgTable('guardians', {
  id: serial('id').primaryKey(), userId: text('userId').notNull(), patientId: integer('patientId').notNull(),
  name: text('name').notNull(), relationship: text('relationship').notNull(), cpf: text('cpf'), phone: text('phone'),
  email: text('email'), createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const testCatalog = pgTable('test_catalog', {
  id: serial('id').primaryKey(), userId: text('userId').notNull(), name: text('name').notNull(), acronym: text('acronym'),
  category: text('category').notNull(), source: text('source').notNull(), status: text('status').notNull().default('active'),
  ageRange: text('ageRange'), applicationMode: text('applicationMode'), estimatedMinutes: integer('estimatedMinutes'),
  verifiedAt: date('verifiedAt'), notes: text('notes'), createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const evaluations = pgTable('evaluations', {
  id: serial('id').primaryKey(), userId: text('userId').notNull(), patientId: integer('patientId').notNull(),
  title: text('title').notNull(), modality: text('modality').notNull(), scheduledAt: timestamp('scheduledAt'),
  synthesis: text('synthesis'),
  status: text('status').notNull().default('active'), createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const testTasks = pgTable('test_tasks', {
  id: serial('id').primaryKey(), userId: text('userId').notNull(), evaluationId: integer('evaluationId').notNull(),
  patientId: integer('patientId').notNull(), testId: integer('testId').notNull(), assigneeId: text('assigneeId'),
  status: text('status').notNull().default('todo'), scheduledAt: timestamp('scheduledAt'), startedAt: timestamp('startedAt'),
  completedAt: timestamp('completedAt'), durationMinutes: integer('durationMinutes'), correctionNotes: text('correctionNotes'),
  rawScore: text('rawScore'), standardScore: text('standardScore'), classification: text('classification'), synthesis: text('synthesis'),
  adminNotes: text('adminNotes'), approvedBy: text('approvedBy'), approvedAt: timestamp('approvedAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(), updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const sessionsPlan = pgTable('sessions_plan', {
  id: serial('id').primaryKey(), userId: text('userId').notNull(), patientId: integer('patientId').notNull(),
  title: text('title').notNull().default('Sessão'), sessionDate: date('sessionDate').notNull(),
  startTime: text('startTime'), endTime: text('endTime'), modality: text('modality').notNull().default('presencial'),
  plannedTestIds: text('plannedTestIds'), objectives: text('objectives'), notes: text('notes'),
  status: text('status').notNull().default('scheduled'), createdBy: text('createdBy').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(), updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(), userId: text('userId').notNull(), actorId: text('actorId').notNull(),
  action: text('action').notNull(), entityType: text('entityType').notNull(), entityId: text('entityId').notNull(),
  details: text('details'), createdAt: timestamp('createdAt').notNull().defaultNow(),
})
