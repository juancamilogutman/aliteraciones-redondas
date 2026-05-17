import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAlbumWithSongs } from '@/hooks/useDiscography'
import { useAuth } from '@/hooks/useAuth'
import { canDelete, createSong, deleteSong, swapTrackNumber, updateSong } from '@/lib/disco'
import { slugify } from '@/lib/slug'
import { IconButton } from '@/components/IconButton'
import type { Song } from '@/lib/database.types'

export function AlbumView() {
  const { bandSlug, albumSlug } = useParams<{ bandSlug: string; albumSlug: string }>()
  const { band, album, songs, loading, error, reload } = useAlbumWithSongs(bandSlug, albumSlug)
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
  if (error || !band || !album) {
    return <p className="text-rose-600 dark:text-rose-400">{error ?? 'No encontrado'}</p>
  }

  const orderedTrackRows = songs.map((s) => ({ id: s.id, track_number: s.track_number }))

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          <Link to="/" className="hover:underline">Bandas</Link>{' '}/{' '}
          <Link to={`/${band.slug}`} className="hover:underline">{band.name}</Link>
        </p>
        <div className="mt-1 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            {album.name}
            {album.year && <span className="ml-2 text-base font-normal text-slate-500 dark:text-slate-400">({album.year})</span>}
          </h2>
          {isEditor && !adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Plus className="size-4" />
              Agregar canción
            </button>
          )}
        </div>
      </div>

      {adding && (
        <SongForm
          onCancel={() => setAdding(false)}
          onSubmit={async ({ title, lyrics }) => {
            const nextTrack = Math.max(0, ...songs.map((s) => s.track_number ?? 0)) + 1
            await withReload(() => createSong(album.id, title, lyrics, nextTrack))
            setAdding(false)
          }}
        />
      )}

      {songs.length === 0 && !adding ? (
        <p className="text-slate-500 dark:text-slate-400">Sin canciones.</p>
      ) : (
        <ol className="space-y-1.5">
          {songs.map((song, i) => {
            const isEditing = editingId === song.id
            const canDel = canDelete(song, user?.id ?? null, isSuperadmin)
            if (isEditing) {
              return (
                <li key={song.id}>
                  <SongForm
                    initial={song}
                    onCancel={() => setEditingId(null)}
                    onSubmit={async ({ title, slug, trackNumber }) => {
                      await withReload(() => updateSong(song.id, { title, slug, track_number: trackNumber }))
                      setEditingId(null)
                    }}
                  />
                </li>
              )
            }
            return (
              <li
                key={song.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="w-6 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {song.track_number ?? i + 1}
                </span>
                <Link
                  to={`/${band.slug}/${album.slug}/${song.slug}`}
                  className="flex-1 font-medium hover:underline"
                >
                  {song.title}
                </Link>
                {isEditor && (
                  <div className="flex items-center gap-1">
                    <IconButton
                      label="Subir"
                      icon={ChevronUp}
                      disabled={busy || i === 0}
                      onClick={() => withReload(() => swapTrackNumber(album.id, orderedTrackRows, song.id, songs[i - 1].id))}
                    />
                    <IconButton
                      label="Bajar"
                      icon={ChevronDown}
                      disabled={busy || i === songs.length - 1}
                      onClick={() => withReload(() => swapTrackNumber(album.id, orderedTrackRows, song.id, songs[i + 1].id))}
                    />
                    <IconButton
                      label="Editar título / número"
                      icon={Pencil}
                      disabled={busy}
                      onClick={() => setEditingId(song.id)}
                    />
                    <IconButton
                      label={canDel ? 'Eliminar' : 'No podés eliminar canciones de otros'}
                      icon={Trash2}
                      disabled={busy || !canDel}
                      destructive
                      onClick={async () => {
                        if (!confirm(`¿Eliminar "${song.title}"? Se borran también sus aliteraciones.`)) return
                        await withReload(() => deleteSong(song.id))
                      }}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

interface SongFormProps {
  initial?: Song
  onCancel: () => void
  onSubmit: (values: { title: string; slug: string; lyrics: string; trackNumber: number | null }) => Promise<void>
}

function SongForm({ initial, onCancel, onSubmit }: SongFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [lyrics, setLyrics] = useState(initial?.lyrics ?? '')
  const [trackNumber, setTrackNumber] = useState<string>(initial?.track_number ? String(initial.track_number) : '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const isEdit = !!initial

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!title.trim()) return
        setBusy(true)
        setErr(null)
        try {
          await onSubmit({
            title: title.trim(),
            slug: slug.trim() || slugify(title),
            lyrics: lyrics,
            trackNumber: trackNumber.trim() ? Number(trackNumber) : null,
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
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Título</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400"># Pista</span>
          <input
            type="number"
            min="1"
            value={trackNumber}
            onChange={(e) => setTrackNumber(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Slug (opcional)</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={slugify(title) || 'auto'}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
      </div>
      {!isEdit && (
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Letra (opcional; podés agregarla y anotarla después)
          </span>
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            rows={6}
            className="w-full rounded-md border border-slate-300 bg-slate-50 p-3 font-sans text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
      )}
      {err && <p className="text-sm text-rose-600 dark:text-rose-400">{err}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          Cancelar
        </button>
        <button type="submit" disabled={busy || !title.trim()} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {busy ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear'}
        </button>
      </div>
    </form>
  )
}
