import { describe, it, expect } from 'vitest'
import { BUNDLED_BUILD_ORDERS } from '@data/buildOrders'
import { extractBuildTargets } from '../buildIcons'

const bundledSteps = BUNDLED_BUILD_ORDERS.flatMap((build) => build.build_order)
const bundledStepChunks = Array.from(
  { length: Math.ceil(bundledSteps.length / 40) },
  (_, index) => bundledSteps.slice(index * 40, (index + 1) * 40),
)

describe('extractBuildTargets', () => {
  it('pulls buildings and units from prose notes', () => {
    const labels = extractBuildTargets([
      'Build a Military School and train Spearmen.',
    ]).map((t) => t.label)
    expect(labels).toContain('Military School')
    expect(labels).toContain('Spearman')
  })

  it('does not mistake "Archery Range" for an archer unit', () => {
    expect(extractBuildTargets(['Add an Archery Range.']).map((t) => t.label)).toEqual([
      'Archery Range',
    ])
  })

  it('dedups repeats and caps results', () => {
    const t = extractBuildTargets(['House, house, mill, mill, barracks, stable, dock'], 3)
    expect(t).toHaveLength(3)
  })

  it('returns empty for no matches or no notes', () => {
    expect(extractBuildTargets(['Send all villagers to sheep.'])).toEqual([])
    expect(extractBuildTargets(undefined)).toEqual([])
  })

  it('produces a bundled (vendored) icon url for each known target', () => {
    const t = extractBuildTargets(['Build a Barracks.'])
    // Vendored asset, not a data.aoe4world.com fetch — icons must render
    // offline / instantly at match start.
    expect(t[0]!.url).toMatch(/barracks\.png$/)
    expect(t[0]!.url).not.toMatch(/^https:/)
  })

  it('extracts localized Russian buildings and units', () => {
    const targets = extractBuildTargets([
      'Построй дом и казарму, поставь ТЦ и конюшню, затем подготовь копейщиков и лучника.',
    ], 8)

    expect(targets.map((target) => target.label)).toEqual(
      expect.arrayContaining(['Дом', 'Казармы', 'Городской центр', 'Конюшня', 'Копейщик', 'Лучник']),
    )
    expect(targets.every((target) => !target.url.startsWith('https:'))).toBe(true)
  })

  it('uses the shared entity parser for long-tail units and buildings', () => {
    const targets = extractBuildTargets(['Repair the Varangian Warcamp, then train Mangudai.'])

    expect(targets.map((target) => target.label)).toEqual(
      expect.arrayContaining(['Varangian Warcamp', 'Mangudai']),
    )
    expect(targets.every((target) => !target.url.startsWith('https:'))).toBe(true)
  })

  bundledStepChunks.forEach((steps, index) => {
    it(`keeps bundled build steps offline-renderable (chunk ${index + 1})`, () => {
    const targets = steps.flatMap((step) => extractBuildTargets(step.notes))

    expect(steps.length).toBeGreaterThan(0)
    expect(targets.length).toBeGreaterThan(0)
    expect(targets.every((target) => !target.url.startsWith('https:'))).toBe(true)
    }, 120_000)
  })
})
