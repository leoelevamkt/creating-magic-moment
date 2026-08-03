import { Component, type ReactNode } from 'react'
import { AlertTriangle, Loader2, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ErrorCard({
  title = 'Não foi possível carregar estes dados',
  message,
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle size={18} />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {message ? (
        <p className="text-xs break-words text-muted-foreground">{message}</p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        O restante da plataforma continua funcionando normalmente.
      </p>
      {onRetry ? (
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          <RotateCw size={14} /> Tentar novamente
        </Button>
      ) : null}
    </div>
  )
}

export function LoadingCard({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
      <Loader2 size={16} className="animate-spin" /> {label}
    </div>
  )
}

/** Renders loading/error fallbacks for a react-query result, never breaking the page. */
export function QueryBoundary({
  isLoading,
  isError,
  error,
  onRetry,
  loadingLabel,
  children,
}: {
  isLoading?: boolean
  isError?: boolean
  error?: unknown
  onRetry?: () => void
  loadingLabel?: string
  children: ReactNode
}) {
  if (isLoading) return <LoadingCard label={loadingLabel} />
  if (isError)
    return (
      <ErrorCard
        message={error instanceof Error ? error.message : undefined}
        onRetry={onRetry}
      />
    )
  return <>{children}</>
}

type State = { error: Error | null }

/** Catches render-time crashes in a section so navigation keeps working. */
export class SectionBoundary extends Component<
  { children: ReactNode; title?: string },
  State
> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorCard
          title={this.props.title ?? 'Erro ao exibir esta seção'}
          message={this.state.error.message}
          onRetry={() => this.setState({ error: null })}
        />
      )
    }
    return this.props.children
  }
}
