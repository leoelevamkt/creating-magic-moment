import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const BlockInput = z.object({
  title: z.string().min(1).max(120),
  kind: z.enum(['lunch', 'supervision', 'off', 'other']).default('other'),
  recurrence: z.enum(['weekly', 'once']).default('weekly'),
  weekday: z.number().int().min(0).max(6).nullable().optional(),
  blockDate: z.string().nullable().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  notes: z.string().max(500).nullable().optional(),
})

const UpdateBlockInput = BlockInput.extend({ id: z.string().uuid() })

export const listAgendaBlocks = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('agenda_blocks')
      .select('id, owner_id, title, kind, recurrence, weekday, block_date, start_time, end_time, notes')
      .order('start_time', { ascending: true })
    if (error) throw new Error(error.message)
    return data ?? []
  })

export const createAgendaBlock = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => BlockInput.parse(i))
  .handler(async ({ context, data }) => {
    if (data.recurrence === 'weekly' && (data.weekday === null || data.weekday === undefined)) {
      throw new Error('Bloqueio semanal exige um dia da semana.')
    }
    if (data.recurrence === 'once' && !data.blockDate) {
      throw new Error('Bloqueio único exige uma data.')
    }
    if (data.endTime <= data.startTime) {
      throw new Error('Horário final deve ser após o inicial.')
    }
    const { error, data: row } = await context.supabase
      .from('agenda_blocks')
      .insert({
        owner_id: context.userId,
        title: data.title,
        kind: data.kind,
        recurrence: data.recurrence,
        weekday: data.recurrence === 'weekly' ? data.weekday! : null,
        block_date: data.recurrence === 'once' ? data.blockDate! : null,
        start_time: data.startTime,
        end_time: data.endTime,
        notes: data.notes ?? null,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return { id: row!.id }
  })

export const updateAgendaBlock = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpdateBlockInput.parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from('agenda_blocks')
      .update({
        title: data.title,
        kind: data.kind,
        recurrence: data.recurrence,
        weekday: data.recurrence === 'weekly' ? data.weekday ?? null : null,
        block_date: data.recurrence === 'once' ? data.blockDate ?? null : null,
        start_time: data.startTime,
        end_time: data.endTime,
        notes: data.notes ?? null,
      })
      .eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const deleteAgendaBlock = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('agenda_blocks').delete().eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })
