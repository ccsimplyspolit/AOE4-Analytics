import { describe, expect, it } from 'vitest'
import { BUILD_CATALOG } from '@data/buildCatalog'
import { buildCatalogEntries } from '../buildCatalog'
import {
  hasBuildVideo,
  matchesBuildArchiveTextFilters,
  matchesBuildLibraryFilters,
} from '../buildLibraryFilters'
import type { BuildOrder } from '../buildOrderSchema'

function build(
  patch: string | undefined,
  season: number | undefined,
  map: string | null,
  video = '',
): BuildOrder {
  return {
    name: `${patch ?? 'none'}-${season ?? 'none'}`,
    civilization: 'English',
    patch,
    season,
    map,
    video,
    build_order: [
      {
        population_count: 6,
        villager_count: 6,
        age: 1,
        resources: { food: 6, wood: 0, gold: 0, stone: 0 },
        notes: [`Opening ${patch ?? 'none'} ${season ?? 'none'} ${map ?? 'none'}`],
        time: '0:00',
      },
    ],
  }
}

describe('build library filters', () => {
  it('keeps imported provider videos visible in the runtime catalogue', () => {
    const videoBacked = BUILD_CATALOG.filter((entry) => hasBuildVideo(entry))
    expect(videoBacked.length).toBeGreaterThan(0)
    expect(videoBacked.some((entry) => entry.videoUrl?.includes('youtube.com/watch?v='))).toBe(true)
  })

  it('recognizes direct provider videos, including AoE4Guides embeds and Twitch links in descriptions', () => {
    const [youtube] = buildCatalogEntries([
      build(undefined, 13, null, 'https://www.youtube.com/embed/dQw4w9WgXcQ'),
    ])
    const [twitch] = buildCatalogEntries([
      { ...build(undefined, 13, null), description: 'Watch https://www.twitch.tv/videos/123456789.' },
    ])
    expect(hasBuildVideo(youtube!)).toBe(true)
    expect(youtube?.videoUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(twitch?.videoUrl).toBe('https://www.twitch.tv/videos/123456789')
  })

  it('matches current patch, season and exact pool while keeping archetype-tagged maps usable', () => {
    const [current, old, unversioned, open] = buildCatalogEntries([
      build('16.2', 13, 'Dry Arabia'),
      build('15.0', 12, 'Dry Arabia'),
      build(undefined, undefined, 'Dry Arabia'),
      build(undefined, 13, 'Open'),
    ])
    const context = {
      currentPatch: '16.2.10604–11308',
      currentSeason: 13,
      soloMaps: ['Dry Arabia'],
      teamMaps: ['The Pit'],
    }
    const filter = {
      patch: 'current' as const,
      season: 'current' as const,
      mapPool: 'solo' as const,
    }
    expect(matchesBuildLibraryFilters(current!, filter, context)).toBe(true)
    expect(matchesBuildLibraryFilters(old!, filter, context)).toBe(false)
    expect(
      matchesBuildLibraryFilters(
        unversioned!,
        { ...filter, patch: 'unversioned', season: 'all' },
        context,
      ),
    ).toBe(true)
    expect(
      matchesBuildLibraryFilters(open!, { ...filter, patch: 'unversioned' }, context),
    ).toBe(true)
    expect(
      matchesBuildLibraryFilters(current!, { ...filter, mapPool: 'map:Dry Arabia' }, context),
    ).toBe(true)
    expect(
      matchesBuildLibraryFilters(open!, { ...filter, patch: 'unversioned', mapPool: 'map:Dry Arabia' }, context),
    ).toBe(false)
  })

  it('shares text, civ, opponent and provenance matching between Guides and Cellar', () => {
    const [entry] = buildCatalogEntries([
      {
        ...build('16.2', 13, 'Dry Arabia'),
        name: 'English pressure',
        opponentCivilization: 'French',
        origin: 'imported',
        description: 'Opening pressure with a fast second military building.',
      },
    ])
    expect(
      matchesBuildArchiveTextFilters(entry!, {
        query: 'second military',
        civilization: 'English',
        opponentCivilization: 'French',
        origin: 'imported',
      }),
    ).toBe(true)
    expect(
      matchesBuildArchiveTextFilters(entry!, { opponentCivilization: 'Delhi Sultanate' }),
    ).toBe(false)
  })
})
