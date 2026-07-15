import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export type TaskStatus = 'todo' | 'doing' | 'done'

const CreateInput = z.object({
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  color: z.string().min(1).default('slate'),
  dueDate: z.string().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
})

export const listTasks = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('tasks')
      .select('id, title, description, color, due_date, status, created_by, assigned_to, created_at')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data ?? []
  })

export const createTask = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateInput.parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('tasks').insert({
      created_by: context.userId,
      assigned_to: data.assignedTo || null,
      title: data.title,
      description: data.description || null,
      color: data.color,
      due_date: data.dueDate || null,
      status: 'todo',
    })
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const updateTaskStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; status: TaskStatus }) => i)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('tasks').update({ status: data.status }).eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const deleteTask = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('tasks').delete().eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })
