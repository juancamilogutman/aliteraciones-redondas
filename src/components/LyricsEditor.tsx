import { useState } from 'react'
import { Save } from 'lucide-react'

interface Props {
  initialLyrics: string
  onSave: (lyrics: string) => Promise<void>
}

export function LyricsEditor({ initialLyrics, onSave }: Props) {
  const [draft, setDraft] = useState(initialLyrics)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const dirty = draft !== initialLyrics

  async function save() {
    setBusy(true)
    setMsg(null)
    try {
      await onSave(draft)
      setMsg('Letra guardada.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Letra
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Una línea vacía separa estrofas.</p>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={Math.max(8, Math.min(24, draft.split('\n').length + 1))}
        className="w-full rounded-md border border-slate-300 bg-slate-50 p-3 font-sans text-sm leading-relaxed focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
      <div className="flex items-center justify-end gap-3">
        {msg && <span className="text-xs text-slate-500 dark:text-slate-400">{msg}</span>}
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <Save className="size-4" />
          {busy ? 'Guardando…' : 'Guardar letra'}
        </button>
      </div>
    </div>
  )
}
