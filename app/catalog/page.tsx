import { AlertTriangle, Library } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { PageHeading } from '@/components/clinical-ui'
import { Badge } from '@/components/ui/badge'
import { getContext, getDashboardData } from '@/lib/dashboard-data'

export default async function CatalogPage() {
  const { session, profile } = await getContext()
  const data = await getDashboardData()
  const satepsi = data.catalog.filter((t) => t.source === 'SATEPSI')
  const complementares = data.catalog.filter((t) => t.source !== 'SATEPSI')

  return (
    <AppShell userName={session.user.name} role={profile.role}>
      <PageHeading
        eyebrow="Instrumentos"
        title="Catálogo clínico"
        description="Biblioteca de testes para seleção nas avaliações, separando os instrumentos SATEPSI dos complementares."
      />
      <div className="mb-6 flex gap-3 rounded-xl border border-accent-foreground/15 bg-accent p-4 text-sm text-accent-foreground">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <p className="leading-relaxed">
          <strong>Atenção profissional:</strong> esta biblioteca é um ponto de partida operacional, não uma confirmação
          regulatória. Confirme o SATEPSI vigente, o manual e a habilitação da clínica antes de cada aplicação.
        </p>
      </div>

      <Section title="Testes SATEPSI" subtitle="Instrumentos com parecer favorável no sistema do CFP" tests={satepsi} />
      <div className="mt-8">
        <Section
          title="Instrumentos complementares"
          subtitle="Amplamente usados em neuropsicologia e não sujeitos ao SATEPSI"
          tests={complementares}
        />
      </div>

      {!data.catalog.length && (
        <div className="rounded-xl border border-dashed p-16 text-center">
          <Library className="mx-auto text-muted-foreground" />
          <h2 className="mt-4 font-serif text-xl font-semibold">Catálogo sendo preparado</h2>
          <p className="mt-2 text-sm text-muted-foreground">Recarregue a página em instantes.</p>
        </div>
      )}
    </AppShell>
  )
}

type CatalogRow = {
  id: number
  name: string
  acronym: string | null
  category: string
  source: string
  estimatedMinutes: number | null
  ageRange: string | null
}

function Section({ title, subtitle, tests }: { title: string; subtitle: string; tests: CatalogRow[] }) {
  if (!tests.length) return null
  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Badge variant="secondary">{tests.length}</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tests.map((test) => (
          <article key={test.id} className="rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                <Library size={19} />
              </span>
              <Badge variant={test.source === 'SATEPSI' ? 'default' : 'secondary'}>{test.source}</Badge>
            </div>
            <h3 className="mt-5 font-serif text-xl font-semibold text-foreground">{test.acronym || test.name}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{test.name}</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 text-xs">
              <div>
                <dt className="text-muted-foreground">Domínio</dt>
                <dd className="mt-1 font-medium text-foreground">{test.category}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Duração</dt>
                <dd className="mt-1 font-medium text-foreground">{test.estimatedMinutes ?? '—'} min</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Faixa etária</dt>
                <dd className="mt-1 font-medium text-foreground">{test.ageRange}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  )
}
