import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Download, Plus, Upload, Users } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import * as XLSX from 'xlsx'
import { bulkCreatePatients, createPatient, listPatients } from '@/lib/patients.functions'
import {
  GuardiansEmergencyFields,
  EMPTY_EMERGENCY,
  toPatientContactPayload,
  type GuardiansEmergencyValue,
} from '@/components/patients/GuardiansEmergencyFields'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/_authenticated/patients/')({
  head: () => ({ meta: [{ title: 'Pacientes — NeuroFlux' }] }),
  component: PatientsPage,
})

function PatientsPage() {
  const list = useServerFn(listPatients)
  const create = useServerFn(createPatient)
  const qc = useQueryClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [contact, setContact] = useState<GuardiansEmergencyValue>({
    hasGuardians: false, guardians: [], emergencyContact: { ...EMPTY_EMERGENCY },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => list(),
  })

  type CreatePayload = {
    name: string;
    sex: 'feminino' | 'masculino' | 'outro' | 'nao_informado' | null;
    birthDate: string; cpf: string; schooling: string; city: string;
    hypotheses: string; notes: string;
    hasGuardians: boolean;
    guardians: { name: string; phone: string; relation: string }[];
    emergencyContact: { name: string; phone: string; relation: string } | null;
  }
  const mutation = useMutation({
    mutationFn: (payload: CreatePayload) => create({ data: payload }),
    onSuccess: () => {
      toast.success('Paciente cadastrado.')
      setOpen(false)
      setContact({ hasGuardians: false, guardians: [], emergencyContact: { ...EMPTY_EMERGENCY } })
      qc.invalidateQueries({ queryKey: ['patients'] })
      router.invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fd = new FormData(event.currentTarget)
    const contactPayload = toPatientContactPayload(contact)
    if (contact.hasGuardians && contactPayload.guardians.length === 0) {
      toast.error('Preencha ao menos um responsável ou desmarque "Possui responsável(eis)".')
      return
    }
    const sexRaw = String(fd.get('sex') ?? '')
    mutation.mutate({
      name: String(fd.get('name') ?? ''),
      sex: (sexRaw ? sexRaw : null) as CreatePayload['sex'],
      birthDate: String(fd.get('birthDate') ?? ''),
      cpf: String(fd.get('cpf') ?? ''),
      schooling: String(fd.get('schooling') ?? ''),
      city: String(fd.get('city') ?? ''),
      hypotheses: String(fd.get('hypotheses') ?? ''),
      notes: String(fd.get('notes') ?? ''),
      ...contactPayload,
    })
  }



  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Pacientes</p>
          <h1 className="font-serif text-3xl font-semibold text-foreground">
            Prontuários ativos
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportPatientsDialog
            onDone={() => {
              qc.invalidateQueries({ queryKey: ['patients'] })
              router.invalidate()
            }}
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button />}>
              <Plus />
              Novo paciente
            </DialogTrigger>
            <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">Cadastrar paciente</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="grid gap-5 py-2 sm:grid-cols-2">
                <Field label="Nome completo" name="name" />
                <Field label="Data de nascimento" name="birthDate" type="date" />
                <Field label="CPF" name="cpf" placeholder="000.000.000-00" />
                <Field label="Escolaridade" name="schooling" placeholder="Ex.: Ensino médio" />
                <Field label="Cidade" name="city" />
                <div />
                <Area label="Hipóteses diagnósticas" name="hypotheses" />
                <Area label="Observações clínicas" name="notes" />
                <GuardiansEmergencyFields value={contact} onChange={setContact} />
                <div className="flex justify-end sm:col-span-2">
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Salvando…' : 'Salvar paciente'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

      </header>

      <PatientsReportCards data={data ?? []} />

      <div className="rounded-2xl border bg-card">
        {isLoading ? (
          <p className="p-8 text-sm text-muted-foreground">Carregando pacientes…</p>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <Users className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum paciente cadastrado ainda. Comece adicionando o primeiro prontuário.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Nascimento</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Escolaridade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => router.navigate({ to: '/patients/$id', params: { id: p.id } })}
                >
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.birth_date ? format(new Date(p.birth_date), 'dd/MM/yyyy') : '—'}</TableCell>
                  <TableCell>{p.city ?? '—'}</TableCell>
                  <TableCell>{p.schooling ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

type PatientRow = Awaited<ReturnType<typeof listPatients>>[number]

function PatientsReportCards({ data }: { data: PatientRow[] }) {
  const total = data.length
  const active = data.filter((p) => p.status === 'active').length
  const archived = data.filter((p) => p.status === 'archived').length
  const discharged = data.filter((p) => p.status === 'discharged').length
  const minors = data.filter((p) => p.has_guardians).length
  const withEmergency = data.filter((p) => {
    const ec = p.emergency_contact as { name?: string } | null
    return !!ec && !!ec.name
  }).length
  const cards = [
    { label: 'Total', value: total },
    { label: 'Ativos', value: active },
    { label: 'Alta', value: discharged },
    { label: 'Arquivados', value: archived },
    { label: 'Com responsável', value: minors },
    { label: 'Contato de emergência', value: withEmergency },
  ]
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold">Relatório de pacientes</h2>
        <span className="text-xs text-muted-foreground">Visão geral atual</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="mt-1 font-serif text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required = false,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>
        {label}
        {required ? null : <span className="ml-1 text-xs font-normal text-muted-foreground">(opcional)</span>}
      </Label>
      <Input id={name} name={name} type={type} placeholder={placeholder} required={required} />
    </div>
  )
}

function Area({ label, name }: { label: string; name: string }) {
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} rows={3} />
    </div>
  )
}

