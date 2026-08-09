import { describe, expect, it } from 'vitest'
import { buildHudCommand, clampHudRoi, parseHudMessage } from '../hudProtocol'

describe('hudProtocol', () => {
  it('accepts versioned backend messages and rejects unknown types', () => {
    expect(
      parseHudMessage({ type: 'PING', version: 1, ts: 10, payload: { seq: 1 } }),
    ).not.toBeNull()
    expect(parseHudMessage({ type: 'NOPE', version: 1, ts: 10, payload: {} })).toBeNull()
    expect(parseHudMessage({ type: 'PING', version: 2, ts: 10, payload: { seq: 1 } })).toBeNull()
  })

  it('keeps calibrated ROI coordinates within the screen bounds', () => {
    const result = clampHudRoi({
      id: 'timer',
      name: 'Timer',
      kind: 'timer',
      rect: { x: -1, y: 0.4, w: 2, h: Number.NaN },
    })
    expect(result.rect).toEqual({ x: 0, y: 0.4, w: 1, h: 0 })
  })

  it('creates versioned control messages', () => {
    expect(buildHudCommand('PING', { seq: 7 }, 42)).toEqual({
      type: 'PING',
      version: 1,
      ts: 42,
      payload: { seq: 7 },
    })
  })
})
