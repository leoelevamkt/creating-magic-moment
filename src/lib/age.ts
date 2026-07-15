export function formatAge(birthISO: string | null | undefined): string {
  if (!birthISO) return '—'
  const b = new Date(birthISO)
  if (Number.isNaN(b.getTime())) return '—'
  const now = new Date()
  let years = now.getFullYear() - b.getFullYear()
  let months = now.getMonth() - b.getMonth()
  if (now.getDate() < b.getDate()) months -= 1
  if (months < 0) {
    years -= 1
    months += 12
  }
  if (years < 0) return '—'
  if (years < 2) {
    const total = years * 12 + months
    if (total <= 0) return 'menos de 1 mês'
    return `${total} ${total === 1 ? 'mês' : 'meses'}`
  }
  if (months === 0) return `${years} anos`
  return `${years} anos e ${months} ${months === 1 ? 'mês' : 'meses'}`
}

export function ageYears(birthISO: string | null | undefined): number | null {
  if (!birthISO) return null
  const b = new Date(birthISO)
  if (Number.isNaN(b.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}
