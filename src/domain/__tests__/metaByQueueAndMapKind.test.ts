import { describe, expect, it } from 'vitest'
import {
  mapsForMetaQueue,
  metaSlicesForQueue,
  rankedMapKind,
} from '../metaByQueueAndMapKind'

describe('metaByQueueAndMapKind', () => {
  it('puts West Lake in open, not naval — ranked docks are off', () => {
    expect(rankedMapKind('West Lake')).toBe('open')
  })

  it('splits the 1v1 pool into open, closed, hybrid, and naval', () => {
    const slices = metaSlicesForQueue('solo')
    const byKind = Object.fromEntries(slices.map((slice) => [slice.kind, slice.maps]))
    expect(byKind.open).toEqual(expect.arrayContaining(['Dry Arabia', 'West Lake', 'Ancient Spires']))
    expect(byKind.closed).toEqual(expect.arrayContaining(['Flankwoods', 'Hidden Valley']))
    expect(byKind.hybrid).toEqual(expect.arrayContaining(['Golden Heights', 'Gorge', 'Relic River']))
    expect(byKind.naval).toEqual(['Ocean Gateway'])
    expect(slices.every((slice) => slice.civs.length > 0)).toBe(true)
  })

  it('shares the team pool across 2v2 / 3v3 / 4v4', () => {
    expect(mapsForMetaQueue('team_2v2')).toEqual(mapsForMetaQueue('team_3v3'))
    expect(mapsForMetaQueue('team_3v3')).toEqual(mapsForMetaQueue('team_4v4'))
    const team = metaSlicesForQueue('team_2v2')
    const naval = team.find((slice) => slice.kind === 'naval')
    expect(naval?.maps).toEqual(expect.arrayContaining(['Nagari', 'Boulder Bay']))
    expect(team.find((slice) => slice.kind === 'hybrid')?.maps).toContain('Cliffside')
  })
})
