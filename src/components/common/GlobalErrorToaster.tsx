import { useEffect } from 'react'
import { notifyError } from '@/router'

/**
 * Shows a toast for uncaught runtime errors and unhandled promise rejections.
 * Deduplicates repeated messages within a short window to avoid toast spam.
 */
export function GlobalErrorToaster() {
  useEffect(() => {
    const recent = new Map<string, number>()
    const shouldShow = (key: string) => {
      const now = Date.now()
      const last = recent.get(key)
      if (last && now - last < 4000) return false
      recent.set(key, now)
      return true
    }

    const onError = (event: ErrorEvent) => {
      const message = event.message || String(event.error ?? '')
      if (!message || !shouldShow(message)) return
      notifyError(event.error ?? message, 'Erro inesperado no site')
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason: any = event.reason
      const message =
        (reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : reason?.message) ?? ''
      if (!message || !shouldShow(message)) return
      notifyError(reason, 'Erro inesperado no site')
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
