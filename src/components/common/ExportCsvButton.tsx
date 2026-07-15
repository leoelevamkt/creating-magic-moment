import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { exportToCsv, todayStamp, type CsvColumn } from '@/lib/csv'

export function ExportCsvButton<T>({
  rows,
  columns,
  filename,
  label = 'Exportar CSV',
  disabled,
  size = 'sm',
  variant = 'outline',
}: {
  rows: T[]
  columns: CsvColumn<T>[]
  filename: string
  label?: string
  disabled?: boolean
  size?: 'sm' | 'default' | 'lg' | 'icon'
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
}) {
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={disabled || rows.length === 0}
      onClick={() => exportToCsv(`${filename}-${todayStamp()}.csv`, rows, columns)}
      title={rows.length === 0 ? 'Sem dados para exportar' : label}
    >
      <Download /> {label}
    </Button>
  )
}
