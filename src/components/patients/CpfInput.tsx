import { forwardRef, useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'

export function formatCPF(value: string): string {
  const digits = (value ?? '').replace(/\D/g, '').slice(0, 11)
  const p1 = digits.slice(0, 3)
  const p2 = digits.slice(3, 6)
  const p3 = digits.slice(6, 9)
  const p4 = digits.slice(9, 11)
  let out = p1
  if (p2) out += '.' + p2
  if (p3) out += '.' + p3
  if (p4) out += '-' + p4
  return out
}

type Props = Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value' | 'defaultValue'> & {
  defaultValue?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export const CpfInput = forwardRef<HTMLInputElement, Props>(function CpfInput(
  { defaultValue, value, onChange, ...rest },
  ref,
) {
  const isControlled = value !== undefined
  const [internal, setInternal] = useState(() => formatCPF(String(defaultValue ?? '')))

  useEffect(() => {
    if (!isControlled && defaultValue !== undefined) {
      setInternal(formatCPF(String(defaultValue ?? '')))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue])

  const displayed = isControlled ? formatCPF(String(value ?? '')) : internal

  return (
    <Input
      ref={ref}
      inputMode="numeric"
      maxLength={14}
      placeholder="000.000.000-00"
      {...rest}
      value={displayed}
      onChange={(e) => {
        const formatted = formatCPF(e.target.value)
        e.target.value = formatted
        if (!isControlled) setInternal(formatted)
        onChange?.(e)
      }}
    />
  )
})
