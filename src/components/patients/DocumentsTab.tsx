import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { Download, Eye, FileText, Trash2, Upload, X } from 'lucide-react'
import { format } from 'date-fns'
import {
  createPatientDocument,
  deletePatientDocument,
  getPatientDocumentUrl,
  listPatientDocuments,
} from '@/lib/documents.functions'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const MAX_SIZE = 25 * 1024 * 1024

type Category = 'exame' | 'laudo_externo' | 'receita' | 'outro'

const CATEGORIES: Array<{ id: Category; label: string }> = [
  { id: 'exame', label: 'Exame' },
  { id: 'laudo_externo', label: 'Laudo externo' },
  { id: 'receita', label: 'Receita' },
  { id: 'outro', label: 'Outro' },
]

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label]),
)

function humanSize(bytes?: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isPreviewable(mime?: string | null) {
  if (!mime) return false
  return mime === 'application/pdf' || mime.startsWith('image/')
}

export function DocumentsTab({ patientId }: { patientId: string }) {
  const qc = useQueryClient()
  const list = useServerFn(listPatientDocuments)
  const save = useServerFn(createPatientDocument)
  const del = useServerFn(deletePatientDocument)
  const getUrl = useServerFn(getPatientDocumentUrl)
  const fileRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category>('outro')
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState<'all' | Category>('all')
  const [preview, setPreview] = useState<{ url: string; name: string; mime: string | null } | null>(null)

  const q = useQuery({
    queryKey: ['patient-documents', patientId],
    queryFn: () => list({ data: { patientId } }),
  })

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success('Documento removido.')
      qc.invalidateQueries({ queryKey: ['patient-documents', patientId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  async function onDownload(id: string) {
    try {
      const res = await getUrl({ data: { id } })
      window.open(res.url, '_blank', 'noopener')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function onPreview(id: string, mime: string | null) {
    try {
      const res = await getUrl({ data: { id, inline: true } })
      setPreview({ url: res.url, name: res.name, mime })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected) return toast.error('Selecione um arquivo.')
    if (selected.size > MAX_SIZE) return toast.error('Arquivo excede 25 MB.')
    setUploading(true)
    try {
      const ext = selected.name.split('.').pop() ?? 'bin'
      const path = `${patientId}/${crypto.randomUUID()}.${ext}`
      const up = await supabase.storage.from('patient-documents').upload(path, selected, {
        contentType: selected.type || 'application/octet-stream',
        upsert: false,
      })
      if (up.error) throw new Error(up.error.message)
      await save({
        data: {
          patientId,
          name: selected.name,
          description: description || null,
          category,
          mimeType: selected.type || null,
          sizeBytes: selected.size,
          storagePath: path,
        },
      })
      toast.success('Documento enviado.')
      setSelected(null)
      setDescription('')
      setCategory('outro')
      if (fileRef.current) fileRef.current.value = ''
      qc.invalidateQueries({ queryKey: ['patient-documents', patientId] })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const filtered = useMemo(() => {
    const all = q.data ?? []
    if (filter === 'all') return all
    return all.filter((d) => (d.category ?? 'outro') === filter)
  }, [q.data, filter])

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: 0, exame: 0, laudo_externo: 0, receita: 0, outro: 0 }
    for (const d of q.data ?? []) {
      base.all += 1
      const c = (d.category ?? 'outro') as Category
      base[c] = (base[c] ?? 0) + 1
    }
    return base
  }, [q.data])

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Documentos</h2>
          <p className="text-sm text-muted-foreground">
            Anexe laudos, receitas, exames e outros arquivos deste paciente.
          </p>
        </div>
      </div>

      <form onSubmit={onUpload} className="grid gap-3 rounded-xl border bg-background p-4 sm:grid-cols-[1fr_180px_1fr_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="doc-file" className="text-xs">Arquivo (até 25 MB)</Label>
          <Input
            id="doc-file"
            ref={fileRef}
            type="file"
            onChange={(e) => setSelected(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="doc-cat" className="text-xs">Categoria</Label>
          <select
            id="doc-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="doc-desc" className="text-xs">Descrição (opcional)</Label>
          <Input
            id="doc-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Laudo neuro 2025"
          />
        </div>
        <Button type="submit" disabled={uploading || !selected}>
          <Upload className="mr-1 size-4" />
          {uploading ? 'Enviando…' : 'Enviar'}
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap gap-2">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          Todos <span className="opacity-70">({counts.all})</span>
        </FilterChip>
        {CATEGORIES.map((c) => (
          <FilterChip
            key={c.id}
            active={filter === c.id}
            onClick={() => setFilter(c.id)}
          >
            {c.label} <span className="opacity-70">({counts[c.id] ?? 0})</span>
          </FilterChip>
        ))}
      </div>

      <div className="mt-4">
        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando documentos…</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
            <FileText className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {(q.data ?? []).length === 0 ? 'Nenhum documento enviado ainda.' : 'Nenhum documento nesta categoria.'}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y">
            {filtered.map((d) => {
              const canPreview = isPreviewable(d.mime_type)
              return (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{d.name}</p>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {CATEGORY_LABEL[d.category ?? 'outro'] ?? 'Outro'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {humanSize(d.size_bytes)} · {d.mime_type ?? '—'} · {format(new Date(d.created_at), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                    {d.description ? <p className="mt-1 text-sm text-foreground/85">{d.description}</p> : null}
                  </div>
                  <div className="flex gap-2">
                    {canPreview ? (
                      <Button size="sm" variant="outline" onClick={() => onPreview(d.id, d.mime_type)}>
                        <Eye className="mr-1 size-4" /> Ver
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={() => onDownload(d.id)}>
                      <Download className="mr-1 size-4" /> Baixar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm(`Excluir "${d.name}"?`)) delMut.mutate(d.id)
                      }}
                    >
                      <Trash2 className="mr-1 size-4" /> Excluir
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[92svh] overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="flex items-center justify-between gap-2 font-serif text-lg">
              <span className="truncate">{preview?.name}</span>
              <button
                onClick={() => setPreview(null)}
                className="rounded-md p-1 hover:bg-muted"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </DialogTitle>
          </DialogHeader>
          {preview ? (
            preview.mime?.startsWith('image/') ? (
              <div className="flex max-h-[80svh] items-center justify-center overflow-auto bg-muted/30 p-4">
                <img src={preview.url} alt={preview.name} className="max-h-[75svh] max-w-full object-contain" />
              </div>
            ) : (
              <iframe src={preview.url} title={preview.name} className="h-[80svh] w-full border-0" />
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}
