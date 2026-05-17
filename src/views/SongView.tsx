import { Link, useParams } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { useSong } from '@/hooks/useSong'
import { useAuth } from '@/hooks/useAuth'
import { AlliterationView } from '@/components/AlliterationView'

export function SongView() {
  const { bandSlug, albumSlug, songSlug } = useParams<{
    bandSlug: string
    albumSlug: string
    songSlug: string
  }>()
  const { band, album, song, alliterations, loading, error } = useSong(bandSlug, albumSlug, songSlug)
  const { isEditor } = useAuth()

  if (loading) return <p className="text-slate-500 dark:text-slate-400">Cargando…</p>
  if (error || !band || !album || !song) {
    return <p className="text-rose-600 dark:text-rose-400">{error ?? 'No encontrado'}</p>
  }

  const markupByLine = new Map<number, string>()
  for (const a of alliterations) markupByLine.set(a.line_index, a.markup)

  const lines = song.lyrics.split('\n')

  return (
    <article className="space-y-8">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          <Link to="/" className="hover:underline">Bandas</Link>{' '}/{' '}
          <Link to={`/${band.slug}`} className="hover:underline">{band.name}</Link>{' '}/{' '}
          <Link to={`/${band.slug}/${album.slug}`} className="hover:underline">{album.name}</Link>
        </p>
        <div className="mt-1 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">{song.title}</h2>
          {isEditor && (
            <Link
              to={`/${band.slug}/${album.slug}/${song.slug}/edit`}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Pencil className="size-4" />
              Editar
            </Link>
          )}
        </div>
      </div>

      <section className="space-y-1 rounded-lg border border-slate-200 bg-white p-6 text-lg leading-relaxed dark:border-slate-800 dark:bg-slate-900">
        {lines.map((line, i) => {
          const markup = markupByLine.get(i)
          if (line.trim() === '') {
            return <div key={i} className="h-4" />
          }
          if (markup) {
            return <AlliterationView key={i} markup={markup} />
          }
          return (
            <p key={i} className="text-slate-700 dark:text-slate-200">
              {line}
            </p>
          )
        })}
      </section>
    </article>
  )
}
