import { describe, expect, it } from 'vitest'
import {
  parseOverlayBuild,
  parseSimpleBuildOrder,
  serializeOverlayBuild,
  serializeSimpleBuildOrder,
} from '../overlayBuild'
import type { BuildOrder } from '../buildOrderSchema'

const build: BuildOrder = {
  name: 'English test',
  civilization: 'English',
  build_order: [
    {
      age: 1,
      population_count: 6,
      villager_count: 6,
      resources: { food: 6, wood: 0, gold: 0, stone: 0, builder: -1 },
      notes: ['6 to sheep'],
      time: '0:00',
    },
  ],
}

describe('overlayBuild', () => {
  it('round-trips a normalized overlay build', () => {
    const parsed = parseOverlayBuild(serializeOverlayBuild(build))
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.value.schemaVersion).toBe(1)
  })

  it('rejects malformed overlay payloads', () => {
    expect(parseOverlayBuild('{"name":"missing steps"}').ok).toBe(false)
  })

  it('imports the simple TXT format with timings and safe hints', () => {
    const parsed = parseSimpleBuildOrder(
      ['English opening', '0:00 6 vills to sheep food: 6', '4:30 Age II wood: 3'].join('\n'),
    )
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.value.name).toBe('English opening')
      expect(parsed.value.build_order).toHaveLength(2)
      expect(parsed.value.build_order[1]).toMatchObject({
        time: '4:30',
        age: 2,
        resources: { wood: 3 },
      })
    }
  })

  it('preserves icon tokens when importing an overlay JSON build', () => {
    const parsed = parseOverlayBuild(
      JSON.stringify({
        ...build,
        build_order: [{ ...build.build_order[0]!, notes: ['@buildings/house@ then 2 to gold'] }],
      }),
    )
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.value.build_order[0]?.notes[0]).toContain('@buildings/house@')
  })

  it('rejects an empty TXT export', () => {
    expect(parseSimpleBuildOrder(' # notes only\n[metadata]')).toEqual({
      ok: false,
      errors: ['TXT build order is empty'],
    })
  })

  it('exports a readable TXT build without leaking icon-token syntax', () => {
    const text = serializeSimpleBuildOrder({
      ...build,
      strategy: 'Fast pressure',
      build_order: [
        {
          ...build.build_order[0]!,
          notes: ['@buildings/house@ then 2 to gold'],
          time: '0:00',
        },
      ],
    })
    expect(text).toContain('English test')
    expect(text).toContain('# Strategy: Fast pressure')
    expect(text).toContain('0:00 Age 1')
    expect(text).toContain('house then 2 to gold')
    expect(text).not.toContain('@buildings/')
  })
})
