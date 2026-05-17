import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { useSong } from '@/hooks/useSong'
import { useAuth } from '@/hooks/useAuth'
import { AnnotationEditor } from '@/components/AnnotationEditor'
import { AlliterationView } from '@/components/AlliterationView'
import { LyricsEditor } from '@/components/LyricsEditor'

export function SongEditView() {
  const { bandSlug, albumSlug, songSlug } = useParams<{
    bandSlug: string
    albumSlug: string
    songSlug: string
  }>()
  const { isEditor, loading: authLoading } = useAuth()
  const {
    band,
    album,
    song,
    alliterations,
    loading,
    error,
    updateLyrics,
    upsertAlliteration,
    deleteAlliteration,
  } = useSong(bandSlug, albumSlug, songSlug)

  const [openLineIndex, setOpenLineIndex] = useState<number | null>(null)

  if (authLoading) return <p className="text-slate-500 dark:text-slate-400">Cargando…</p>
  if (!isEditor) return <Navigate to={`/${bandSlug}/${albumSlug}/${songSlug}`} replace />
  if (loading) return <p className="text-slate-500 dark:text-slate-400">Cargando…</p>
  if (error || !band || !album || !song) {
    return <p className="text-rose-600 dark:text-rose-400">{error ?? 'No encontrado'}</p>
  }

  const markupByLine = new Map<number, string>()
  const idByLine = new Map<number, string>()
  for (const a of alliterations) {
    markupByLine.set(a.line_index, a.markup)
    idByLine.set(a.line_index, a.id)
  }

  const lines = song.lyrics.split('\n')

  return (
    <article className="space-y-8">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          <Link to={`/${band.slug}/${album.slug}/${song.slug}`} className="hover:underline">
            ← Volver a la canción
          </Link>
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Editar: {song.title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{album.name} · {band.name}</p>
      </div>

      <section>
        <LyricsEditor
          key={song.id}
          initialLyrics={song.lyrics}
          onSave={async (next) => {
            await updateLyrics(next)
            setOpenLineIndex(null)
          }}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Aliteraciones por línea
        </h3>
        <ol className="space-y-1.5">
          {lines.map((line, i) => {
            if (line.trim() === '') {
              return <li key={i} className="h-2" aria-hidden />
            }
            const markup = markupByLine.get(i)
            const editing = openLineIndex === i
            return (
              <li
                key={i}
                className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 w-8 shrink-0 text-right font-mono text-xs text-slate-400">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    {markup ? (
                      <AlliterationView markup={markup} className="text-base" />
                    ) : (
                      <p className="text-base text-slate-700 dark:text-slate-200">{line}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {!editing && (
                      <button
                        type="button"
                        onClick={() => setOpenLineIndex(i)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Pencil className="size-3.5" />
                        {markup ? 'Editar' : 'Anotar'}
                      </button>
                    )}
                    {markup && !editing && (
                      <button
                        type="button"
                        onClick={async () => {
                          const id = idByLine.get(i)
                          if (!id) return
                          if (!confirm('¿Eliminar la anotación de esta línea?')) return
                          await deleteAlliteration(id)
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {editing && (
                  <div className="mt-3">
                    <AnnotationEditor
                      key={`${i}-${markup ?? line}`}
                      initialMarkup={markup ?? line}
                      onSave={async (next) => {
                        await upsertAlliteration(i, next)
                        setOpenLineIndex(null)
                      }}
                      onCancel={() => setOpenLineIndex(null)}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </section>
    </article>
  )
}
