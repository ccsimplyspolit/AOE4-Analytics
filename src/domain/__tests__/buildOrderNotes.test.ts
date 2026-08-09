import { describe, expect, it } from 'vitest'
import { BUNDLED_BUILD_ORDERS } from '@data/buildOrders'
import { resolveAoE4Icon } from '@data/vendor/aoe4-icons/manifest'
import { parseBuildOrderDisplayNote } from '../buildOrderNotes'

describe('build-order note iconification', () => {
  it('adds icons to ordinary prose for resources, actions, ages, and units', () => {
    const parts = parseBuildOrderDisplayNote(
      'Go age 2 with 4 villager from food, then queue horseman and rally to gold.',
    )
    const icons = parts.filter((part) => part.type === 'icon')

    expect(icons.map((part) => (part.type === 'icon' ? part.label : ''))).toEqual(
      expect.arrayContaining(['Feudal Age', 'Villager', 'Food', 'Horseman', 'Rally point', 'Gold']),
    )
    expect(icons.every((part) => part.type === 'icon' && resolveAoE4Icon(part.path))).toBe(true)
  })

  it('recognizes HUD entities used in macro instructions', () => {
    const parts = parseBuildOrderDisplayNote(
      'Do not leave idle vills. Keep the TC producing until population cap, then add a second town center.',
    )
    const icons = parts.filter((part) => part.type === 'icon')

    expect(icons.map((part) => (part.type === 'icon' ? part.label : ''))).toEqual(
      expect.arrayContaining(['Idle Villager', 'Town Center', 'Population Cap']),
    )
    expect(icons.every((part) => part.type === 'icon' && resolveAoE4Icon(part.path))).toBe(true)
  })

  it('uses current explorer records for buildings and technologies', () => {
    const parts = parseBuildOrderDisplayNote(
      'Repair the varangian warcamp, build a house, and get scale barding 2.',
    )
    const icons = parts.filter((part) => part.type === 'icon')

    expect(icons.map((part) => (part.type === 'icon' ? part.label : ''))).toEqual(
      expect.arrayContaining(['Varangian Warcamp', 'House', 'Scale Barding (2/6)']),
    )
    expect(icons.every((part) => part.type === 'icon' && resolveAoE4Icon(part.path))).toBe(true)
  })

  it('covers common shorthand and resource wording used by imported builds', () => {
    const parts = parseBuildOrderDisplayNote(
      'Send 3 vills to the woodline, keep the vil on fish, then age-up with farms and boar nearby.',
    )
    const icons = parts.filter((part) => part.type === 'icon')

    expect(icons.map((part) => (part.type === 'icon' ? part.label : ''))).toEqual(
      expect.arrayContaining(['Villager', 'Wood', 'Fish', 'Age up', 'Farm', 'Boar']),
    )
    expect(icons.every((part) => part.type === 'icon' && resolveAoE4Icon(part.path))).toBe(true)
  })

  it('recognizes localized Russian build-order wording', () => {
    const parts = parseBuildOrderDisplayNote(
      'Отправь 4 сельских жителя на еду, 2 крестьянина на золото и переходи в эпоху 2. Затем поставь лучника и рыцаря.',
    )
    const icons = parts.filter((part) => part.type === 'icon')

    expect(icons.map((part) => (part.type === 'icon' ? part.label : ''))).toEqual(
      expect.arrayContaining(['Villager', 'Food', 'Gold', 'Feudal Age', 'Лучник', 'Рыцарь']),
    )
    expect(icons.every((part) => part.type === 'icon' && resolveAoE4Icon(part.path))).toBe(true)
  })

  it('keeps every bundled build order renderable', () => {
    const notes = BUNDLED_BUILD_ORDERS.flatMap((build) =>
      build.build_order.flatMap((step) => step.notes),
    )
    const iconParts = notes.flatMap((note) =>
      parseBuildOrderDisplayNote(note).filter((part) => part.type === 'icon'),
    )

    expect(notes.length).toBeGreaterThan(0)
    expect(iconParts.length).toBeGreaterThan(0)
    expect(
      iconParts.every((part) => {
        if (part.type !== 'icon') return false
        const source = resolveAoE4Icon(part.path)
        return typeof source === 'string' && !source.startsWith('http')
      }),
    ).toBe(true)
  }, 30_000)

  it('keeps explicit provider icon tokens intact', () => {
    const parts = parseBuildOrderDisplayNote('5 @unit_worker/villager.webp@ on @resource/resource_gold.webp@')

    expect(parts).toContainEqual({ type: 'image', path: 'unit_worker/villager.webp' })
    expect(parts).toContainEqual({ type: 'image', path: 'resource/resource_gold.webp' })
  })
})
