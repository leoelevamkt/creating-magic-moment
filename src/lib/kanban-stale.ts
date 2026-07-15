import type { TaskStatus } from '@/lib/evaluations.functions'

// Days after which a task in a given column is considered "parada" (stale).
export const KANBAN_STALE_DAYS: Record<TaskStatus, number | null> = {
  todo: 3,
  correcting: 5,
  review: 2,
  approved: null,
}

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return null
  const ms = Date.now() - then
  if (ms < 0) return 0
  return Math.floor(ms / 86400000)
}

type TaskLike = {
  status: TaskStatus | string
  created_at: string | null
  started_at: string | null
  completed_at: string | null
  approved_at: string | null
}

export function columnEnteredAt(t: TaskLike): string | null {
  switch (t.status) {
    case 'todo':
      return t.created_at
    case 'correcting':
      return t.started_at ?? t.created_at
    case 'review':
      return t.completed_at ?? t.started_at ?? t.created_at
    case 'approved':
      return t.approved_at
    default:
      return t.created_at
  }
}

export function daysInColumn(t: TaskLike): number | null {
  return daysSince(columnEnteredAt(t))
}

export function isStale(t: TaskLike): boolean {
  const th = KANBAN_STALE_DAYS[t.status as TaskStatus]
  if (th == null) return false
  const d = daysInColumn(t)
  return d != null && d >= th
}

