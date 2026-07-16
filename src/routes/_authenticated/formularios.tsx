import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { Archive, Copy, Eye, Link2, Plus, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/integrations/supabase/client'
import { archiveForm, createForm, getFormResponses, listForms } from '@/lib/forms.functions'
import { formTemplates, PRE_CADASTRO_TEMPLATE_ID } from '@/lib/form-templates'

export const Route = createFileRoute('/_authenticated/formularios')({
  head: () => ({ meta: [{ title: 'Formulários — NeuroFlux' }] }),
  component: FormulariosPage,
})

function shortReferrer(ref: string): string {
  try {
    const u = new URL(ref)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return ref.slice(0, 40)
  }
}

function FormulariosPage() {
  const qc = useQueryClient()
  const list = useServerFn(listForms)
  const create = useServerFn(createForm)
  const archive = useServerFn(archiveForm)
  const getResp = useServerFn(getFormResponses)

  const formsQ = useQuery({ queryKey: ['patient-forms'], queryFn: () => list() })
  const patientsQ = useQuery({
    queryKey: ['patients-simple'],
    queryFn: async () => {
      const { data, error } = await supabase.from('patients').select('id, name').order('name')
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })

  const [open, setOpen] = useState(false)
  const [patientId, setPatientId] = useState('')
  const [templateId, setTemplateId] = useState(formTemplates[0].id)
  const [expiresDays, setExpiresDays] = useState('14')

  const selectedTpl = formTemplates.find((t) => t.id === templateId)
  const isPreCadastro = !!selectedTpl?.createsPatient

  const createM = useMutation({
    mutationFn: () =>
      create({
        data: {
          patientId: isPreCadastro ? null : patientId,
          templateId,
          expiresInDays: expiresDays ? Number(expiresDays) : null,
        },
      }),
    onSuccess: async (row) => {
      const url = `${window.location.origin}/f/${row.token}`
      await navigator.clipboard.writeText(url).catch(() => {})
      toast.success('Formulário criado — link copiado.')
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['patient-forms'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const openPreCadastro = () => {
    setTemplateId(PRE_CADASTRO_TEMPLATE_ID)
    setPatientId('')
    setExpiresDays('30')
    setOpen(true)
  }

  const archiveM = useMutation({
    mutationFn: (id: string) => archive({ data: { id } }),
    onSuccess: () => {
      toast.success('Formulário arquivado.')
      qc.invalidateQueries({ queryKey: ['patient-forms'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const [viewingId, setViewingId] = useState<string | null>(null)
  const viewQ = useQuery({
    queryKey: ['patient-form', viewingId],
    queryFn: () => getResp({ data: { id: viewingId! } }),
    enabled: !!viewingId,
  })

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/f/${token}`
    navigator.clipboard.writeText(url)
    toast.success('Link copiado.')
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold">Formulários</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Envie links para pacientes preencherem anamnese, escalas e questionários.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openPreCadastro}>
            <UserPlus className="mr-2 h-4 w-4" /> Link de pré-cadastro
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" /> Novo formulário
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {isPreCadastro ? 'Link de pré-cadastro' : 'Novo formulário'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                {!isPreCadastro && (
                  <div className="grid gap-1.5">
                    <Label>Paciente</Label>
                    <Select value={patientId} onValueChange={(v) => setPatientId(v ?? '')}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        {(patientsQ.data ?? []).map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label>Template</Label>
                  <Select value={templateId} onValueChange={(v) => setTemplateId(v ?? templateId)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {formTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {selectedTpl?.description}
                  </p>
                </div>
                {isPreCadastro && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                    Este link cria o paciente automaticamente quando a pessoa responder — ideal para
                    enviar por WhatsApp no momento em que o agendamento é confirmado.
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label>Expira em (dias)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={expiresDays}
                    onChange={(e) => setExpiresDays(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => createM.mutate()}
                  disabled={(!isPreCadastro && !patientId) || createM.isPending}
                >
                  {createM.isPending ? 'Criando…' : 'Criar e copiar link'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

      </header>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Paciente</th>
              <th className="p-3">Formulário</th>
              <th className="p-3">Status</th>
              <th className="p-3">Criado</th>
              <th className="p-3">Expira</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(formsQ.data ?? []).map((f) => (
              <tr key={f.id} className="border-b last:border-b-0">
                <td className="p-3 font-medium">
                  {f.patients?.name ?? (f.patient_id ? '—' : (
                    <span className="text-muted-foreground italic">Pré-cadastro (aguardando)</span>
                  ))}
                </td>
                <td className="p-3">{f.title}</td>
                <td className="p-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                    f.status === 'submitted' ? 'bg-emerald-100 text-emerald-800' :
                    f.status === 'archived' ? 'bg-muted text-muted-foreground' :
                    f.open_count > 0 ? 'bg-sky-100 text-sky-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {f.status === 'submitted'
                      ? 'Respondido'
                      : f.status === 'archived'
                      ? 'Arquivado'
                      : f.open_count > 0
                      ? `Aberto ${f.open_count}×`
                      : 'Não aberto'}
                  </span>
                  {f.status === 'pending' && f.last_opened_at && (
                    <div
                      className="mt-1 text-[11px] text-muted-foreground"
                      title={f.referrer ? `Origem: ${f.referrer}` : undefined}
                    >
                      Última abertura: {new Date(f.last_opened_at).toLocaleString('pt-BR')}
                      {f.referrer && (
                        <> · <span className="italic">{shortReferrer(f.referrer)}</span></>
                      )}
                    </div>
                  )}
                  {f.status === 'submitted' && f.submitted_at && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Enviado: {new Date(f.submitted_at).toLocaleString('pt-BR')}
                    </div>
                  )}
                </td>
                <td className="p-3 text-muted-foreground">
                  {new Date(f.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="p-3 text-muted-foreground">
                  {f.expires_at ? new Date(f.expires_at).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    {f.status === 'pending' && (
                      <Button variant="ghost" size="sm" onClick={() => copyLink(f.token)}>
                        <Copy className="mr-1 h-3.5 w-3.5" /> Link
                      </Button>
                    )}
                    {f.status === 'submitted' && (
                      <Button variant="ghost" size="sm" onClick={() => setViewingId(f.id)}>
                        <Eye className="mr-1 h-3.5 w-3.5" /> Ver
                      </Button>
                    )}
                    {f.status !== 'archived' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => archiveM.mutate(f.id)}
                      >
                        <Archive className="mr-1 h-3.5 w-3.5" /> Arquivar
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {formsQ.data && formsQ.data.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                  <Link2 className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  Nenhum formulário enviado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!viewingId} onOpenChange={(o) => !o && setViewingId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Respostas do formulário</DialogTitle>
          </DialogHeader>
          {viewQ.data && (
            <div className="grid gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Paciente</p>
                <p className="font-medium">{viewQ.data.patients?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Formulário</p>
                <p className="font-medium">{viewQ.data.title}</p>
              </div>
              <div className="grid gap-2">
                {(viewQ.data.fields as { key: string; label: string }[]).map((f) => {
                  const v = (viewQ.data.responses as Record<string, unknown>)?.[f.key]
                  return (
                    <div key={f.key} className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs font-medium text-muted-foreground">{f.label}</p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {v === undefined || v === null || v === '' ? '—' : String(v)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
