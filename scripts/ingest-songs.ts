/**
 * Ingesta de canciones desde resources/base_ricotera.csv → Supabase.
 *
 *   npm run ingest
 *
 * Required env (en .env.local):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotente: hace upsert de songs por (album_id, slug).
 * Canciones cuyo título no aparezca en resources/song-album-map.json se
 * omiten con una advertencia.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import Papa from 'papaparse'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(ROOT, '.env.local') })
dotenv.config({ path: path.join(ROOT, '.env') })

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el env.')
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })

const BAND_SLUG = 'redonditos'

interface CsvRow {
  '': string
  autor: string
  titulo: string
  texto: string
}

interface AlbumMap {
  songs: Record<string, string>
}

function normalizeKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function slugify(input: string): string {
  return normalizeKey(input)
}

async function main(): Promise<void> {
  const csvPath = path.join(ROOT, 'resources', 'base_ricotera.csv')
  const mapPath = path.join(ROOT, 'resources', 'song-album-map.json')

  if (!fs.existsSync(csvPath)) throw new Error(`No existe: ${csvPath}`)
  if (!fs.existsSync(mapPath)) throw new Error(`No existe: ${mapPath}`)

  const csvText = fs.readFileSync(csvPath, 'utf8')
  const parsed = Papa.parse<CsvRow>(csvText, { header: true, skipEmptyLines: true })
  if (parsed.errors.length) {
    console.warn(`  ⚠ ${parsed.errors.length} fila(s) con problemas de parseo`)
  }
  const rows = parsed.data.filter((r) => r.titulo && r.texto)

  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8')) as AlbumMap
  const normalizedMap = new Map<string, string>()
  for (const [title, albumSlug] of Object.entries(map.songs)) {
    normalizedMap.set(normalizeKey(title), albumSlug)
  }

  // Look up band id
  const { data: band, error: bandErr } = await sb
    .from('bands')
    .select('id, slug')
    .eq('slug', BAND_SLUG)
    .maybeSingle()
  if (bandErr) throw new Error(`no se pudo leer band: ${bandErr.message}`)
  if (!band) throw new Error(`Banda con slug "${BAND_SLUG}" no encontrada. Corré supabase/schema.sql primero.`)

  // Pre-fetch albums and build a slug→id map
  const { data: albums, error: albErr } = await sb
    .from('albums')
    .select('id, slug')
    .eq('band_id', (band as { id: string }).id)
  if (albErr) throw new Error(`no se pudo leer albums: ${albErr.message}`)
  const albumIdBySlug = new Map<string, string>()
  for (const a of (albums ?? []) as Array<{ id: string; slug: string }>) {
    albumIdBySlug.set(a.slug, a.id)
  }

  const inserts: Array<{ album_id: string; slug: string; title: string; lyrics: string }> = []
  const skipped: string[] = []

  for (const row of rows) {
    const title = row.titulo.trim()
    const lyrics = row.texto.trim()
    const albumSlug = normalizedMap.get(normalizeKey(title))
    if (!albumSlug) {
      skipped.push(title)
      continue
    }
    const albumId = albumIdBySlug.get(albumSlug)
    if (!albumId) {
      console.warn(`  ⚠ Slug de álbum "${albumSlug}" no existe en DB (canción "${title}")`)
      continue
    }
    inserts.push({
      album_id: albumId,
      slug: slugify(title),
      title,
      lyrics,
    })
  }

  if (inserts.length === 0) {
    console.warn('  ⚠ No hay canciones para insertar.')
  } else {
    const { error } = await sb
      .from('songs')
      .upsert(inserts, { onConflict: 'album_id,slug' })
    if (error) throw new Error(`upsert songs: ${error.message}`)
    console.log(`  ✓ Insertadas/actualizadas ${inserts.length} canciones`)
  }

  if (skipped.length) {
    console.warn(`\n  ⚠ Omitidas (sin mapeo de álbum) — agregalas a resources/song-album-map.json:`)
    for (const t of skipped) console.warn(`    · ${t}`)
  }
}

main().catch((err) => {
  console.error('\n✗ Ingest falló:', err.message ?? err)
  process.exit(1)
})
