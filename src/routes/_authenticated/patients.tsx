import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Plus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { createPatient, listPatients } from '@/lib/patients.functions'
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

export const Route = createFileRoute('/_authenticated/patients')({
  head: () => ({ meta: [{ title: 'Pacientes — NeuroFlux' }] }),
  component: PatientsPage,
})

function PatientsPage() {
  const list = useServerFn(listPatients)
  const create = useServerFn(createPatient)
  const qc = useQueryClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => list(),
  })

  const mutation = useMutation({
    mutationFn: (payload: {
      name: string
      birthDate: string
      cpf: string
      schooling: string
      city: string
      hypotheses: string
      notes: string
    }) => create({ data: payload }),
    onSuccess: () => {
      toast.success('Paciente cadastrado.')
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['patients'] })
      router.invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fd = new FormData(event.currentTarget)
    mutation.mutate({
      name: String(fd.get('name') ?? ''),
      birthDate: String(fd.get('birthDate') ?? ''),
      cpf: String(fd.get('cpf') ?? ''),
      schooling: String(fd.get('schooling') ?? ''),
      city: String(fd.get('city') ?? ''),
      hypotheses: String(fd.get('hypotheses') ?? ''),
      notes: String(fd.get('notes') ?? ''),
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
              <div className="flex justify-end sm:col-span-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Salvando…' : 'Salvar paciente'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </header>

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
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{format(new Date(p.birth_date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{p.city}</TableCell>
                  <TableCell>{p.schooling}</TableCell>
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

function Field({
  label,
  name,
  type = 'text',
  placeholder,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} placeholder={placeholder} required />
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
