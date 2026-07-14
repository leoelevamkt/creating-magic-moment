import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Library } from 'lucide-react'
import { listCatalog } from '@/lib/profile.functions'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/_authenticated/catalog')({
  head: () => ({ meta: [{ title: 'Catálogo — NeuroFlux' }] }),
  component: CatalogPage,
})

function CatalogPage() {
  const fetchCatalog = useServerFn(listCatalog)
  const { data, isLoading } = useQuery({
    queryKey: ['catalog'],
    queryFn: () => fetchCatalog(),
  })

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Catálogo de testes</p>
        <h1 className="font-serif text-3xl font-semibold">Instrumentos disponíveis</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Testes SATEPSI e complementares aprovados para uso na clínica.
        </p>
      </div>
      {isLoading ? (
        <p className="p-8 text-sm text-muted-foreground">Carregando catálogo…</p>
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-12 text-center">
          <Library className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum teste cadastrado.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.map((t) => (
            <article key={t.id} className="rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-serif text-lg font-semibold text-foreground">
                    {t.acronym}
                  </p>
                  <p className="text-sm text-muted-foreground">{t.name}</p>
                </div>
                <Badge variant={t.status === 'approved' ? 'default' : 'secondary'}>
                  {t.source}
                </Badge>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <dt>Categoria</dt>
                  <dd className="text-foreground">{t.category}</dd>
                </div>
                <div>
                  <dt>Faixa etária</dt>
                  <dd className="text-foreground">{t.age_range ?? '—'}</dd>
                </div>
                <div>
                  <dt>Aplicação</dt>
                  <dd className="text-foreground">{t.application_mode ?? '—'}</dd>
                </div>
                <div>
                  <dt>Duração</dt>
                  <dd className="text-foreground">
                    {t.estimated_minutes ? `${t.estimated_minutes} min` : '—'}
                  </dd>
                </div>
              </dl>
              {t.notes ? (
                <p className="mt-3 text-xs text-muted-foreground">{t.notes}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
