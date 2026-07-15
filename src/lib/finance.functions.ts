import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const TxInput = z.object({
  patientId: z.string().uuid().nullable().optional(),
  sessionId: z.string().uuid().nullable().optional(),
  kind: z.enum(['income', 'expense']),
  category: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  amount: z.number().nonnegative().max(1_000_000_000),
  transactionDate: z.string().min(4),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).default('pending'),
  paidAt: z.string().min(4).nullable().optional(),
  paymentMethod: z.string().max(80).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

const UpdateTxInput = TxInput.extend({ id: z.string().uuid() })

export const listTransactions = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { patientId?: string | null; scope?: 'patient' | 'company' | 'all' }) =>
    z.object({
      patientId: z.string().uuid().nullable().optional(),
      scope: z.enum(['patient', 'company', 'all']).optional(),
    }).parse(i),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from('financial_transactions')
      .select('id, patient_id, session_id, kind, category, description, amount, transaction_date, status, paid_at, payment_method, notes, created_by, created_at, patients(name)')
      .order('transaction_date', { ascending: false })
      .limit(1000)
    if (data.patientId) q = q.eq('patient_id', data.patientId)
    else if (data.scope === 'company') q = q.is('patient_id', null)
    const { data: rows, error } = await q
    if (error) throw new Error(error.message)
    return rows ?? []
  })

export const createTransaction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => TxInput.parse(i))
  .handler(async ({ context, data }) => {
    const { error, data: row } = await context.supabase
      .from('financial_transactions')
      .insert({
        patient_id: data.patientId ?? null,
        session_id: data.sessionId ?? null,
        kind: data.kind,
        category: data.category,
        description: data.description ?? null,
        amount: data.amount,
        transaction_date: data.transactionDate,
        status: data.status,
        paid_at: data.paidAt ?? null,
        payment_method: data.paymentMethod ?? null,
        notes: data.notes ?? null,
        created_by: context.userId,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return { id: row!.id }
  })

export const updateTransaction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpdateTxInput.parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from('financial_transactions')
      .update({
        patient_id: data.patientId ?? null,
        session_id: data.sessionId ?? null,
        kind: data.kind,
        category: data.category,
        description: data.description ?? null,
        amount: data.amount,
        transaction_date: data.transactionDate,
        status: data.status,
        paid_at: data.paidAt ?? null,
        payment_method: data.paymentMethod ?? null,
        notes: data.notes ?? null,
      })
      .eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const deleteTransaction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('financial_transactions').delete().eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const financialSummary = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isAdmin = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' })
    if (!isAdmin.data) throw new Error('Acesso restrito a administradores.')
    const { data: rows, error } = await context.supabase
      .from('financial_transactions')
      .select('kind, amount, status, transaction_date, category, patient_id')
      .limit(5000)
    if (error) throw new Error(error.message)
    return rows ?? []
  })
