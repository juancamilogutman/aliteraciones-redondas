import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Album, Band, Song } from '@/lib/database.types'

const BAND_COLS = 'id, slug, name, display_order, created_by'
const ALBUM_COLS = 'id, band_id, slug, name, year, display_order, created_by'
const SONG_COLS = 'id, album_id, slug, title, lyrics, track_number, created_by'

interface BandsState {
  bands: Band[]
  loading: boolean
  error: string | null
}

export function useBands() {
  const [state, setState] = useState<BandsState>({ bands: [], loading: true, error: null })

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('bands')
      .select(BAND_COLS)
      .order('display_order')
    if (error) {
      setState({ bands: [], loading: false, error: error.message })
    } else {
      setState({ bands: (data ?? []) as Band[], loading: false, error: null })
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('bands')
      .select(BAND_COLS)
      .order('display_order')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setState({ bands: [], loading: false, error: error.message })
        } else {
          setState({ bands: (data ?? []) as Band[], loading: false, error: null })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { ...state, reload: load }
}

interface BandWithAlbums {
  band: Band | null
  albums: Album[]
  loading: boolean
  error: string | null
}

async function fetchBandWithAlbums(bandSlug: string): Promise<BandWithAlbums> {
  const { data: band, error: bandErr } = await supabase
    .from('bands')
    .select(BAND_COLS)
    .eq('slug', bandSlug)
    .maybeSingle()
  if (bandErr || !band) {
    return { band: null, albums: [], loading: false, error: bandErr?.message ?? 'No encontrado' }
  }
  const { data: albums, error: albErr } = await supabase
    .from('albums')
    .select(ALBUM_COLS)
    .eq('band_id', (band as Band).id)
    .order('display_order')
  if (albErr) {
    return { band: band as Band, albums: [], loading: false, error: albErr.message }
  }
  return { band: band as Band, albums: (albums ?? []) as Album[], loading: false, error: null }
}

export function useBandWithAlbums(bandSlug: string | undefined) {
  const [state, setState] = useState<BandWithAlbums>({
    band: null,
    albums: [],
    loading: true,
    error: null,
  })

  const load = useCallback(async () => {
    if (!bandSlug) return
    const next = await fetchBandWithAlbums(bandSlug)
    setState(next)
  }, [bandSlug])

  useEffect(() => {
    if (!bandSlug) return
    let cancelled = false
    fetchBandWithAlbums(bandSlug).then((next) => {
      if (cancelled) return
      setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [bandSlug])

  return { ...state, reload: load }
}

interface AlbumWithSongs {
  band: Band | null
  album: Album | null
  songs: Song[]
  loading: boolean
  error: string | null
}

async function fetchAlbumWithSongs(bandSlug: string, albumSlug: string): Promise<AlbumWithSongs> {
  const { data: band } = await supabase
    .from('bands')
    .select(BAND_COLS)
    .eq('slug', bandSlug)
    .maybeSingle()
  if (!band) {
    return { band: null, album: null, songs: [], loading: false, error: 'Banda no encontrada' }
  }
  const { data: album } = await supabase
    .from('albums')
    .select(ALBUM_COLS)
    .eq('band_id', (band as Band).id)
    .eq('slug', albumSlug)
    .maybeSingle()
  if (!album) {
    return { band: band as Band, album: null, songs: [], loading: false, error: 'Álbum no encontrado' }
  }
  const { data: songs, error } = await supabase
    .from('songs')
    .select(SONG_COLS)
    .eq('album_id', (album as Album).id)
    .order('track_number', { nullsFirst: false })
    .order('title')
  return {
    band: band as Band,
    album: album as Album,
    songs: (songs ?? []) as Song[],
    loading: false,
    error: error?.message ?? null,
  }
}

export function useAlbumWithSongs(bandSlug: string | undefined, albumSlug: string | undefined) {
  const [state, setState] = useState<AlbumWithSongs>({
    band: null,
    album: null,
    songs: [],
    loading: true,
    error: null,
  })

  const load = useCallback(async () => {
    if (!bandSlug || !albumSlug) return
    const next = await fetchAlbumWithSongs(bandSlug, albumSlug)
    setState(next)
  }, [bandSlug, albumSlug])

  useEffect(() => {
    if (!bandSlug || !albumSlug) return
    let cancelled = false
    fetchAlbumWithSongs(bandSlug, albumSlug).then((next) => {
      if (cancelled) return
      setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [bandSlug, albumSlug])

  return { ...state, reload: load }
}
