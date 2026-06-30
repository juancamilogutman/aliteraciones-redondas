import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Bands
// ---------------------------------------------------------------------------

export async function createBand(name: string, slug: string, displayOrder: number): Promise<void> {
  const { error } = await supabase
    .from('bands')
    .insert({ name, slug, display_order: displayOrder })
  if (error) throw error
}

export async function updateBand(
  id: string,
  patch: { name?: string; slug?: string; display_order?: number },
): Promise<void> {
  const { error } = await supabase.from('bands').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteBand(id: string): Promise<void> {
  const { error } = await supabase.from('bands').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Albums
// ---------------------------------------------------------------------------

export async function createAlbum(
  bandId: string,
  name: string,
  slug: string,
  year: number | null,
  displayOrder: number,
): Promise<void> {
  const { error } = await supabase
    .from('albums')
    .insert({ band_id: bandId, name, slug, year, display_order: displayOrder })
  if (error) throw error
}

export async function updateAlbum(
  id: string,
  patch: { name?: string; slug?: string; year?: number | null; display_order?: number },
): Promise<void> {
  const { error } = await supabase.from('albums').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteAlbum(id: string): Promise<void> {
  const { error } = await supabase.from('albums').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Songs
// ---------------------------------------------------------------------------

export async function createSong(
  albumId: string,
  title: string,
  slug: string,
  lyrics: string,
  trackNumber: number | null,
): Promise<void> {
  const { error } = await supabase
    .from('songs')
    .insert({ album_id: albumId, title, slug, lyrics, track_number: trackNumber })
  if (error) throw error
}

export async function updateSong(
  id: string,
  patch: { title?: string; slug?: string; lyrics?: string; track_number?: number | null },
): Promise<void> {
  const { error } = await supabase.from('songs').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteSong(id: string): Promise<void> {
  const { error } = await supabase.from('songs').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Reorder helpers
// ---------------------------------------------------------------------------

type OrderedRow = { id: string; display_order: number }
type TrackRow = { id: string; track_number: number | null }

/**
 * Swap display_order between two rows in the same table. Two updates, not
 * atomic — fine for low-contention single-user editing.
 */
export async function swapDisplayOrder(
  table: 'bands' | 'albums',
  a: OrderedRow,
  b: OrderedRow,
): Promise<void> {
  const { error: e1 } = await supabase.from(table).update({ display_order: b.display_order }).eq('id', a.id)
  if (e1) throw e1
  const { error: e2 } = await supabase.from(table).update({ display_order: a.display_order }).eq('id', b.id)
  if (e2) throw e2
}

/**
 * Normalize track_numbers to 1..N preserving the given order, then return
 * the rebuilt list with non-null track_number on every entry. Useful before
 * a swap so swaps over NULL values behave intuitively.
 */
async function normalizeTracks(albumId: string, ordered: TrackRow[]): Promise<TrackRow[]> {
  const renumbered: TrackRow[] = ordered.map((r, i) => ({ id: r.id, track_number: i + 1 }))
  for (const r of renumbered) {
    if (ordered.find((o) => o.id === r.id)?.track_number !== r.track_number) {
      const { error } = await supabase
        .from('songs')
        .update({ track_number: r.track_number })
        .eq('id', r.id)
      if (error) throw error
    }
  }
  void albumId // touch param to keep signature meaningful in the future
  return renumbered
}

/**
 * Swap two songs by track_number. If either side is null, normalize the whole
 * list first so the result is deterministic.
 */
export async function swapTrackNumber(
  albumId: string,
  orderedSongs: TrackRow[],
  aId: string,
  bId: string,
): Promise<void> {
  let list = orderedSongs
  if (list.some((s) => s.track_number == null)) {
    list = await normalizeTracks(albumId, list)
  }
  const a = list.find((s) => s.id === aId)
  const b = list.find((s) => s.id === bId)
  if (!a || !b || a.track_number == null || b.track_number == null) return
  const { error: e1 } = await supabase.from('songs').update({ track_number: b.track_number }).eq('id', a.id)
  if (e1) throw e1
  const { error: e2 } = await supabase.from('songs').update({ track_number: a.track_number }).eq('id', b.id)
  if (e2) throw e2
}

// ---------------------------------------------------------------------------
// Ownership check (UI gating only — DB-side is enforced by RLS).
// ---------------------------------------------------------------------------

export function canDelete(row: { created_by: string | null }, userId: string | null, isSuperadmin: boolean): boolean {
  if (isSuperadmin) return true
  if (!userId) return false
  return row.created_by === userId
}
