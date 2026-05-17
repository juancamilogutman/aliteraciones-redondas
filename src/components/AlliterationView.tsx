import { parseMarkup } from '@/lib/markup'
import { cn } from '@/lib/utils'

interface Props {
  markup: string
  className?: string
}

export function AlliterationView({ markup, className }: Props) {
  const segments = parseMarkup(markup)
  return (
    <p className={cn('aliteracion', className)}>
      {segments.map((seg, i) =>
        seg.color != null ? (
          <span key={i} className={`color-${seg.color}`}>
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </p>
  )
}
