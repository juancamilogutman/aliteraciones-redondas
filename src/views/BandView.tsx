import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { useBandWithAlbums } from '@/hooks/useDiscography'
import { useAuth } from '@/hooks/useAuth'
import { canDelete, createAlbum, deleteAlbum, swapDisplayOrder, updateAlbum } from '@/lib/disco'
import { slugify, uniqueSlug } from '@/lib/slug'
import { IconButton } from '@/components/IconButton'
import type { Album } from '@/lib/database.types'

export function BandView() {
  const { bandSlug } = useParams<{ bandSlug: string }>()
  const { band, albums, loading, error, reload } = useBandWithAlbums(bandSlug)
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

  if (loading) return <p className="text-slate-500 dark:text-slate-400">Cargando…</p>
  if (error || !band) return <p className="text-rose-600 dark:text-rose-400">{error ?? 'Banda no encontrada'}</p>

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          <Link to="/" className="hover:underline">← Bandas</Link>
        </p>
        <div className="mt-1 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">{band.name}</h2>
          {isEditor && !adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Plus className="size-4" />
              Agregar álbum
            </button>
          )}
        </div>
      </div>

      {adding && (
        <AlbumForm
          onCancel={() => setAdding(false)}
          onSubmit={async ({ name, year, slug }) => {
            const order = (albums[albums.length - 1]?.display_order ?? -1) + 1
            await withReload(() =>
              createAlbum(band.id, name, uniqueSlug(slug, albums.map((a) => a.slug)), year, order),
            )
            setAdding(false)
          }}
        />
      )}

      {albums.length === 0 && !adding ? (
        <p className="text-slate-500 dark:text-slate-400">Sin álbumes.</p>
      ) : (
        <ul className="space-y-2">
          {albums.map((album, i) => {
            const isEditing = editingId === album.id
            const canDel = canDelete(album, user?.id ?? null, isSuperadmin)
            if (isEditing) {
              return (
                <li key={album.id}>
                  <AlbumForm
                    initial={album}
                    onCancel={() => setEditingId(null)}
                    onSubmit={async ({ name, year, slug }) => {
                      await withReload(() => updateAlbum(album.id, { name, year, slug }))
                      setEditingId(null)
                    }}
                  />
                </li>
              )
            }
            return (
              <li
                key={album.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <Link
                  to={`/${band.slug}/${album.slug}`}
                  className="flex flex-1 items-baseline justify-between gap-3 hover:underline"
                >
                  <span className="font-medium">{album.name}</span>
                  {album.year && <span className="text-xs text-slate-500 dark:text-slate-400">{album.year}</span>}
                </Link>
                {isEditor && (
                  <div className="flex items-center gap-1">
                    <IconButton
                      label="Subir"
                      icon={ChevronUp}
                      disabled={busy || i === 0}
                      onClick={() => withReload(() => swapDisplayOrder('albums', album, albums[i - 1]))}
                    />
                    <IconButton
                      label="Bajar"
                      icon={ChevronDown}
                      disabled={busy || i === albums.length - 1}
                      onClick={() => withReload(() => swapDisplayOrder('albums', album, albums[i + 1]))}
                    />
                    <IconButton
                      label="Editar"
                      icon={Pencil}
                      disabled={busy}
                      onClick={() => setEditingId(album.id)}
                    />
                    <IconButton
                      label={canDel ? 'Eliminar' : 'No podés eliminar álbumes de otros'}
                      icon={Trash2}
                      disabled={busy || !canDel}
                      destructive
                      onClick={async () => {
                        if (!confirm(`¿Eliminar "${album.name}"? Esto borra también sus canciones y aliteraciones.`)) return
                        await withReload(() => deleteAlbum(album.id))
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

interface AlbumFormProps {
  initial?: Album
  onCancel: () => void
  onSubmit: (values: { name: string; year: number | null; slug: string }) => Promise<void>
}

function AlbumForm({ initial, onCancel, onSubmit }: AlbumFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [year, setYear] = useState<string>(initial?.year ? String(initial.year) : '')
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
          await onSubmit({
            name: name.trim(),
            year: year.trim() ? Number(year) : null,
            slug: slug.trim() || slugify(name),
          })
        } catch (e) {
          setErr(e instanceof Error ? e.message : 'Error')
        } finally {
          setBusy(false)
        }
      }}
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_100px_180px]">
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
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Año</span>
          <input
            type="number"
            min="1900"
            max="2100"
            value={year}
            onChange={(e) => setYear(e.target.value)}
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
