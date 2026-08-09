import type { RankedMapPoolSnapshot } from './rankedMapPool'

export interface OfficialMapPoolPost {
  id: number
  link: string
  title: string
  date: string
  content: string
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#x27;|&#39;|&apos;/gi, "'")
    .replace(/&#x2F;|&#47;/gi, '/')
    .replace(/&#8217;|&#8216;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#8211;|&ndash;/gi, '–')
    .replace(/&#8212;|&mdash;/gi, '—')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
}

function cleanText(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function headingAndList(html: string, heading: RegExp): string[] {
  const headingMatch = new RegExp(
    `<h[1-6][^>]*>\\s*${heading.source}\\s*</h[1-6]>`,
    heading.flags.includes('i') ? heading.flags : `${heading.flags}i`,
  ).exec(html)
  if (!headingMatch) return []
  const list = html.slice(headingMatch.index + headingMatch[0].length).match(/<ul[^>]*>([\s\S]*?)<\/ul>/i)
  if (!list) return []
  return [...(list[1] ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => cleanText(match[1] ?? ''))
    .filter(Boolean)
}

function nextMonthStart(date: string): string {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00Z`)
  const next = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, 1))
  return next.toISOString().slice(0, 10)
}

function patchFromTitle(title: string): string | null {
  return title.match(/(?:patch|update)\s+([0-9]+(?:\.[0-9]+)+)/i)?.[1] ?? null
}

/** Parses the exact 1v1 + Team Game lists used in official patch posts. */
export function parseOfficialMapPoolPost(post: OfficialMapPoolPost): RankedMapPoolSnapshot | null {
  const html = decodeHtml(post.content)
  const marker = /<h[1-6][^>]*>\s*Ranked Map Pool\s*<\/h[1-6]>/i.exec(html)
  if (!marker) return null
  const region = html.slice(marker.index, marker.index + 20_000)
  const solo = headingAndList(region, /1v1:?\s*/i)
  const team = headingAndList(region, /Team Game:?\s*/i)
  if (solo.length !== 9 || team.length !== 9) return null
  if (new Set(solo).size !== 9 || new Set(team).size !== 9) return null
  const effectiveFrom = post.date.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) return null

  return {
    schemaVersion: 1,
    snapshotId: `official-post-${post.id}`,
    source: 'official-rotation-notice',
    sourceUrl: post.link,
    supportingSourceUrl: post.link,
    capturedAt: new Date(post.date).toISOString(),
    effectiveFrom,
    effectiveUntil: nextMonthStart(effectiveFrom),
    patch: patchFromTitle(cleanText(post.title)),
    solo,
    team,
  }
}
