export interface Band {
  id: string
  slug: string
  name: string
  display_order: number
  created_by: string | null
}

export interface Album {
  id: string
  band_id: string
  slug: string
  name: string
  year: number | null
  display_order: number
  created_by: string | null
}

export interface Song {
  id: string
  album_id: string
  slug: string
  title: string
  lyrics: string
  track_number: number | null
  created_by: string | null
}

export interface Alliteration {
  id: string
  song_id: string
  line_index: number
  markup: string
  created_at: string
  created_by: string | null
}

export type EditorRole = 'admin' | 'superadmin'
