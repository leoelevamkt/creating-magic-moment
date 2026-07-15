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

export function isStale(status: TaskStatus, updatedAt: string | null | undefined): boolean {
  const th = KANBAN_STALE_DAYS[status]
  if (th == null) return false
  const d = daysSince(updatedAt)
  return d != null && d >= th
}
