import type { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  icon: LucideIcon
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
}

export function IconButton({ label, icon: Icon, onClick, disabled, destructive }: Props) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={
        destructive
          ? 'rounded-md border border-rose-300 p-1.5 text-rose-700 hover:bg-rose-50 disabled:opacity-30 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40'
          : 'rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
      }
    >
      <Icon className="size-4" />
    </button>
  )
}
