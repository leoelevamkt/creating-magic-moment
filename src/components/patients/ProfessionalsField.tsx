import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type Professional = { name: string; role: string; contact: string }

const EMPTY: Professional = { name: '', role: '', contact: '' }

export function normalizeProfessionals(list: Professional[]): Professional[] {
  return list
    .map((p) => ({
      name: (p.name ?? '').trim(),
      role: (p.role ?? '').trim(),
      contact: (p.contact ?? '').trim(),
    }))
    .filter((p) => p.name.length >= 2)
}

export function ProfessionalsField({
  value,
  onChange,
}: {
  value: Professional[]
  onChange: (v: Professional[]) => void
}) {
  const rows = value.length === 0 ? [] : value

  function set(i: number, patch: Partial<Professional>) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    onChange(next)
  }
  function add() {
    onChange([...rows, { ...EMPTY }])
  }
  function remove(i: number) {
    onChange(rows.filter((_, idx) => idx !== i))
  }

  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      <div className="flex items-center justify-between">
        <Label>
          Profissionais que acompanham
          <span className="ml-1 text-xs font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus /> Adicionar
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
          Nenhum profissional adicionado.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((p, i) => (
            <li
              key={i}
              className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <Input
                placeholder="Nome"
                value={p.name}
                onChange={(e) => set(i, { name: e.target.value })}
              />
              <Input
                placeholder="Especialidade / função"
                value={p.role}
                onChange={(e) => set(i, { role: e.target.value })}
              />
              <Input
                placeholder="Telefone ou e-mail"
                value={p.contact}
                onChange={(e) => set(i, { contact: e.target.value })}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => remove(i)}
                aria-label="Remover profissional"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
