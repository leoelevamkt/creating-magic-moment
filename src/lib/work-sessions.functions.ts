import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export type WorkSession = {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  note: string | null
}

export const getActiveWorkSession = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('work_sessions')
      .select('id,user_id,started_at,ended_at,note')
      .eq('user_id', context.userId)
      .is('ended_at', null)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as WorkSession | null) ?? null
  })

export const startWorkSession = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Fecha qualquer sessão em aberto por segurança
    await context.supabase
      .from('work_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('user_id', context.userId)
      .is('ended_at', null)

    const { data, error } = await context.supabase
      .from('work_sessions')
      .insert({ user_id: context.userId, started_at: new Date().toISOString() })
      .select('id,user_id,started_at,ended_at,note')
      .single()
    if (error) throw new Error(error.message)
    return data as WorkSession
  })

export const stopWorkSession = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { note?: string }) =>
    z.object({ note: z.string().trim().max(500).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from('work_sessions')
      .update({ ended_at: new Date().toISOString(), note: data.note ?? null })
      .eq('user_id', context.userId)
      .is('ended_at', null)
      .select('id,user_id,started_at,ended_at,note')
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (row as WorkSession | null) ?? null
  })

export const listMyWorkSessions = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number }) =>
    z.object({ days: z.number().int().min(1).max(365).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const days = data.days ?? 30
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const { data: rows, error } = await context.supabase
      .from('work_sessions')
      .select('id,user_id,started_at,ended_at,note')
      .eq('user_id', context.userId)
      .gte('started_at', from)
      .order('started_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (rows ?? []) as WorkSession[]
  })

export const listTeamWorkSessions = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number }) =>
    z.object({ days: z.number().int().min(1).max(365).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    })
    if (!isAdmin) throw new Error('Acesso restrito à administração.')
    const days = data.days ?? 30
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const { data: rows, error } = await context.supabase
      .from('work_sessions')
      .select('id,user_id,started_at,ended_at,note')
      .gte('started_at', from)
      .order('started_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (rows ?? []) as WorkSession[]
  })
