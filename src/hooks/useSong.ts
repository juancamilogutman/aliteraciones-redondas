import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Album, Alliteration, Band, Song } from '@/lib/database.types'

interface SongState {
  band: Band | null
  album: Album | null
  song: Song | null
  alliterations: Alliteration[]
  loading: boolean
  error: string | null
}

type FetchResult =
  | { ok: true; band: Band; album: Album; song: Song; alliterations: Alliteration[] }
  | { ok: false; band: Band | null; album: Album | null; error: string }

async function fetchSongBundle(
  bandSlug: string,
  albumSlug: string,
  songSlug: string,
): Promise<FetchResult> {
  const { data: band } = await supabase
    .from('bands')
    .select('id, slug, name, display_order')
    .eq('slug', bandSlug)
    .maybeSingle()
  if (!band) return { ok: false, band: null, album: null, error: 'Banda no encontrada' }

  const { data: album } = await supabase
    .from('albums')
    .select('id, band_id, slug, name, year, display_order')
    .eq('band_id', (band as Band).id)
    .eq('slug', albumSlug)
    .maybeSingle()
  if (!album) return { ok: false, band: band as Band, album: null, error: 'Álbum no encontrado' }

  const { data: song } = await supabase
    .from('songs')
    .select('id, album_id, slug, title, lyrics, track_number')
    .eq('album_id', (album as Album).id)
    .eq('slug', songSlug)
    .maybeSingle()
  if (!song) {
    return { ok: false, band: band as Band, album: album as Album, error: 'Canción no encontrada' }
  }

  const { data: alliterations, error } = await supabase
    .from('alliterations')
    .select('id, song_id, line_index, markup, created_at, created_by')
    .eq('song_id', (song as Song).id)
    .order('line_index')

  if (error) {
    return { ok: false, band: band as Band, album: album as Album, error: error.message }
  }

  return {
    ok: true,
    band: band as Band,
    album: album as Album,
    song: song as Song,
    alliterations: (alliterations ?? []) as Alliteration[],
  }
}

export function useSong(
  bandSlug: string | undefined,
  albumSlug: string | undefined,
  songSlug: string | undefined,
) {
  const [state, setState] = useState<SongState>({
    band: null,
    album: null,
    song: null,
    alliterations: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!bandSlug || !albumSlug || !songSlug) return
    let cancelled = false
    fetchSongBundle(bandSlug, albumSlug, songSlug).then((res) => {
      if (cancelled) return
      if (res.ok) {
        setState({
          band: res.band,
          album: res.album,
          song: res.song,
          alliterations: res.alliterations,
          loading: false,
          error: null,
        })
      } else {
        setState({
          band: res.band,
          album: res.album,
          song: null,
          alliterations: [],
          loading: false,
          error: res.error,
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [bandSlug, albumSlug, songSlug])

  const reload = useCallback(async () => {
    if (!bandSlug || !albumSlug || !songSlug) return
    const res = await fetchSongBundle(bandSlug, albumSlug, songSlug)
    if (res.ok) {
      setState({
        band: res.band,
        album: res.album,
        song: res.song,
        alliterations: res.alliterations,
        loading: false,
        error: null,
      })
    } else {
      setState({
        band: res.band,
        album: res.album,
        song: null,
        alliterations: [],
        loading: false,
        error: res.error,
      })
    }
  }, [bandSlug, albumSlug, songSlug])

  const updateLyrics = useCallback(async (lyrics: string) => {
    if (!state.song) throw new Error('No hay canción cargada')
    const { error } = await supabase
      .from('songs')
      .update({ lyrics })
      .eq('id', state.song.id)
    if (error) throw error
    await reload()
  }, [state.song, reload])

  const upsertAlliteration = useCallback(async (lineIndex: number, markup: string) => {
    if (!state.song) throw new Error('No hay canción cargada')
    const { error } = await supabase
      .from('alliterations')
      .upsert(
        { song_id: state.song.id, line_index: lineIndex, markup },
        { onConflict: 'song_id,line_index' },
      )
    if (error) throw error
    await reload()
  }, [state.song, reload])

  const deleteAlliteration = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('alliterations')
      .delete()
      .eq('id', id)
    if (error) throw error
    await reload()
  }, [reload])

  return {
    ...state,
    reload,
    updateLyrics,
    upsertAlliteration,
    deleteAlliteration,
  }
}
