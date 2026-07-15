import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { FormField } from '@/lib/form-templates'

export const Route = createFileRoute('/f/$token')({
  head: () => ({ meta: [{ title: 'Formulário — NeuroFlux' }] }),
  component: PublicFormPage,
})

type FormData = {
  title: string
  description: string | null
  fields: FormField[]
}

function PublicFormPage() {
  const { token } = Route.useParams()
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'ready'; data: FormData }
    | { kind: 'done' }
    | { kind: 'error'; message: string }
  >({ kind: 'loading' })
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/public/forms/${token}`)
      .then(async (r) => {
        if (r.ok) {
          const data = (await r.json()) as FormData
          setState({ kind: 'ready', data })
        } else {
          const msg = await r.text()
          setState({ kind: 'error', message: msg || 'Não foi possível carregar o formulário.' })
        }
      })
      .catch(() => setState({ kind: 'error', message: 'Erro de conexão.' }))
  }, [token])

  async function submit() {
    if (state.kind !== 'ready') return
    for (const f of state.data.fields) {
      if (f.required && (values[f.key] === undefined || values[f.key] === '' || values[f.key] === null)) {
        toast.error(`Preencha: ${f.label}`)
        return
      }
    }
    setSubmitting(true)
    try {
      const r = await fetch(`/api/public/forms/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: values }),
      })
      if (!r.ok) throw new Error(await r.text())
      setState({ kind: 'done' })
    } catch (e) {
      toast.error((e as Error).message || 'Falha ao enviar.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-svh bg-muted/40 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          {state.kind === 'loading' && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {state.kind === 'error' && (
            <div>
              <h1 className="font-serif text-xl font-semibold">Formulário indisponível</h1>
              <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
            </div>
          )}
          {state.kind === 'done' && (
            <div>
              <h1 className="font-serif text-2xl font-semibold">Obrigada!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Suas respostas foram enviadas com segurança para sua psicóloga.
              </p>
            </div>
          )}
          {state.kind === 'ready' && (
            <>
              <h1 className="font-serif text-2xl font-semibold">{state.data.title}</h1>
              {state.data.description && (
                <p className="mt-2 text-sm text-muted-foreground">{state.data.description}</p>
              )}
              <div className="mt-6 grid gap-4">
                {state.data.fields.map((f) => (
                  <FieldRenderer
                    key={f.key}
                    field={f}
                    value={values[f.key]}
                    onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
                  />
                ))}
              </div>
              <Button className="mt-6 w-full" onClick={submit} disabled={submitting}>
                {submitting ? 'Enviando…' : 'Enviar respostas'}
              </Button>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">NeuroFlux · sigilo profissional</p>
      </div>
    </div>
  )
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FormField
  value: unknown
  onChange: (v: unknown) => void
}) {
  const label = (
    <Label>
      {field.label}
      {field.required && <span className="ml-1 text-destructive">*</span>}
    </Label>
  )
  switch (field.type) {
    case 'textarea':
      return (
        <div className="grid gap-1.5">
          {label}
          <Textarea rows={4} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
        </div>
      )
    case 'number':
      return (
        <div className="grid gap-1.5">
          {label}
          <Input
            type="number"
            min={field.min}
            max={field.max}
            value={(value as number | string | undefined) ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
      )
    case 'choice':
      return (
        <div className="grid gap-1.5">
          {label}
          <div className="flex flex-wrap gap-2">
            {(field.options ?? []).map((opt) => {
              const active = value === opt
              return (
                <button
                  type="button"
                  key={opt}
                  onClick={() => onChange(opt)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      )
    case 'scale': {
      const min = field.min ?? 0
      const max = field.max ?? 4
      const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i)
      return (
        <div className="grid gap-1.5">
          {label}
          <div className="flex flex-wrap gap-2">
            {nums.map((n) => {
              const active = value === n
              return (
                <button
                  type="button"
                  key={n}
                  onClick={() => onChange(n)}
                  className={`h-10 w-10 rounded-lg border text-sm ${active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  {n}
                </button>
              )
            })}
          </div>
        </div>
      )
    }
    default:
      return (
        <div className="grid gap-1.5">
          {label}
          <Input value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
        </div>
      )
  }
}
