import { describe, expect, it } from 'vitest'
import { parseReplayCommandStream } from '../replayCommand'

function u16(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff]
}

function u32(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]
}

function queueCommand(): number[] {
  const payload = [
    16, // building attribute
    ...u32(321),
    0, // attribute tail byte
    1, // requested queue count
    ...u32(12345), // unit pbgid
    ...u32(1000), // player id in payload
    0,
  ]
  const body = [
    ...u16(24 + payload.length),
    3, // QueueUnitCommand
    0x80, // shift/queued flag
    ...u16(7),
    ...new Array(6).fill(0),
    ...new Array(8).fill(0),
    ...u32(1000),
    ...payload,
  ]
  return body
}

function tick(tick: number, commands: number[] = []): number[] {
  const block = commands.length
    ? [...u32(1), ...u32(0), ...u32(commands.length), ...commands]
    : []
  const body = [0x20, ...u32(tick), ...u32(0x12345678), ...u32(commands.length ? 1 : 0), ...block]
  return [...u32(0), ...u32(body.length), ...body]
}

describe('replay command stream parser', () => {
  it('decodes ticks, queue commands, and player command metrics', () => {
    const bytes = new Uint8Array([...tick(8, queueCommand()), ...tick(88)])
    const result = parseReplayCommandStream(bytes, 0)

    expect(result.coverage).toBe('full')
    expect(result.ticksParsed).toBe(2)
    expect(result.commandCount).toBe(1)
    expect(result.durationSec).toBe(11)
    expect(result.events[0]).toMatchObject({
      timeSec: 1,
      playerId: 1000,
      commandType: 3,
      commandName: 'queue-unit',
      queued: true,
      pbgid: 12345,
      productionBuildingId: 321,
      queueCount: 1,
    })
    expect(result.players[0]).toMatchObject({
      playerId: 1000,
      commandCount: 1,
      knownCommandCount: 1,
      unknownCommandCount: 0,
      commandGapCount: 0,
      knownCommandPct: 100,
      activityWindows: [
        {
          startSec: 0,
          commandCount: 1,
          knownCommandPct: 100,
        },
      ],
    })
  })

  it('exposes five-minute activity windows for late-game drop-off reads', () => {
    const bytes = new Uint8Array([
      ...tick(8, queueCommand()),
      ...tick(2408, queueCommand()),
    ])
    const result = parseReplayCommandStream(bytes, 0)
    const player = result.players[0]!
    expect(player.activityWindows).toHaveLength(2)
    expect(player.activityWindows[0]).toMatchObject({ startSec: 0, commandCount: 1 })
    expect(player.activityWindows[1]).toMatchObject({ startSec: 300, commandCount: 1 })
    expect(player.activityDropPct).not.toBeNull()
  })

  it('reports a partial result instead of reading past a damaged record', () => {
    const bytes = new Uint8Array([...tick(8), 0, 0, 0, 0, 0xff, 0xff, 0xff, 0x7f])
    const result = parseReplayCommandStream(bytes, 0)

    expect(result.ticksParsed).toBe(1)
    expect(result.coverage).toBe('partial')
    expect(result.dataGaps.some((gap) => gap.code === 'truncated-record')).toBe(true)
  })
})
