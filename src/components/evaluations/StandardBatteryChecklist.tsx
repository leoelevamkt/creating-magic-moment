import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export type BatteryTest = {
  id: string
  name: string
  acronym: string | null
  category?: string | null
}

/** Checklist pré-pronto com a bateria padrão da clínica. */
export function StandardBatteryChecklist({
  tests,
  isLoading,
  selected,
  onToggle,
  onSelectAll,
  onClear,
}: {
  tests: BatteryTest[]
  isLoading?: boolean
  selected: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClear: () => void
}) {
  const marked = tests.filter((t) => selected.has(t.id)).length

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="flex items-center gap-1.5 text-amber-700 dark:text-amber-500">
          <Star size={14} className="fill-current" />
          Bateria padrão ({marked}/{tests.length})
        </Label>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onSelectAll}>
            Marcar todos
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onClear}>
            Limpar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando bateria padrão…</p>
      ) : tests.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum teste na bateria padrão. Um admin pode definir os testes no catálogo.
        </p>
      ) : (
        <ul className="grid gap-1 sm:grid-cols-2">
          {tests.map((t) => (
            <li key={t.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-background/70">
                <Checkbox
                  checked={selected.has(t.id)}
                  onCheckedChange={() => onToggle(t.id)}
                />
                <span className="truncate">
                  <span className="font-medium">{t.acronym || t.name}</span>
                  {t.acronym ? (
                    <span className="ml-1 text-xs text-muted-foreground">{t.name}</span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
