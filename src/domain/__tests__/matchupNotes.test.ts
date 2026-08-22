import { describe, expect, it } from 'vitest'
import {
  formatNoteKey,
  listAllNotes,
  normalizeNoteTarget,
  resolveActiveNotes,
  updateNoteInMap,
} from '../matchupNotes'

describe('Matchup Notes Domain Engine', () => {
  it('normalizes target names and generates keys correctly', () => {
    expect(normalizeNoteTarget('Order of the Dragon')).toBe('order_of_the_dragon')
    expect(normalizeNoteTarget('Dry Arabia (Ranked)')).toBe('dry_arabia_ranked')
    expect(formatNoteKey('civ', 'Rus')).toBe('civ:rus')
    expect(formatNoteKey('matchup', 'English', 'French')).toBe('matchup:english:french')
    expect(formatNoteKey('map', 'Altai')).toBe('map:altai')
  })

  it('resolves active notes for match context', () => {
    const notes = {
      'civ:rus': 'Early wooden wall around gold and watch out for scout deer bounties.',
      'matchup:byzantines:rus': 'Limit mercenary contracts until Tier 2 cistern is stable.',
      'map:dry_arabia': 'Center control is crucial; watch for forward towers.',
    }

    const resolved = resolveActiveNotes(notes, {
      myCiv: 'byzantines',
      oppCiv: 'rus',
      map: 'dry_arabia',
    })

    expect(resolved.hasAnyNotes).toBe(true)
    expect(resolved.civNote).toContain('Early wooden wall')
    expect(resolved.matchupNote).toContain('Limit mercenary contracts')
    expect(resolved.mapNote).toContain('Center control')
  })

  it('updates, deletes, and lists all notes properly', () => {
    let notes: Record<string, string> = {}
    notes = updateNoteInMap(notes, 'civ:french', 'Fast barracks to stop early knight harass.')
    expect(notes['civ:french']).toBe('Fast barracks to stop early knight harass.')

    const all = listAllNotes(notes)
    expect(all).toHaveLength(1)
    expect(all[0]?.type).toBe('civ')
    expect(all[0]?.label).toBe('vs french')

    // Deleting via empty update
    notes = updateNoteInMap(notes, 'civ:french', '   ')
    expect(notes['civ:french']).toBeUndefined()
    expect(listAllNotes(notes)).toHaveLength(0)
  })
})
