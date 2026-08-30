import { describe, expect, it } from 'vitest'
import { BUNDLED_BUILD_ORDERS } from '../buildOrders'
import { sanitizeBuildOrderVideos, videoMatchesBuildCiv } from '../buildOrderVideos'
import { embeddedVideoFromUrl } from '@domain/videoEmbed'
import { compactCivKey } from '@domain/videoEvidence'
import type { BuildOrder } from '@domain/buildOrderSchema'

function buildIdentity(civilization: string | string[], name: string): string {
  const labels = Array.isArray(civilization) ? civilization : [civilization]
  const compact = (value: string) =>
    value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}|]+/gu, '')
  return `${labels.map(compact).join('|')}::${compact(name)}`
}

describe('bundled build archive', () => {
  it('does not expose duplicate civilization/title entries', () => {
    const identities = BUNDLED_BUILD_ORDERS.map((build) =>
      buildIdentity(build.civilization, build.name),
    )

    expect(new Set(identities).size).toBe(identities.length)
  })

  it('does not attach the HRE masterclass to Macedonian builds', () => {
    const macedonian = BUNDLED_BUILD_ORDERS.filter((build) => {
      const labels = Array.isArray(build.civilization) ? build.civilization : [build.civilization]
      return labels.some((label) => /macedonian/i.test(label))
    })
    expect(macedonian.length).toBeGreaterThan(0)
    for (const build of macedonian) {
      expect(build.video_evidence?.sources.some((source) => source.id === 'd_FEca71_Xo')).toBe(
        false,
      )
    }
    const reference = macedonian.find((build) => build.name === 'Macedonian Standard (Beasty)')
    expect(reference?.video).toBe('https://www.youtube.com/watch?v=GIErhV3Eeys')
    expect(
      macedonian.some((build) => /VortiX Feudal Varangian Guard/i.test(build.name)),
    ).toBe(true)
  })

  it('replaces an HRE masterclass glued onto a Macedonian build', () => {
    const cleaned = sanitizeBuildOrderVideos({
      name: 'Test Macedonian',
      civilization: 'Macedonian Dynasty',
      video: 'https://www.youtube.com/watch?v=d_FEca71_Xo',
      source: 'https://aoe4guides.com/x, https://www.youtube.com/watch?v=d_FEca71_Xo',
      description: 'See https://www.youtube.com/watch?v=d_FEca71_Xo',
      build_order: [
        {
          population_count: 6,
          villager_count: 6,
          age: 1,
          resources: { food: 6, wood: 0, gold: 0, stone: 0 },
          notes: ['Open'],
        },
      ],
    } satisfies BuildOrder)
    expect(cleaned.video).not.toContain('d_FEca71_Xo')
    expect(cleaned.source).not.toContain('d_FEca71_Xo')
    expect(cleaned.description).not.toContain('d_FEca71_Xo')
    expect(cleaned.video).toBe('https://www.youtube.com/watch?v=GIErhV3Eeys')
  })

  it('keeps a same-civ video and evidence on every bundled build', () => {
    const mismatches: string[] = []
    for (const build of BUNDLED_BUILD_ORDERS) {
      const labels = Array.isArray(build.civilization) ? build.civilization : [build.civilization]
      const civKeys = labels.map((label) => compactCivKey(label)).filter(Boolean)
      const label = `${labels.join('|')} :: ${build.name}`
      if (build.video) {
        const id = embeddedVideoFromUrl(build.video)?.videoId
        if (id && !videoMatchesBuildCiv(id, civKeys)) {
          mismatches.push(`video ${id} on ${label}`)
        }
      }
      for (const source of build.video_evidence?.sources ?? []) {
        if (!videoMatchesBuildCiv(source.id, civKeys, source.title)) {
          mismatches.push(`evidence ${source.id} (${source.title}) on ${label}`)
        }
      }
    }
    expect(mismatches).toEqual([])
  })

  it('bundles Valdemar Season 13 Byz Winery and mill openers from the Conqueror 3 VOD', () => {
    const winery = BUNDLED_BUILD_ORDERS.find((build) =>
      /Valdemar: Grand Winery 3 Stone/i.test(build.name),
    )
    const mill = BUNDLED_BUILD_ORDERS.find((build) =>
      /Valdemar: Hippodrome Mill/i.test(build.name),
    )
    expect(winery).toBeDefined()
    expect(mill).toBeDefined()
    expect(winery?.civilization).toBe('Byzantines')
    expect(mill?.civilization).toBe('Byzantines')
    expect(winery?.video).toContain('0pkvLN16f4o')
    expect(mill?.video).toContain('0pkvLN16f4o')
    expect(winery?.providerId).toBe('dbmBFjUqxyRYFSWCVHXH')
    expect(mill?.providerId).toBe('D7Jsk12Fl2FCyiJf7q9L')
    expect(winery?.build_order.length).toBeGreaterThan(10)
    expect(mill?.build_order.length).toBeGreaterThan(8)
    expect(winery?.video_evidence?.sources.some((source) => source.id === '0pkvLN16f4o')).toBe(
      true,
    )
    expect(mill?.video_evidence?.sources.some((source) => source.id === '0pkvLN16f4o')).toBe(true)
  })

  it('bundles timed Season 13 Macedonian Beasty, VortiX VG, and Valdemar openers', () => {
    const beasty = BUNDLED_BUILD_ORDERS.find((build) => build.name === 'Macedonian Standard (Beasty)')
    const vortix = BUNDLED_BUILD_ORDERS.find((build) =>
      /VortiX Feudal Varangian Guard/i.test(build.name),
    )
    const hippo = BUNDLED_BUILD_ORDERS.find((build) => /Valdemar: Hippodrome 2026/i.test(build.name))
    const winery = BUNDLED_BUILD_ORDERS.find((build) => /Valdemar: Feudal Winery/i.test(build.name))
    expect(beasty?.providerId).toBe('sJ31bLURiStxpn0XaKkE')
    expect(beasty?.build_order.length).toBeGreaterThan(15)
    expect(beasty?.video).toBe('https://www.youtube.com/watch?v=GIErhV3Eeys')
    expect(vortix?.providerId).toBe('RgHNHa5jDWnCw7pY67UL')
    expect(vortix?.video).toContain('OezixLpYQEw')
    expect(hippo?.providerId).toBe('HuzXbYxxy3LMgjhXA9n0')
    expect(hippo?.video).toContain('LKH4uwXd24E')
    expect(winery?.providerId).toBe('Z272XddhRKJ9qxjZCGpw')
    expect(winery?.video).toContain('zoA922O-HQM')
    expect(hippo?.build_order.length).toBeGreaterThan(8)
    expect(winery?.build_order.length).toBeGreaterThan(7)
  })
})
