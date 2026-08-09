import { describe, expect, it } from 'vitest'
import { AOe4WorldReplayParser, makeReplayParserProvenance } from '../replayParserCompatibility'

describe('replay parser provenance', () => {
  it('exposes the pinned upstream parser revision', () => {
    expect(AOe4WorldReplayParser.source).toBe('aoe4world/replays-api')
    expect(AOe4WorldReplayParser.revision).toMatch(/^[0-9a-f]{40}$/)
    expect(AOe4WorldReplayParser.stpdVersions).toContain(2034)
  })

  it('deduplicates and sorts valid STPD versions without mutating input', () => {
    const versions = [2034, 2029, 2034, 0.5, Number.NaN]
    const provenance = makeReplayParserProvenance({
      stpdVersions: versions,
      strictPlayers: 2,
      totalPlayers: 2,
    })

    expect(provenance.stpdVersions).toEqual([2029, 2034])
    expect(versions).toEqual([2034, 2029, 2034, 0.5, Number.NaN])
  })

  it('marks complete player coverage as full-summary', () => {
    expect(
      makeReplayParserProvenance({ stpdVersions: [2034], strictPlayers: 4, totalPlayers: 4 })
        .coverage,
    ).toBe('full-summary')
  })

  it('marks partial player coverage as mixed', () => {
    expect(
      makeReplayParserProvenance({ stpdVersions: [2034], strictPlayers: 2, totalPlayers: 4 })
        .coverage,
    ).toBe('mixed')
  })

  it('uses timelines-only when no strict player summary is available', () => {
    expect(
      makeReplayParserProvenance({ stpdVersions: [], strictPlayers: 0, totalPlayers: 4 }).coverage,
    ).toBe('timelines-only')
    expect(
      makeReplayParserProvenance({ stpdVersions: [], strictPlayers: 0, totalPlayers: 0 }).remote,
    ).toBe(false)
  })

  it('preserves remote provenance explicitly', () => {
    expect(
      makeReplayParserProvenance({
        stpdVersions: [2030],
        strictPlayers: 1,
        totalPlayers: 1,
        remote: true,
      }),
    ).toMatchObject({ source: 'aoe4world/replays-api', remote: true })
  })
})
