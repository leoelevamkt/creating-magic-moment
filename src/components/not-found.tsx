import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="font-serif text-3xl font-semibold text-foreground">Página não encontrada</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        A página que você está tentando acessar não existe ou foi movida.
      </p>
      <Link to="/" className="text-sm font-medium text-primary hover:underline">
        Voltar ao início
      </Link>
    </div>
  )
}
