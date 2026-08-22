/**
 * Matchup and Map Notes (pure domain logic).
 *
 * Manages user-authored strategic notes attached to opponent civilizations,
 * specific 1v1 matchup pairs, and individual ranked/skirmish maps.
 */

export type NoteType = 'civ' | 'matchup' | 'map'

export interface MatchupNoteContext {
  myCiv?: string | null
  oppCiv?: string | null
  map?: string | null
}

export interface MatchupNoteItem {
  key: string
  type: NoteType
  label: string
  content: string
}

export interface ResolvedMatchupNotes {
  civNote: string
  matchupNote: string
  mapNote: string
  hasAnyNotes: boolean
}

/** Normalizes civ or map strings for consistent dictionary keys. */
export function normalizeNoteTarget(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** Generates canonical dictionary keys for notes. */
export function formatNoteKey(type: NoteType, target: string, secondaryTarget?: string): string {
  const norm1 = normalizeNoteTarget(target)
  if (type === 'matchup' && secondaryTarget) {
    const norm2 = normalizeNoteTarget(secondaryTarget)
    return `matchup:${norm1}:${norm2}`
  }
  return `${type}:${norm1}`
}

/**
 * Resolves all active notes applicable to the current match context.
 */
export function resolveActiveNotes(
  notes: Record<string, string> | undefined | null,
  context: MatchupNoteContext,
): ResolvedMatchupNotes {
  if (!notes || typeof notes !== 'object') {
    return { civNote: '', matchupNote: '', mapNote: '', hasAnyNotes: false }
  }

  const oppCivKey = context.oppCiv ? formatNoteKey('civ', context.oppCiv) : null
  const matchupKey =
    context.myCiv && context.oppCiv ? formatNoteKey('matchup', context.myCiv, context.oppCiv) : null
  const mapKey = context.map ? formatNoteKey('map', context.map) : null

  const civNote = oppCivKey ? (notes[oppCivKey] || '').trim() : ''
  const matchupNote = matchupKey ? (notes[matchupKey] || '').trim() : ''
  const mapNote = mapKey ? (notes[mapKey] || '').trim() : ''

  return {
    civNote,
    matchupNote,
    mapNote,
    hasAnyNotes: Boolean(civNote || matchupNote || mapNote),
  }
}

/**
 * Updates or sets a note in the dictionary, returning a new immutable dictionary.
 */
export function updateNoteInMap(
  notes: Record<string, string> | undefined | null,
  key: string,
  content: string,
): Record<string, string> {
  const next = { ...(notes || {}) }
  const trimmed = content.trim()
  if (!trimmed) {
    delete next[key]
  } else {
    next[key] = trimmed
  }
  return next
}

/**
 * Deletes a note by key from the dictionary.
 */
export function deleteNoteFromMap(
  notes: Record<string, string> | undefined | null,
  key: string,
): Record<string, string> {
  const next = { ...(notes || {}) }
  delete next[key]
  return next
}

/**
 * Lists all formatted notes for management tables or settings.
 */
export function listAllNotes(notes: Record<string, string> | undefined | null): MatchupNoteItem[] {
  if (!notes || typeof notes !== 'object') return []

  const items: MatchupNoteItem[] = []
  for (const [key, content] of Object.entries(notes)) {
    if (!content || !content.trim()) continue

    if (key.startsWith('civ:')) {
      const target = key.slice(4)
      items.push({
        key,
        type: 'civ',
        label: `vs ${target.replace(/_/g, ' ')}`,
        content: content.trim(),
      })
    } else if (key.startsWith('matchup:')) {
      const parts = key.slice(8).split(':')
      const p1 = parts[0] || 'unknown'
      const p2 = parts[1] || 'unknown'
      items.push({
        key,
        type: 'matchup',
        label: `${p1.replace(/_/g, ' ')} vs ${p2.replace(/_/g, ' ')}`,
        content: content.trim(),
      })
    } else if (key.startsWith('map:')) {
      const target = key.slice(4)
      items.push({
        key,
        type: 'map',
        label: target.replace(/_/g, ' '),
        content: content.trim(),
      })
    }
  }

  return items.sort((a, b) => a.label.localeCompare(b.label))
}
