import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Disc3, Pencil, Plus, Trash2 } from 'lucide-react'
import { useBands } from '@/hooks/useDiscography'
import { useAuth } from '@/hooks/useAuth'
import { canDelete, createBand, deleteBand, swapDisplayOrder, updateBand } from '@/lib/disco'
import { slugify, uniqueSlug } from '@/lib/slug'
import type { Band } from '@/lib/database.types'
import { IconButton } from '@/components/IconButton'

export function Home() {
  const { bands, loading, error, reload } = useBands()
  const { isEditor, isSuperadmin, user } = useAuth()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function withReload(fn: () => Promise<void>) {
    setBusy(true)
    try {
      await fn()
      await reload()
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-slate-500 dark:text-slate-400">Cargando bandas…</p>
  if (error) return <p className="text-rose-600 dark:text-rose-400">Error: {error}</p>

  return (
    <section className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Bandas</h2>
        {isEditor && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="size-4" />
            Agregar banda
          </button>
        )}
      </div>

      {adding && (
        <BandForm
          onCancel={() => setAdding(false)}
          onSubmit={async ({ name, slug }) => {
            const order = (bands[bands.length - 1]?.display_order ?? -1) + 1
            await withReload(() => createBand(name, uniqueSlug(slug, bands.map((b) => b.slug)), order))
            setAdding(false)
          }}
        />
      )}

      {bands.length === 0 && !adding ? (
        <p className="text-slate-500 dark:text-slate-400">
          No hay bandas cargadas todavía.
        </p>
      ) : (
        <ul className="space-y-2">
          {bands.map((band, i) => {
            const isEditing = editingId === band.id
            const canDel = canDelete(band, user?.id ?? null, isSuperadmin)
            if (isEditing) {
              return (
                <li key={band.id}>
                  <BandForm
                    initial={band}
                    onCancel={() => setEditingId(null)}
                    onSubmit={async ({ name, slug }) => {
                      await withReload(() => updateBand(band.id, { name, slug }))
                      setEditingId(null)
                    }}
                  />
                </li>
              )
            }
            return (
              <li
                key={band.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-rose-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-rose-600"
              >
                <Disc3 className="size-5 shrink-0 text-rose-600 dark:text-rose-400" />
                <Link to={`/${band.slug}`} className="flex-1 font-medium hover:underline">
                  {band.name}
                </Link>
                {isEditor && (
                  <div className="flex items-center gap-1">
                    <IconButton
                      label="Subir"
                      icon={ChevronUp}
                      disabled={busy || i === 0}
                      onClick={() => withReload(() => swapDisplayOrder('bands', band, bands[i - 1]))}
                    />
                    <IconButton
                      label="Bajar"
                      icon={ChevronDown}
                      disabled={busy || i === bands.length - 1}
                      onClick={() => withReload(() => swapDisplayOrder('bands', band, bands[i + 1]))}
                    />
                    <IconButton
                      label="Editar"
                      icon={Pencil}
                      disabled={busy}
                      onClick={() => setEditingId(band.id)}
                    />
                    <IconButton
                      label={canDel ? 'Eliminar' : 'No podés eliminar bandas de otros'}
                      icon={Trash2}
                      disabled={busy || !canDel}
                      destructive
                      onClick={async () => {
                        if (!confirm(`¿Eliminar "${band.name}"? Esto borra también sus álbumes y canciones.`)) return
                        await withReload(() => deleteBand(band.id))
                      }}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

interface BandFormProps {
  initial?: Band
  onCancel: () => void
  onSubmit: (values: { name: string; slug: string }) => Promise<void>
}

function BandForm({ initial, onCancel, onSubmit }: BandFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!name.trim()) return
        setBusy(true)
        setErr(null)
        try {
          await onSubmit({ name: name.trim(), slug: (slug.trim() || slugify(name)) })
        } catch (e) {
          setErr(e instanceof Error ? e.message : 'Error')
        } finally {
          setBusy(false)
        }
      }}
      className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3"
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_200px]">
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Nombre</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Slug (opcional)</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={slugify(name) || 'auto'}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
      </div>
      {err && <p className="text-sm text-rose-600 dark:text-rose-400">{err}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          Cancelar
        </button>
        <button type="submit" disabled={busy || !name.trim()} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {busy ? 'Guardando…' : initial ? 'Guardar' : 'Crear'}
        </button>
      </div>
    </form>
  )
}

