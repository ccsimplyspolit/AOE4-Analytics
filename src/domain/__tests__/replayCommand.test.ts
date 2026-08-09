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
  const block = commands.length ? [...u32(1), ...u32(0), ...u32(commands.length), ...commands] : []
  const body = [0x20, ...u32(tick), ...u32(0x12345678), ...u32(commands.length ? 1 : 0), ...block]
  return [...u32(0), ...u32(body.length), ...body]
}

function uString(value: string): number[] {
  const bytes: number[] = []
  for (const char of value) {
    const code = char.charCodeAt(0)
    bytes.push(code & 0xff, (code >>> 8) & 0xff)
  }
  return [...u32(value.length), ...bytes]
}

function chatRecord(): number[] {
  const payload = [...u32(2), ...u32(0), ...u32(0), ...uString('Alice'), ...uString('gg')]
  const body = [...u32(1), ...u32(payload.length), ...payload]
  const size = body.length
  return [...u32(size), ...body]
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
      eventIndex: 0,
      selectedUnitCount: 0,
      actionCategory: 'production',
      decodeLevel: 'exact',
      payloadHex: expect.any(String),
      payloadHexTruncated: false,
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

  it('journals every decoded action even when the UI preview is capped', () => {
    const journal: number[] = []
    const bytes = new Uint8Array([
      ...tick(8, queueCommand()),
      ...tick(16, queueCommand()),
      ...tick(24, queueCommand()),
    ])
    const result = parseReplayCommandStream(bytes, 0, {
      maxEvents: 1,
      onEvent: (event) => journal.push(event.eventIndex),
    })

    expect(result.events).toHaveLength(1)
    expect(result.eventsTruncated).toBe(true)
    expect(result.commandCount).toBe(3)
    expect(journal).toEqual([0, 1, 2])
    expect(result.events[0]?.payloadHexTruncated).toBe(false)
  })

  it('decodes chat records with their wire-order size/type header', () => {
    const result = parseReplayCommandStream(new Uint8Array([...tick(16), ...chatRecord(), ...tick(24)]), 0)

    expect(result.coverage).toBe('full')
    expect(result.recordsParsed).toBe(3)
    expect(result.chat).toEqual([
      expect.objectContaining({ timeSec: 2, mode: 2, playerName: 'Alice', message: 'gg' }),
    ])
  })

  it('exposes five-minute activity windows for late-game drop-off reads', () => {
    const bytes = new Uint8Array([...tick(8, queueCommand()), ...tick(2408, queueCommand())])
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
