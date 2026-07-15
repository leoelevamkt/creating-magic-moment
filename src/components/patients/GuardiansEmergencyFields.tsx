import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

export type GuardianForm = { name: string; phone: string; relation: string }
export type EmergencyContactForm = { name: string; phone: string; relation: string }

export type GuardiansEmergencyValue = {
  hasGuardians: boolean
  guardians: GuardianForm[]
  emergencyContact: EmergencyContactForm
}

export const EMPTY_GUARDIAN: GuardianForm = { name: '', phone: '+55 ', relation: '' }
export const EMPTY_EMERGENCY: EmergencyContactForm = { name: '', phone: '+55 ', relation: '' }

export const RELATION_OPTIONS = [
  'Mãe', 'Pai', 'Responsável legal', 'Avó', 'Avô', 'Tio(a)', 'Irmã(o)',
  'Cônjuge / companheiro(a)', 'Filho(a)', 'Amigo(a)', 'Cuidador(a)', 'Outro',
]

export function GuardiansEmergencyFields({
  value,
  onChange,
}: {
  value: GuardiansEmergencyValue
  onChange: (next: GuardiansEmergencyValue) => void
}) {
  const setHas = (v: boolean) => onChange({ ...value, hasGuardians: v, guardians: v && value.guardians.length === 0 ? [{ ...EMPTY_GUARDIAN }] : value.guardians })
  const setGuardian = (i: number, patch: Partial<GuardianForm>) => {
    const next = value.guardians.slice()
    next[i] = { ...next[i], ...patch }
    onChange({ ...value, guardians: next })
  }
  const removeGuardian = (i: number) => onChange({ ...value, guardians: value.guardians.filter((_, j) => j !== i) })
  const addGuardian = () => onChange({ ...value, guardians: [...value.guardians, { ...EMPTY_GUARDIAN }] })
  const setEmergency = (patch: Partial<EmergencyContactForm>) => onChange({ ...value, emergencyContact: { ...value.emergencyContact, ...patch } })

  return (
    <div className="sm:col-span-2 flex flex-col gap-6">
      <section className="rounded-xl border bg-muted/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Responsáveis</h3>
            <p className="text-xs text-muted-foreground">
              Para pacientes menores de idade ou que precisem de acompanhante.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={value.hasGuardians} onCheckedChange={(v) => setHas(!!v)} />
            Possui responsável(eis)
          </label>
        </div>

        {value.hasGuardians ? (
          <div className="mt-4 flex flex-col gap-4">
            {value.guardians.map((g, i) => (
              <div key={i} className="rounded-lg border bg-background p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Responsável {i + 1}</span>
                  {value.guardians.length > 1 ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeGuardian(i)}>
                      <Trash2 size={14} /> Remover
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Nome</Label>
                    <Input value={g.name} maxLength={120} onChange={(e) => setGuardian(i, { name: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Telefone / WhatsApp</Label>
                    <Input value={g.phone} maxLength={40} placeholder="🇧🇷 +55 (11) 90000-0000" onChange={(e) => setGuardian(i, { phone: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Relação com o paciente</Label>
                    <select
                      value={g.relation}
                      onChange={(e) => setGuardian(i, { relation: e.target.value })}
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">Selecione</option>
                      {RELATION_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={addGuardian} className="self-start">
              <Plus size={14} /> Adicionar responsável
            </Button>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border bg-muted/30 p-4">
        <h3 className="font-semibold">Contato de emergência</h3>
        <p className="text-xs text-muted-foreground">
          Pessoa de confiança para contatar em emergência. Não precisa ser o responsável.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>Nome</Label>
            <Input value={value.emergencyContact.name} maxLength={120} onChange={(e) => setEmergency({ name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Telefone / WhatsApp</Label>
            <Input value={value.emergencyContact.phone} maxLength={40} placeholder="🇧🇷 +55 (11) 90000-0000" onChange={(e) => setEmergency({ phone: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Relação com o paciente</Label>
            <select
              value={value.emergencyContact.relation}
              onChange={(e) => setEmergency({ relation: e.target.value })}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Selecione</option>
              {RELATION_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </section>
    </div>
  )
}

/** Sanitize UI state into payload accepted by the server function. */
export function toPatientContactPayload(v: GuardiansEmergencyValue) {
  const guardians = v.hasGuardians
    ? v.guardians
        .map((g) => ({ name: g.name.trim(), phone: g.phone.trim(), relation: g.relation.trim() }))
        .filter((g) => g.name && g.phone && g.relation)
    : []
  const ec = v.emergencyContact
  const emergencyContact = ec.name.trim() || ec.phone.trim() || ec.relation.trim()
    ? { name: ec.name.trim(), phone: ec.phone.trim(), relation: ec.relation.trim() }
    : null
  // Only send emergencyContact if all fields are present; otherwise null.
  const validEmergency = emergencyContact && emergencyContact.name && emergencyContact.phone && emergencyContact.relation
    ? emergencyContact
    : null
  return { hasGuardians: v.hasGuardians, guardians, emergencyContact: validEmergency }
}
