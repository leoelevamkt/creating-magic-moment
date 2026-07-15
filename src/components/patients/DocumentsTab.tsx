import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { Download, FileText, Trash2, Upload } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'

const MAX_SIZE = 25 * 1024 * 1024

function humanSize(bytes?: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
  const [uploading, setUploading] = useState(false)

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
          mimeType: selected.type || null,
          sizeBytes: selected.size,
          storagePath: path,
        },
      })
      toast.success('Documento enviado.')
      setSelected(null)
      setDescription('')
      if (fileRef.current) fileRef.current.value = ''
      qc.invalidateQueries({ queryKey: ['patient-documents', patientId] })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

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

      <form onSubmit={onUpload} className="grid gap-3 rounded-xl border bg-background p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
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

      <div className="mt-5">
        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando documentos…</p>
        ) : !q.data || q.data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
            <FileText className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum documento enviado ainda.</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y">
            {q.data.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {humanSize(d.size_bytes)} · {d.mime_type ?? '—'} · {format(new Date(d.created_at), "dd/MM/yyyy 'às' HH:mm")}
                  </p>
                  {d.description ? <p className="mt-1 text-sm text-foreground/85">{d.description}</p> : null}
                </div>
                <div className="flex gap-2">
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
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
