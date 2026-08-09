import { describe, expect, it } from 'vitest'
import { normalizeAoE4IconToken, resolveAoE4Icon } from '../manifest'

describe('AoE4 icon manifest', () => {
  it('normalizes RTS_Overlay tokens from imported builds', () => {
    expect(normalizeAoE4IconToken('@unit_infantry/spearman-1.webp@')).toBe(
      'unit-infantry/spearman-1',
    )
  })

  it('resolves units, buildings, technologies, and native resources offline', () => {
    expect(resolveAoE4Icon('@unit_infantry/spearman-1.webp@')).toBeTruthy()
    expect(resolveAoE4Icon('@landmark_french/school-of-cavalry.webp@')).toBeTruthy()
    expect(resolveAoE4Icon('@technology_economy/wheelbarrow.webp@')).toBeTruthy()
    expect(resolveAoE4Icon('@resource/resource_food.webp@')).toBeTruthy()
    expect(resolveAoE4Icon('@unit_worker/villager.webp@')).toBeTruthy()
    expect(resolveAoE4Icon('@building_macedonian/varangian_warcamp.webp@')).toBeTruthy()
    expect(resolveAoE4Icon('civilization_flag/mac')).toBeTruthy()
    expect(resolveAoE4Icon('age/age_4')).toBeTruthy()
    expect(resolveAoE4Icon('https://data.aoe4world.com/images/buildings/grand-winery-1.png')).toBeTruthy()
    expect(resolveAoE4Icon('buildings/Imperial Hippodrome')).toBeTruthy()
  })

  it('returns null for an unknown token instead of inventing a broken URL', () => {
    expect(resolveAoE4Icon('@unit_unknown/not-in-the-catalogue.webp@')).toBeNull()
  })
})
