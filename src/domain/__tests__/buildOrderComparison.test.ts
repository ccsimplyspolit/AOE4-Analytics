import { describe, expect, it } from 'vitest'
import {
  compareMatchPlayers,
  comparePlayerToBuild,
  overlayBuildForCiv,
  selectLiveOverlayBuild,
  selectReferenceBuild,
} from '../buildOrderComparison'
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

  it('does not report a perfect score when a timing checkpoint is unavailable', () => {
    const multiCheckpointReference: BuildOrder = {
      ...reference,
      build_order: [
        reference.build_order[0]!,
        { ...reference.build_order[0]!, villager_count: 8, population_count: 8, time: '1:00' },
        { ...reference.build_order[0]!, villager_count: 10, population_count: 10, time: '2:00' },
        {
          ...reference.build_order[0]!,
          villager_count: 9,
          population_count: 9,
          age: 2,
          time: '3:00',
        },
      ],
    }
    const audit = comparePlayerToBuild({
      player: player([
        { timeSec: 30, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_eng', name: 'Villager' },
        { timeSec: 90, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_eng', name: 'Villager' },
        { timeSec: 150, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_eng', name: 'Villager' },
        { timeSec: 210, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_eng', name: 'Villager' },
        { timeSec: 270, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_eng', name: 'Villager' },
      ]),
      civ: 'english',
      reference: multiCheckpointReference,
    })

    expect(audit.report?.score).toBe(75)
    expect(audit.coverage.gradeableCheckpoints).toBe(3)
    expect(audit.coverage.timedCheckpoints).toBe(4)
    expect(audit.coverage.confidence).toBe('medium')
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

describe('selectLiveOverlayBuild', () => {
  const mill: BuildOrder = {
    ...reference,
    name: 'Mill Hippodrome',
    civilization: 'Byzantines',
    opponentCivilization: ['English', 'Holy Roman Empire'],
  }
  const winery: BuildOrder = {
    ...reference,
    name: '3-stone Winery',
    civilization: 'Byzantines',
    opponentCivilization: ['French', "Jeanne d'Arc", 'Malians', 'Chinese'],
  }
  const generic: BuildOrder = {
    ...reference,
    name: '5 Cistern default',
    civilization: 'Byzantines',
    opponentCivilization: null,
  }

  it('keeps pool order when the opponent civ is still unknown', () => {
    expect(
      selectLiveOverlayBuild([generic, mill, winery], { civ: 'byzantines' })?.name,
    ).toBe('5 Cistern default')
  })

  it('selects the mill build against spear-opener civs and Winery against French', () => {
    expect(
      selectLiveOverlayBuild([generic, mill, winery], {
        civ: 'byzantines',
        opponentCivilizations: ['english'],
      })?.name,
    ).toBe('Mill Hippodrome')
    expect(
      selectLiveOverlayBuild([generic, mill, winery], {
        civ: 'byzantines',
        opponentCivilizations: ['french'],
      })?.name,
    ).toBe('3-stone Winery')
  })

  it('matches display-name tags against live slugs', () => {
    expect(
      selectLiveOverlayBuild([generic, mill, winery], {
        civ: 'byzantines',
        opponentCivilizations: ['jeanne_darc'],
      })?.name,
    ).toBe('3-stone Winery')
  })

  it('falls back to an untagged civ default when no matchup tag lists the opponent', () => {
    expect(
      selectLiveOverlayBuild([mill, winery, generic], {
        civ: 'byzantines',
        opponentCivilizations: ['zhu_xis_legacy'],
      })?.name,
    ).toBe('5 Cistern default')
  })

  it('does not keep a Macedonian Dynasty pin when the live civ is Byzantines', () => {
    const macedonian: BuildOrder = {
      ...reference,
      name: 'Makedonische Dynastie - Marinelord (FC)',
      civilization: 'Macedonian Dynasty',
    }
    expect(
      overlayBuildForCiv([macedonian, generic], [macedonian, generic], {
        civ: 'byzantines',
        selectedName: macedonian.name,
      })?.name,
    ).toBe('5 Cistern default')
    expect(
      selectLiveOverlayBuild([macedonian, generic], { civ: 'byzantines' })?.name,
    ).toBe('5 Cistern default')
  })
})

describe('compareMatchPlayers', () => {
  it('audits each player from that player row instead of reusing the subject timeline', () => {
    const multiCheckpointReference: BuildOrder = {
      ...reference,
      build_order: [
        reference.build_order[0]!,
        { ...reference.build_order[0]!, villager_count: 7, population_count: 7, time: '1:00' },
        { ...reference.build_order[0]!, villager_count: 8, population_count: 8, time: '2:00' },
      ],
    }
    const first = player([
      { timeSec: 30, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_eng', name: 'Villager' },
      { timeSec: 90, playerId: 1, category: 'unit', blueprint: 'unit_villager_1_eng', name: 'Villager' },
    ])
    const second = { ...player([]), playerId: 2, profileId: 20, name: 'Opponent' }
    const audits = compareMatchPlayers({
      players: [first, second],
      builds: [multiCheckpointReference],
      myCiv: 'english',
      myProfileId: 10,
    })

    expect(audits).toHaveLength(2)
    expect(audits[0]?.player.profileId).toBe(10)
    expect(audits[0]?.report?.score).toBe(100)
    expect(audits[1]?.player.profileId).toBe(20)
    expect(audits[1]?.report?.score).toBeNull()
    expect(audits[1]?.coverage.eventCount).toBe(0)
  })
})
