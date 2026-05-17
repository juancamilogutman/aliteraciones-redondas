import { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { AlliterationView } from '@/components/AlliterationView'
import { wrapSelection } from '@/lib/markup'
import { cn } from '@/lib/utils'

interface Props {
  initialMarkup?: string
  onSave: (markup: string) => Promise<void>
  onDelete?: () => Promise<void>
  onCancel?: () => void
}

const COLORS = [1, 2, 3, 4, 5] as const

export function AnnotationEditor({ initialMarkup = '', onSave, onDelete, onCancel }: Props) {
  const [markup, setMarkup] = useState(initialMarkup)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  function applyColor(color: number) {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    if (start === end) return
    const next = wrapSelection(markup, start, end, color)
    setMarkup(next)
    // restore cursor at the end of the wrapped region
    requestAnimationFrame(() => {
      const cursor = end + `{${color}:}`.length
      ta.focus()
      ta.setSelectionRange(cursor, cursor)
    })
  }

  async function handleSave() {
    setBusy(true)
    setError(null)
    try {
      await onSave(markup.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    if (!confirm('¿Eliminar esta aliteración?')) return
    setBusy(true)
    setError(null)
    try {
      await onDelete()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Seleccioná letras de la línea y aplicales un color:
        </span>
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => applyColor(c)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <span className={cn('palette-swatch inline-block h-3 w-3 rounded-full', `color-${c}`)} />
            {c}
          </button>
        ))}
      </div>

      <textarea
        ref={taRef}
        value={markup}
        onChange={(e) => setMarkup(e.target.value)}
        placeholder="Por ejemplo: {1:L}{3:i}der {2:d}{3:ea}l{4:e}r"
        rows={3}
        className="w-full rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />

      <div>
        <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Vista previa</p>
        <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-950">
          {markup.trim() ? <AlliterationView markup={markup} /> : (
            <p className="text-sm italic text-slate-400">Escribí algo arriba para previsualizar.</p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        {onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
          >
            <Trash2 className="size-4" />
            Eliminar
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || !markup.trim()}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
