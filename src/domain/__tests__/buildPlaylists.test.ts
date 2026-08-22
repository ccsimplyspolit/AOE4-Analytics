import { describe, expect, it } from 'vitest'
import type { BuildOrder } from '../buildOrderSchema'
import {
  addBuildToPlaylist,
  createBuildPlaylist,
  exportPlaylistToOverlayCycle,
  removeBuildFromPlaylist,
  reorderPlaylistBuilds,
  resolvePlaylistBuilds,
  updateBuildPlaylistMeta,
} from '../buildPlaylists'

describe('Build Playlists Domain Engine', () => {
  it('creates a playlist with initial builds and unique ID', () => {
    const pl = createBuildPlaylist('OOTD Mastery', {
      description: 'Core 1v1 and 2v2 builds for Order of the Dragon',
      civ: 'order_of_the_dragon',
      initialBuilds: ['Feudal Archer Rush', 'Fast Castle Burgrave'],
    })

    expect(pl.id).toMatch(/^pl_\d+/)
    expect(pl.name).toBe('OOTD Mastery')
    expect(pl.civ).toBe('order_of_the_dragon')
    expect(pl.buildOrderIds).toHaveLength(2)
  })

  it('adds and removes builds preventing duplicates', () => {
    let pl = createBuildPlaylist('English Practice')
    pl = addBuildToPlaylist(pl, 'Longbow Rush')
    pl = addBuildToPlaylist(pl, '2TC King Opening')
    // Duplicate add should be ignored
    pl = addBuildToPlaylist(pl, 'Longbow Rush')

    expect(pl.buildOrderIds).toEqual(['Longbow Rush', '2TC King Opening'])

    pl = removeBuildFromPlaylist(pl, 'Longbow Rush')
    expect(pl.buildOrderIds).toEqual(['2TC King Opening'])
  })

  it('reorders builds and updates metadata', () => {
    let pl = createBuildPlaylist('French Openings', {
      initialBuilds: ['Build A', 'Build B', 'Build C'],
    })

    pl = reorderPlaylistBuilds(pl, ['Build C', 'Build A', 'Build B'])
    expect(pl.buildOrderIds).toEqual(['Build C', 'Build A', 'Build B'])

    pl = updateBuildPlaylistMeta(pl, { name: 'French Master List', civ: 'french' })
    expect(pl.name).toBe('French Master List')
    expect(pl.civ).toBe('french')
  })

  it('resolves actual build objects and exports cycle', () => {
    const dummyBuilds: BuildOrder[] = [
      { name: 'Build 1', civilization: 'French', build_order: [] },
      { name: 'Build 2', civilization: 'French', build_order: [] },
      { name: 'Build 3', civilization: 'English', build_order: [] },
    ]

    const pl = createBuildPlaylist('Test PL', { initialBuilds: ['Build 2', 'Build 1'] })
    const resolved = resolvePlaylistBuilds(pl, dummyBuilds)

    expect(resolved).toHaveLength(2)
    expect(resolved[0]?.name).toBe('Build 2')
    expect(resolved[1]?.name).toBe('Build 1')

    const cycle = exportPlaylistToOverlayCycle(pl)
    expect(cycle).toEqual(['Build 2', 'Build 1'])
  })
})
