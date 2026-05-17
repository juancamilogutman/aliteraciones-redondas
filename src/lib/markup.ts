export interface Segment {
  text: string
  color: number | null
}

const TOKEN = /\{(\d+):([^}]*)\}/g

export function parseMarkup(input: string): Segment[] {
  const segments: Segment[] = []
  let last = 0
  for (const match of input.matchAll(TOKEN)) {
    const start = match.index ?? 0
    if (start > last) {
      segments.push({ text: input.slice(last, start), color: null })
    }
    const color = Number.parseInt(match[1], 10)
    segments.push({ text: match[2], color: Number.isFinite(color) ? color : null })
    last = start + match[0].length
  }
  if (last < input.length) {
    segments.push({ text: input.slice(last), color: null })
  }
  return segments
}

export function wrapSelection(markup: string, start: number, end: number, color: number): string {
  if (start === end) return markup
  const before = markup.slice(0, start)
  const selected = markup.slice(start, end)
  const after = markup.slice(end)
  return `${before}{${color}:${selected}}${after}`
}
