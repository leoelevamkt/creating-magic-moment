import { ErrorComponent, type ErrorComponentProps, Link } from '@tanstack/react-router'

export function DefaultCatchBoundary(props: ErrorComponentProps) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-serif text-2xl font-semibold text-foreground">Algo deu errado</h1>
      <ErrorComponent error={props.error} />
      <Link to="/" className="text-sm font-medium text-primary hover:underline">
        Voltar ao início
      </Link>
    </div>
  )
}