// ============ Import from spreadsheet ============
type ImportRow = {
  name: string
  birthDate: string
  cpf: string
  schooling: string
  city: string
  hypotheses: string
  notes: string
  _error?: string
}

const HEADER_MAP: Record<string, keyof ImportRow> = {
  nome: 'name',
  'nome completo': 'name',
  paciente: 'name',
  name: 'name',
  nascimento: 'birthDate',
  'data de nascimento': 'birthDate',
  'data nascimento': 'birthDate',
  birthdate: 'birthDate',
  'birth date': 'birthDate',
  cpf: 'cpf',
  escolaridade: 'schooling',
  schooling: 'schooling',
  cidade: 'city',
  city: 'city',
  hipoteses: 'hypotheses',
  'hipóteses': 'hypotheses',
  'hipóteses diagnósticas': 'hypotheses',
  hypotheses: 'hypotheses',
  observacoes: 'notes',
  'observações': 'notes',
  'observações clínicas': 'notes',
  notes: 'notes',
}

function normalizeHeader(h: string): keyof ImportRow | null {
  const k = String(h ?? '').trim().toLowerCase()
  return HEADER_MAP[k] ?? null
}

function normalizeDate(v: unknown): string {
  if (v == null || v === '') return ''
  // Excel serial
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (d) return `${d.y.toString().padStart(4, '0')}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  const s = String(v).trim()
  // dd/mm/yyyy
  const br = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (br) {
    const [, dd, mm, yyyy] = br
    const y = yyyy.length === 2 ? `20${yyyy}` : yyyy
    return `${y}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return ''
}

function ImportPatientsDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const bulk = useServerFn(bulkCreatePatients)
  const mut = useMutation({
    mutationFn: (payload: ImportRow[]) =>
      bulk({
        data: {
          patients: payload.map((r) => ({
            name: r.name,
            birthDate: r.birthDate,
            cpf: r.cpf,
            schooling: r.schooling,
            city: r.city,
            hypotheses: r.hypotheses || null,
            notes: r.notes || null,
          })),
        },
      }),
    onSuccess: (res) => {
      toast.success(`${res.inserted} paciente(s) importado(s).`)
      setOpen(false)
      setRows([])
      setFileName('')
      onDone()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  async function handleFile(file: File) {
    setFileName(file.name)
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    if (raw.length === 0) {
      toast.error('Planilha vazia.')
      return
    }
    const headers = Object.keys(raw[0])
    const map = new Map<string, keyof ImportRow>()
    for (const h of headers) {
      const k = normalizeHeader(h)
      if (k) map.set(h, k)
    }
    const parsed: ImportRow[] = raw.map((r) => {
      const out: ImportRow = { name: '', birthDate: '', cpf: '', schooling: '', city: '', hypotheses: '', notes: '' }
      for (const [h, key] of map) {
        const v = r[h]
        if (key === 'birthDate') out[key] = normalizeDate(v)
        else out[key] = String(v ?? '').trim()
      }
      const missing: string[] = []
      if (!out.name || out.name.length < 2) missing.push('nome')
      if (!out.birthDate) missing.push('nascimento')
      if (!out.cpf) missing.push('cpf')
      if (!out.schooling) missing.push('escolaridade')
      if (!out.city) missing.push('cidade')
      if (missing.length) out._error = `Faltando: ${missing.join(', ')}`
      return out
    })
    setRows(parsed)
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['nome', 'nascimento', 'cpf', 'escolaridade', 'cidade', 'hipoteses', 'observacoes'],
      ['João da Silva', '15/03/1990', '000.000.000-00', 'Ensino médio', 'Curitiba', '', ''],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'pacientes')
    XLSX.writeFile(wb, 'modelo-pacientes.xlsx')
  }

  const valid = rows.filter((r) => !r._error)
  const invalid = rows.length - valid.length

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          setRows([])
          setFileName('')
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <Upload />
        Importar planilha
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Importar pacientes</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">Colunas aceitas (por cabeçalho):</p>
            <p className="mt-1 text-muted-foreground">
              nome · nascimento (dd/mm/aaaa ou aaaa-mm-dd) · cpf · escolaridade · cidade · hipoteses · observacoes
            </p>
            <div className="mt-2">
              <Button type="button" size="sm" variant="ghost" onClick={downloadTemplate}>
                <Download /> Baixar modelo .xlsx
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="patients-file">Arquivo Excel ou CSV</Label>
            <Input
              id="patients-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            {fileName ? <p className="text-xs text-muted-foreground">{fileName}</p> : null}
          </div>

          {rows.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p>
                  <span className="font-semibold">{rows.length}</span> linha(s) ·{' '}
                  <span className="text-emerald-600">{valid.length} válida(s)</span>
                  {invalid > 0 ? <span className="text-destructive"> · {invalid} com erro</span> : null}
                </p>
              </div>
              <div className="max-h-80 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Nascimento</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Escolaridade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 100).map((r, i) => (
                      <TableRow key={i} className={r._error ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-medium">{r.name || '—'}</TableCell>
                        <TableCell>{r.birthDate || '—'}</TableCell>
                        <TableCell>{r.cpf || '—'}</TableCell>
                        <TableCell>{r.city || '—'}</TableCell>
                        <TableCell>{r.schooling || '—'}</TableCell>
                        <TableCell>
                          {r._error ? (
                            <span className="text-xs text-destructive">{r._error}</span>
                          ) : (
                            <Badge variant="secondary">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rows.length > 100 ? (
                  <p className="border-t p-2 text-center text-xs text-muted-foreground">
                    Exibindo as 100 primeiras linhas. Todas as {rows.length} serão importadas.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              disabled={valid.length === 0 || mut.isPending}
              onClick={() => mut.mutate(valid)}
            >
              {mut.isPending ? 'Importando…' : `Importar ${valid.length} paciente(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

