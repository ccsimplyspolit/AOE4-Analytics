import { describe, expect, it } from 'vitest'
import { comparePlayerToBuild, selectReferenceBuild } from '../buildOrderComparison'
import type { BuildOrder } from '../buildOrderSchema'
import type { PlayerSummary } from '../statsSummary'

const reference: BuildOrder = {
  name: 'Test Feudal',
  civilization: 'English',
  build_order: [
    {
      population_count: 6,
      villager_count: 6,
      age: 1,
      resources: { food: 6, wood: 0, gold: 0, stone: 0 },
      notes: ['Build a House'],
      time: '0:00',
    },
    {
      population_count: 12,
      villager_count: 12,
      age: 2,
      resources: { food: 6, wood: 3, gold: 3, stone: 0 },
      notes: ['Build Council Hall and age up.'],
      time: '1:00',
    },
  ],
}

function player(buildOrder: PlayerSummary['buildOrder']): PlayerSummary {
  return {
    playerId: 1,
    name: 'Player',
    profileId: 10,
    civToken: 'english',
    totals: null,
    villagersLost: null,
    buildOrder,
    resources: [],
    scores: [],
  }
}

describe('comparePlayerToBuild', () => {
  it('flags an observable action that happened outside the timing tolerance', () => {
    const audit = comparePlayerToBuild({
      player: player([
        { timeSec: 10, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_eng', name: 'Villager' },
        { timeSec: 190, playerId: 1, category: 'building', blueprint: 'building_council_hall', name: 'Council Hall' },
      ]),
      civ: 'english',
      reference,
    })

    expect(audit.actions.some((action) => action.status === 'late')).toBe(true)
    expect(audit.issues.some((issue) => issue.kind === 'action-timing')).toBe(true)
  })

  it('reports late age-up and missing observable actions', () => {
    const audit = comparePlayerToBuild({
      player: player([
        { timeSec: 30, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_eng', name: 'Villager' },
        { timeSec: 130, playerId: 1, category: 'building', blueprint: 'building_council_hall', name: 'Council Hall' },
      ]),
      civ: 'english',
      reference,
    })

    expect(audit.report).not.toBeNull()
    expect(audit.actions.some((action) => action.status === 'missing')).toBe(true)
    expect(audit.issues.some((issue) => issue.kind === 'age-up')).toBe(true)
  })

  it('does not compare a player without a compatible reference build', () => {
    const audit = comparePlayerToBuild({ player: player([]), civ: null, reference: null })
    expect(audit.report).toBeNull()
    expect(audit.issues[0]?.kind).toBe('coverage')
  })

  it('keeps an unknown landmark measurement unavailable instead of calling it a mistake', () => {
    const audit = comparePlayerToBuild({
      player: player([
        { timeSec: 20, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_eng', name: 'Villager' },
      ]),
      civ: 'english',
      reference,
    })

    expect(audit.report?.checkpoints.some((checkpoint) => checkpoint.kind === 'ageup' && checkpoint.ok === null)).toBe(true)
    expect(audit.issues.some((issue) => issue.kind === 'age-up')).toBe(false)
    expect(audit.coverage.confidence).toBe('medium')
  })

  it('exposes confirmed positives separately from improvements', () => {
    const positiveReference: BuildOrder = {
      ...reference,
      build_order: reference.build_order.map((step, index) =>
        index === 1 ? { ...step, notes: ['Build Council Hall and age up.'] } : step,
      ),
    }
    const audit = comparePlayerToBuild({
      player: player([
        { timeSec: 10, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_eng', name: 'Villager' },
        { timeSec: 55, playerId: 1, category: 'building', blueprint: 'building_council_hall', name: 'Council Hall' },
      ]),
      civ: 'english',
      reference: positiveReference,
    })

    expect(audit.strengths.length).toBeGreaterThan(0)
    expect(audit.strengths.some((finding) => finding.kind === 'timing')).toBe(true)
    expect(audit.improvements.every((issue) => issue.kind !== 'coverage')).toBe(true)
  })
})

describe('selectReferenceBuild', () => {
  it('prefers a matchup-tagged build over a generic civ build', () => {
    const generic: BuildOrder = { ...reference, name: 'Generic', opponentCivilization: null }
    const matchup: BuildOrder = { ...reference, name: 'Vs French', opponentCivilization: 'French' }
    const selection = selectReferenceBuild([generic, matchup], {
      civ: 'english',
      opponentCivilizations: ['french'],
    })

    expect(selection.reference?.name).toBe('Vs French')
    expect(selection.reason).toBe('matchup')
  })

  it('uses the observed event timeline to infer the likely build', () => {
    const archer: BuildOrder = {
      ...reference,
      name: 'Archer pressure',
      build_order: reference.build_order.map((step, index) =>
        index === 1 ? { ...step, notes: ['Train Archer.'] } : step,
      ),
    }
    const horseman: BuildOrder = {
      ...reference,
      name: 'Horseman pressure',
      build_order: reference.build_order.map((step, index) =>
        index === 1 ? { ...step, notes: ['Train Horseman.'] } : step,
      ),
    }
    const selection = selectReferenceBuild([horseman, archer], {
      civ: 'english',
      player: player([
        { timeSec: 30, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_eng', name: 'Villager' },
        { timeSec: 60, playerId: 1, category: 'unit', blueprint: 'unit_archer_1_eng', name: 'Archer' },
      ]),
    })

    expect(selection.reference?.name).toBe('Archer pressure')
    expect(selection.reason).toBe('observed')
    expect(selection.observedFitScore).toBeGreaterThan(0)
    expect(selection.observedConfidence).not.toBe('none')
  })

  it('prioritizes an exact linked VOD build over generic references', () => {
    const videoBuild: BuildOrder = { ...reference, name: 'VOD extracted opener', origin: 'video', video: 'https://twitch.tv/videos/123' }
    const selection = selectReferenceBuild([reference], {
      civ: 'english',
      preferredBuild: videoBuild,
      player: player([]),
    })

    expect(selection.reference?.name).toBe('VOD extracted opener')
    expect(selection.reason).toBe('video')
  })
})
