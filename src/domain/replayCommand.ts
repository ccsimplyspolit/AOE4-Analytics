/**
 * Conservative decoder for the command stream at the end of an AoE4 `.rec`.
 *
 * The stream is not game memory and contains no live state: it is the recorded
 * deterministic input feed.  The layout is version-sensitive, so this module
 * only trusts fields documented by the AoE4World replay templates.  Unknown
 * command types are skipped by their declared size and reported in coverage.
 */

import type { ReplayInfo } from './replay'

const REPLAY_MAGIC = 'AOE4_RE'
const CHUNKY_MAGIC = 'Relic Chunky'
const CHUNKY_FILE_HEADER_SIZE = 24
const CHUNK_HEADER_SIZE = 20
const GAME_TICK_RECORD = 0
const CHAT_RECORD = 1
const COMMAND_HEADER_SIZE = 24
const IDLE_GAP_THRESHOLD_SEC = 5
const ACTIVITY_WINDOW_SEC = 300
const MAX_ANALYZED_BYTES = 100 * 1024 * 1024

export type ReplayAnalysisCoverage = 'full' | 'partial' | 'header-only' | 'unavailable'

export interface ReplayDataLocation {
  streamOffset: number
  /** Chunky file version of the replay-data container when it was readable. */
  chunkyVersion: number | null
  /** DATA/DATA setup block decoded from the same replay-data container. */
  setup?: ReplaySetup | null
  chunks?: ReplayDataChunk[]
}

export type ReplayActionCategory =
  | 'production'
  | 'economy'
  | 'movement'
  | 'combat'
  | 'ability'
  | 'technology'
  | 'control'
  | 'meta'
  | 'unknown'

/** How much of an action's payload is understood by the current replay schema. */
export type ReplayActionDecodeLevel = 'exact' | 'structured' | 'inferred' | 'unknown'

export interface ReplayActionPosition {
  x: number
  y: number
  z: number
}

export interface ReplaySetupPlayer {
  isHuman: boolean
  name: string
  team: number
  playerId: number
  civToken: string
  steamId: string | null
  hostComputerId: number
  color: number | null
  extraDataFlags: number
}

export interface ReplaySetup {
  version: number
  players: ReplaySetupPlayer[]
  /** Complete setup DATA payload, kept as evidence for version-specific fields. */
  rawDataHex: string
}

export interface ReplayDataChunk {
  kind: 'FOLD' | 'DATA'
  id: string
  version: number
  name: string
  dataOffset: number
  dataSize: number
  /** Lossless bytes for the chunk payload, including unknown/versioned fields. */
  dataHex: string
}

export interface ReplayChatMessage {
  timeSec: number | null
  mode: number | null
  playerName: string | null
  message: string | null
  playerId: number | null
  rawHex: string
}

export interface ReplayCommandAttribute {
  type: number
  offset: number
  byteSize: number
  rawHex: string
  size?: number
  selectedUnitIds?: number[]
  position?: ReplayActionPosition | null
  buildingId?: number | null
  entityId?: number | null
  decodeLevel: ReplayActionDecodeLevel
}

export interface ReplayCommandEvent {
  /** Zero-based position in the complete decoded command stream. */
  eventIndex: number
  offset: number
  tick: number
  timeSec: number
  hostComputerId: number
  playerId: number
  commandType: number
  commandName: string
  queued: boolean
  playerCommandCount: number
  payloadBytes: number
  unitIds: number[]
  /** PBGID of the queued unit/technology when the command carries one. */
  pbgid: number | null
  /** Best-effort production building id from the queue command attribute. */
  productionBuildingId: number | null
  queueCount: number | null
  /** Number of selected units when the command carries a selection attribute. */
  selectedUnitCount: number
  /** Structured target position for move/attack/patrol/rally commands, when present. */
  position: ReplayActionPosition | null
  /** Structured target building id for commands that target a building. */
  targetBuildingId: number | null
  actionCategory: ReplayActionCategory
  decodeLevel: ReplayActionDecodeLevel
  /** Bounded raw payload evidence; offset + payloadBytes locate complete bytes in .rec. */
  payloadHex: string
  /** Complete raw payload, in addition to the bounded preview above. */
  payloadHexFull?: string
  payloadHexTruncated: boolean
  attributes?: ReplayCommandAttribute[]
  known: boolean
}

export interface ReplayPlayerCommandStats {
  playerId: number
  commandCount: number
  knownCommandCount: number
  unknownCommandCount: number
  /** Number of observable command gaps longer than five seconds. */
  commandGapCount: number
  firstCommandSec: number | null
  lastCommandSec: number | null
  /** Sum of observable command gaps longer than five seconds. Not villager idle. */
  commandGapSec: number
  maxCommandGapSec: number
  /** Percentage of this player's decoded commands with a known command type. */
  knownCommandPct: number | null
  apm: number
  commandTypes: Record<string, number>
  /** Five-minute command-rate windows. This is an activity read, not a skill score. */
  activityWindows: ReplayActivityWindow[]
  /** Change from the first to last observed activity window, when two exist. */
  activityDropPct: number | null
}

export interface ReplayActivityWindow {
  startSec: number
  endSec: number
  commandCount: number
  knownCommandPct: number | null
  apm: number
}

export interface ReplayDataGap {
  code: 'no-stream' | 'truncated-record' | 'invalid-record' | 'unknown-command' | 'event-cap'
  message: string
  offset: number | null
}

export interface ReplayCommandAnalysis {
  coverage: ReplayAnalysisCoverage
  format: 'aoe4-replay-data-v1'
  streamOffset: number | null
  streamBytes: number
  recordsParsed: number
  ticksParsed: number
  durationSec: number | null
  commandCount: number
  unknownCommandCount: number
  eventsTruncated: boolean
  events: ReplayCommandEvent[]
  players: ReplayPlayerCommandStats[]
  setup: ReplaySetup | null
  chunks: ReplayDataChunk[]
  chat: ReplayChatMessage[]
  dataGaps: ReplayDataGap[]
}

export interface ReplayAnalysisResult {
  id: string
  source: 'local' | 'cached'
  sourcePath: string
  recordedAtMs: number
  info: ReplayInfo | null
  commandStream: ReplayCommandAnalysis
  /** Complete action journal, including events beyond the UI preview window. */
  actionLog?: ReplayActionLog
}

export interface ReplayActionLog {
  path: string
  format: 'ndjson'
  eventCount: number
  /** False when the replay parser stopped on a malformed/truncated record. */
  complete: boolean
}

export interface ReplayActionPage {
  events: ReplayCommandEvent[]
  offset: number
  limit: number
  total: number
  playerId: number | null
  complete: boolean
}

interface Reader {
  bytes: Uint8Array
  view: DataView
}

function makeReader(bytes: Uint8Array): Reader {
  return { bytes, view: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength) }
}

function canRead(reader: Reader, offset: number, size: number, end = reader.bytes.length): boolean {
  return offset >= 0 && size >= 0 && offset + size <= end
}

function u8(reader: Reader, offset: number): number {
  return reader.view.getUint8(offset)
}

function u16(reader: Reader, offset: number): number {
  return reader.view.getUint16(offset, true)
}

function i16(reader: Reader, offset: number): number {
  return reader.view.getInt16(offset, true)
}

function u32(reader: Reader, offset: number): number {
  return reader.view.getUint32(offset, true)
}

function i32(reader: Reader, offset: number): number {
  return reader.view.getInt32(offset, true)
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let value = ''
  for (let i = 0; i < length && offset + i < bytes.length; i++)
    value += String.fromCharCode(bytes[offset + i]!)
  return value
}

function hex(bytes: Uint8Array, start: number, end: number): string {
  return [...bytes.subarray(start, end)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function prefixedString(
  reader: Reader,
  offset: number,
  end: number,
  wide: boolean,
): { value: string; nextOffset: number } | null {
  if (!canRead(reader, offset, 4, end)) return null
  const length = u32(reader, offset)
  if (length > 16_384) return null
  const byteLength = wide ? length * 2 : length
  if (!canRead(reader, offset + 4, byteLength, end)) return null
  const bytes = reader.bytes.subarray(offset + 4, offset + 4 + byteLength)
  const value = wide ? new TextDecoder('utf-16le').decode(bytes) : new TextDecoder('latin1').decode(bytes)
  return { value, nextOffset: offset + 4 + byteLength }
}

function rawSetupHex(reader: Reader, start: number, end: number): string {
  return hex(reader.bytes, start, end)
}

/** Decode the stable prefix of DataGameSetup; unknown version-specific tails stay raw. */
function parseReplaySetup(
  reader: Reader,
  start: number,
  end: number,
  version: number,
): ReplaySetup | null {
  if (!canRead(reader, start, 14, end)) return null
  let cursor = start + 4 + 4 + 2
  const playerCount = u32(reader, cursor)
  cursor += 4
  if (playerCount > 16) return null
  const players: ReplaySetupPlayer[] = []
  for (let index = 0; index < playerCount; index++) {
    if (!canRead(reader, cursor, 1, end)) return null
    const isHuman = u8(reader, cursor) !== 0
    cursor += 1
    const name = prefixedString(reader, cursor, end, true)
    if (!name || !canRead(reader, name.nextOffset, 4 + 4 + 1, end)) return null
    cursor = name.nextOffset
    const team = u32(reader, cursor)
    const playerId = u32(reader, cursor + 4)
    cursor += 8
    cursor += 1 // unknown7
    const civ = prefixedString(reader, cursor, end, false)
    if (!civ || !canRead(reader, civ.nextOffset, 2 + 2 + 4, end)) return null
    cursor = civ.nextOffset
    cursor += 2 + 2 + 4
    const unknown11 = prefixedString(reader, cursor, end, false)
    if (!unknown11 || !canRead(reader, unknown11.nextOffset, 4 + 4 * 5 + 4 + 4 + 4, end)) return null
    cursor = unknown11.nextOffset
    cursor += 4 // unknown12 float
    cursor += 4 + 4 * 5 + 4 // unknown13..15
    const hostComputerId = u32(reader, cursor)
    cursor += 4 + 4 // hostComputerId + unknown17
    cursor += 4 + 5 // unknown18 + unknown19
    const steam = prefixedString(reader, cursor, end, true)
    if (!steam || !canRead(reader, steam.nextOffset, 4 + 4 + 2 + 2 + 1 + 1 + 1 + 15 + 4, end)) return null
    cursor = steam.nextOffset
    cursor += 4 + 4 + 2 + 2 + 1 + 1
    const color = u8(reader, cursor)
    cursor += 1 + 15
    const extraDataFlags = u32(reader, cursor)
    cursor += 4
    players.push({
      isHuman,
      name: name.value,
      team,
      playerId,
      civToken: civ.value,
      steamId: steam.value || null,
      hostComputerId,
      color,
      extraDataFlags,
    })

    // Skip optional player metadata so the next player starts at the right offset.
    if (extraDataFlags > 0) {
      if (!canRead(reader, cursor, 69, end)) return null
      cursor += 69
      const attrs = prefixedString(reader, cursor, end, false)
      if (!attrs || !canRead(reader, attrs.nextOffset, 11 * 4, end)) return null
      cursor = attrs.nextOffset + 11 * 4
    }
    if (extraDataFlags > 1) {
      if (!canRead(reader, cursor, 17 * 4 + 1, end)) return null
      cursor += 17 * 4 + 1
      const attrs = prefixedString(reader, cursor, end, false)
      if (!attrs || !canRead(reader, attrs.nextOffset, 11 * 4, end)) return null
      cursor = attrs.nextOffset + 11 * 4
    }
    if (extraDataFlags > 2) {
      if (!canRead(reader, cursor, 117, end)) return null
      cursor += 117
    }
  }
  return { version, players, rawDataHex: rawSetupHex(reader, start, end) }
}

const COMMAND_NAMES: Record<number, string> = {
  3: 'queue-unit',
  5: 'unknown-5',
  7: 'unknown-7',
  12: 'rally-point',
  14: 'return-to-work',
  16: 'research',
  20: 'unknown-20',
  22: 'unknown-22',
  56: 'unknown-56',
  62: 'move',
  63: 'cancel',
  65: 'build',
  66: 'unknown-66',
  67: 'queue-villager-or-unknown',
  71: 'attack-move',
  72: 'unit-ability',
  73: 'seek-shelter',
  76: 'unknown-76',
  96: 'unknown-96',
  105: 'gather-or-return-to-resource',
  108: 'unknown-108',
  109: 'unit-stance',
  114: 'unknown-114',
  116: 'patrol',
  123: 'build-area-or-placement',
  130: 'unknown-130',
  139: 'unknown-139',
  143: 'surrender-or-global',
  145: 'unknown-145',
  146: 'pre-command',
  148: 'post-command',
  152: 'periodic-1',
  153: 'periodic-2',
  154: 'periodic-3',
}

const COMMAND_CATEGORIES: Record<number, ReplayActionCategory> = {
  3: 'production',
  12: 'economy',
  14: 'economy',
  16: 'technology',
  62: 'movement',
  63: 'control',
  65: 'economy',
  67: 'production',
  71: 'combat',
  72: 'ability',
  73: 'control',
  105: 'economy',
  109: 'control',
  114: 'control',
  116: 'movement',
  123: 'economy',
  143: 'meta',
  146: 'meta',
  148: 'meta',
  152: 'meta',
  153: 'meta',
  154: 'meta',
}

const COMMAND_DECODE_LEVELS: Record<number, ReplayActionDecodeLevel> = {
  3: 'exact',
  12: 'structured',
  62: 'structured',
  63: 'structured',
  65: 'structured',
  67: 'structured',
  71: 'structured',
  72: 'structured',
  73: 'structured',
  109: 'structured',
  114: 'structured',
  116: 'structured',
  123: 'structured',
  14: 'inferred',
  16: 'inferred',
  105: 'inferred',
  143: 'inferred',
  146: 'inferred',
  148: 'inferred',
  152: 'inferred',
  153: 'inferred',
  154: 'inferred',
}

const PAYLOAD_HEX_LIMIT = 128

const UNIT_SELECTION_COMMANDS = new Set([62, 63, 65, 67, 71, 72, 73, 109, 114, 116])

/**
 * Locate the raw replay stream after the replay-data Relic Chunky container.
 * AoE4 currently writes a small POST container first and the replay-data
 * container second; selecting a candidate only when the following bytes look
 * like a game-tick record keeps old/new headers from being confused.
 */
export function locateReplayData(bytes: Uint8Array): ReplayDataLocation | null {
  if (bytes.length < 12) return null
  if (ascii(bytes, 4, REPLAY_MAGIC.length) !== REPLAY_MAGIC) return null

  let candidate = -1
  let candidateVersion: number | null = null
  let candidateSetup: ReplaySetup | null = null
  let candidateChunks: ReplayDataChunk[] = []
  for (let offset = 0; offset + CHUNKY_FILE_HEADER_SIZE <= bytes.length; offset++) {
    if (bytes[offset] !== CHUNKY_MAGIC.charCodeAt(0)) continue
    if (ascii(bytes, offset, CHUNKY_MAGIC.length) !== CHUNKY_MAGIC) continue
    const reader = makeReader(bytes)
    const version = u32(reader, offset + 16)
    let cursor = offset + CHUNKY_FILE_HEADER_SIZE
    let nodeCount = 0
    let setup: ReplaySetup | null = null
    const chunks: ReplayDataChunk[] = []
    while (canRead(reader, cursor, CHUNK_HEADER_SIZE)) {
      const kind = ascii(bytes, cursor, 4)
      if (kind !== 'FOLD' && kind !== 'DATA') break
      const chunkVersion = u32(reader, cursor + 8)
      const dataSize = u32(reader, cursor + 12)
      const nameLength = u32(reader, cursor + 16)
      const dataStart = cursor + CHUNK_HEADER_SIZE + nameLength
      if (!canRead(reader, dataStart, dataSize)) {
        cursor = -1
        break
      }
      const chunkId = ascii(bytes, cursor + 4, 4)
      chunks.push({
        kind,
        id: chunkId,
        version: chunkVersion,
        name: ascii(bytes, cursor + CHUNK_HEADER_SIZE, nameLength),
        dataOffset: dataStart,
        dataSize,
        dataHex: hex(bytes, dataStart, dataStart + dataSize),
      })
      if (kind === 'DATA' && chunkId === 'DATA') {
        try {
          setup = parseReplaySetup(reader, dataStart, dataStart + dataSize, chunkVersion)
        } catch {
          // A patch-specific setup tail must not make command-stream parsing fail.
          setup = null
        }
      }
      cursor = dataStart + dataSize
      nodeCount += 1
    }
    if (cursor < 0 || nodeCount === 0 || cursor >= bytes.length) continue
    if (isLikelyGameTick(reader, cursor)) {
      candidate = cursor
      candidateVersion = version
      candidateSetup = setup
      candidateChunks = chunks
    }
  }
  return candidate >= 0
    ? {
        streamOffset: candidate,
        chunkyVersion: candidateVersion,
        setup: candidateSetup,
        chunks: candidateChunks,
      }
    : null
}

function isLikelyGameTick(reader: Reader, offset: number): boolean {
  if (!canRead(reader, offset, 21)) return false
  if (u32(reader, offset) !== GAME_TICK_RECORD) return false
  const size = u32(reader, offset + 4)
  if (size < 13 || size > reader.bytes.length - offset - 8) return false
  return u8(reader, offset + 8) === 0x20 && u32(reader, offset + 9) < 0x7fffffff
}

interface SelectedUnits {
  ids: number[]
  nextOffset: number
}

function selectedUnits(reader: Reader, offset: number, end: number): SelectedUnits {
  if (!canRead(reader, offset, 1, end)) return { ids: [], nextOffset: offset }
  const marker = u8(reader, offset)
  if (marker === 32) {
    if (!canRead(reader, offset + 1, 3, end)) return { ids: [], nextOffset: offset }
    // Single-unit selection is stored in reverse byte order.
    return {
      ids: [
        ((u8(reader, offset + 1) << 16) |
          (u8(reader, offset + 2) << 8) |
          u8(reader, offset + 3)) >>>
          0,
      ],
      nextOffset: offset + 4,
    }
  }
  const count =
    marker > 64 && marker < 128 ? marker - 64 : marker === 128 ? u8(reader, offset + 1) : 0
  if (count <= 0 || count > 128) return { ids: [], nextOffset: offset }
  const start = marker === 128 ? offset + 2 : offset + 1
  if (!canRead(reader, start, count * 4, end)) return { ids: [], nextOffset: offset }
  const ids: number[] = []
  for (let i = 0; i < count; i++)
    ids.push(
      (u8(reader, start + i * 4) |
        (u8(reader, start + i * 4 + 1) << 8) |
        (u8(reader, start + i * 4 + 2) << 16)) >>>
        0,
    )
  return { ids, nextOffset: start + count * 4 }
}

function payloadHex(
  reader: Reader,
  start: number,
  end: number,
): {
  value: string
  truncated: boolean
} {
  const bytes = reader.bytes.subarray(start, end)
  const visible = bytes.subarray(0, PAYLOAD_HEX_LIMIT)
  return {
    value: [...visible].map((byte) => byte.toString(16).padStart(2, '0')).join(''),
    truncated: bytes.length > visible.length,
  }
}

function targetAttribute(
  reader: Reader,
  offset: number,
  end: number,
): { position: ReplayActionPosition | null; targetBuildingId: number | null } {
  if (!canRead(reader, offset, 1, end)) return { position: null, targetBuildingId: null }
  const type = u8(reader, offset)
  if (type === 2 && canRead(reader, offset + 1, 12, end)) {
    return {
      position: {
        x: reader.view.getFloat32(offset + 1, true),
        y: reader.view.getFloat32(offset + 5, true),
        z: reader.view.getFloat32(offset + 9, true),
      },
      targetBuildingId: null,
    }
  }
  if (type === 3 && canRead(reader, offset + 1, 4, end)) {
    return {
      position: null,
      targetBuildingId:
        (u8(reader, offset + 1) |
          (u8(reader, offset + 2) << 8) |
          (u8(reader, offset + 3) << 16)) >>>
        0,
    }
  }
  return { position: null, targetBuildingId: null }
}

function parseCommandAttributes(
  reader: Reader,
  commandType: number,
  payloadStart: number,
  commandEnd: number,
): ReplayCommandAttribute[] {
  const attributes: ReplayCommandAttribute[] = []
  let cursor = payloadStart
  if (UNIT_SELECTION_COMMANDS.has(commandType)) {
    const selection = selectedUnits(reader, cursor, commandEnd)
    if (selection.nextOffset !== cursor) {
      const marker = u8(reader, cursor)
      const byteSize = selection.nextOffset - cursor
      attributes.push({
        type: marker,
        offset: cursor,
        byteSize,
        rawHex: hex(reader.bytes, cursor, selection.nextOffset),
        selectedUnitIds: selection.ids,
        decodeLevel: 'exact',
      })
      cursor = selection.nextOffset
    }
  }

  while (cursor < commandEnd) {
    if (!canRead(reader, cursor, 1, commandEnd)) break
    const offset = cursor
    const type = u8(reader, cursor)
    let byteSize: number
    let size: number | undefined
    let decodeLevel: ReplayActionDecodeLevel = 'unknown'
    let position: ReplayActionPosition | null | undefined
    let buildingId: number | null | undefined
    let entityId: number | null | undefined
    let selectedUnitIds: number[] | undefined

    if (type === 2 && canRead(reader, cursor + 1, 12, commandEnd)) {
      byteSize = 13
      position = {
        x: reader.view.getFloat32(cursor + 1, true),
        y: reader.view.getFloat32(cursor + 5, true),
        z: reader.view.getFloat32(cursor + 9, true),
      }
      decodeLevel = 'exact'
    } else if ((type === 3 || type === 4) && canRead(reader, cursor + 1, 4, commandEnd)) {
      byteSize = 5
      const value =
        (u8(reader, cursor + 1) |
          (u8(reader, cursor + 2) << 8) |
          (u8(reader, cursor + 3) << 16)) >>> 0
      if (type === 3) buildingId = value
      else entityId = value
      decodeLevel = 'exact'
    } else if (type === 16 && canRead(reader, cursor + 1, 4, commandEnd)) {
      byteSize = canRead(reader, cursor + 1, 5, commandEnd) ? 6 : 5
      decodeLevel = 'structured'
    } else if ((type === 1 || type === 15 || type === 30) && canRead(reader, cursor + 1, 1, commandEnd)) {
      size = u8(reader, cursor + 1)
      byteSize = 2 + size
      if (!canRead(reader, cursor, byteSize, commandEnd)) {
        byteSize = commandEnd - cursor
        decodeLevel = 'unknown'
      } else {
        decodeLevel = 'structured'
      }
    } else if (type > 64 && type < 128) {
      const selection = selectedUnits(reader, cursor, commandEnd)
      if (selection.nextOffset !== cursor) {
        byteSize = selection.nextOffset - cursor
        selectedUnitIds = selection.ids
        decodeLevel = 'exact'
      } else {
        byteSize = commandEnd - cursor
      }
    } else if (type === 128) {
      const selection = selectedUnits(reader, cursor, commandEnd)
      if (selection.nextOffset !== cursor) {
        byteSize = selection.nextOffset - cursor
        selectedUnitIds = selection.ids
        decodeLevel = 'exact'
      } else {
        byteSize = commandEnd - cursor
      }
    } else {
      // Unknown attributes are not length-prefixed. Preserve the remainder as one evidence block.
      byteSize = commandEnd - cursor
    }
    if (byteSize <= 0) break
    const end = Math.min(commandEnd, cursor + byteSize)
    attributes.push({
      type,
      offset,
      byteSize: end - offset,
      rawHex: hex(reader.bytes, offset, end),
      ...(size == null ? {} : { size }),
      ...(selectedUnitIds == null ? {} : { selectedUnitIds }),
      ...(position === undefined ? {} : { position }),
      ...(buildingId === undefined ? {} : { buildingId }),
      ...(entityId === undefined ? {} : { entityId }),
      decodeLevel,
    })
    cursor = end
    if (decodeLevel === 'unknown' && type !== 2 && type !== 3 && type !== 4 && type !== 16) break
  }
  return attributes
}

function parseCommandPayload(
  reader: Reader,
  commandType: number,
  payloadStart: number,
  commandEnd: number,
): {
  unitIds: number[]
  pbgid: number | null
  productionBuildingId: number | null
  queueCount: number | null
  selectedUnitCount: number
  position: ReplayActionPosition | null
  targetBuildingId: number | null
  actionCategory: ReplayActionCategory
  decodeLevel: ReplayActionDecodeLevel
  attributes: ReplayCommandAttribute[]
} {
  const category = COMMAND_CATEGORIES[commandType] ?? 'unknown'
  const decodeLevel = COMMAND_DECODE_LEVELS[commandType] ?? 'unknown'
  const attributes = parseCommandAttributes(reader, commandType, payloadStart, commandEnd)
  if (commandType === 3) {
    // QueueUnitCommand: attribute(16), queue count, unit pbgid, player id, 0.
    const attr = canRead(reader, payloadStart, 6, commandEnd) ? u8(reader, payloadStart) : -1
    return {
      unitIds: [],
      pbgid: canRead(reader, payloadStart + 7, 4, commandEnd)
        ? i32(reader, payloadStart + 7)
        : null,
      productionBuildingId:
        attr === 16 && canRead(reader, payloadStart + 1, 4, commandEnd)
          ? i32(reader, payloadStart + 1)
          : null,
      queueCount: canRead(reader, payloadStart + 6, 1, commandEnd)
        ? u8(reader, payloadStart + 6)
        : null,
      selectedUnitCount: 0,
      position: null,
      targetBuildingId: null,
      actionCategory: category,
      decodeLevel,
      attributes,
    }
  }
  if (UNIT_SELECTION_COMMANDS.has(commandType)) {
    const selection = selectedUnits(reader, payloadStart, commandEnd)
    const target =
      commandType === 12 || commandType === 62 || commandType === 71 || commandType === 116
        ? targetAttribute(reader, selection.nextOffset + 2, commandEnd)
        : { position: null, targetBuildingId: null }
    return {
      unitIds: selection.ids,
      pbgid: null,
      productionBuildingId: null,
      queueCount: null,
      selectedUnitCount: selection.ids.length,
      position: target.position,
      targetBuildingId: target.targetBuildingId,
      actionCategory: category,
      decodeLevel,
      attributes,
    }
  }
  return {
    unitIds: [],
    pbgid:
      commandType === 123 && canRead(reader, payloadStart + 7, 4, commandEnd)
        ? i32(reader, payloadStart + 7)
        : null,
    productionBuildingId: null,
    queueCount: null,
    selectedUnitCount: 0,
    position: null,
    targetBuildingId: null,
    actionCategory: category,
    decodeLevel,
    attributes,
  }
}

function commandEvent(
  reader: Reader,
  offset: number,
  tick: number,
  hostComputerId: number,
  end: number,
  eventIndex: number,
): ReplayCommandEvent | null {
  if (!canRead(reader, offset, COMMAND_HEADER_SIZE, end)) return null
  const size = i16(reader, offset)
  if (size < COMMAND_HEADER_SIZE || !canRead(reader, offset, size, end)) return null
  const commandType = u8(reader, offset + 2)
  const playerCommandCount = u16(reader, offset + 4)
  const playerId = u32(reader, offset + 20)
  const payloadStart = offset + COMMAND_HEADER_SIZE
  const payload = parseCommandPayload(reader, commandType, payloadStart, offset + size)
  const rawPayload = payloadHex(reader, payloadStart, offset + size)
  return {
    eventIndex,
    offset,
    tick,
    timeSec: tick / 8,
    hostComputerId,
    playerId,
    commandType,
    commandName: COMMAND_NAMES[commandType] ?? `unknown-${commandType}`,
    queued: (u8(reader, offset + 3) & 0x80) !== 0,
    playerCommandCount,
    payloadBytes: Math.max(0, size - COMMAND_HEADER_SIZE),
    ...payload,
    payloadHex: rawPayload.value,
    payloadHexFull: hex(reader.bytes, payloadStart, offset + size),
    payloadHexTruncated: rawPayload.truncated,
    known: COMMAND_NAMES[commandType] != null,
  }
}

function parseChatRecord(reader: Reader, offset: number, recordEnd: number): ReplayChatMessage | null {
  if (!canRead(reader, offset, 12, recordEnd)) return null
  const type = u32(reader, offset + 4)
  const messageSize = u32(reader, offset + 8)
  if (messageSize > recordEnd - offset - 12) return null
  if (type === 0) {
    return {
      timeSec: null,
      mode: null,
      playerName: null,
      message: null,
      playerId: canRead(reader, offset + 12, 4, recordEnd) ? u32(reader, offset + 12) : null,
      rawHex: hex(reader.bytes, offset, recordEnd),
    }
  }
  if (type !== 1 || !canRead(reader, offset + 12, 12, recordEnd)) return null
  const mode = u32(reader, offset + 12)
  const name = prefixedString(reader, offset + 24, recordEnd, true)
  if (!name) return null
  const message = prefixedString(reader, name.nextOffset, recordEnd, true)
  if (!message) return null
  return {
    timeSec: null,
    mode,
    playerName: name.value || null,
    message: message.value,
    playerId: null,
    rawHex: hex(reader.bytes, offset, recordEnd),
  }
}

export interface ReplayCommandParseOptions {
  /** Preview cap only; the optional event sink still receives every decoded command. */
  maxEvents?: number
  onEvent?: (event: ReplayCommandEvent) => void
}

interface PlayerStatsAccumulator {
  playerId: number
  commandCount: number
  knownCommandCount: number
  unknownCommandCount: number
  commandGapCount: number
  firstCommandSec: number | null
  lastCommandSec: number | null
  commandGapSec: number
  maxCommandGapSec: number
  commandTypes: Record<string, number>
  activityWindows: Map<number, { commandCount: number; knownCommandCount: number }>
}

function updatePlayerStats(
  accumulators: Map<number, PlayerStatsAccumulator>,
  event: ReplayCommandEvent,
): void {
  if (event.playerId === 0) return
  const current: PlayerStatsAccumulator = accumulators.get(event.playerId) ?? {
    playerId: event.playerId,
    commandCount: 0,
    knownCommandCount: 0,
    unknownCommandCount: 0,
    commandGapCount: 0,
    firstCommandSec: null,
    lastCommandSec: null,
    commandGapSec: 0,
    maxCommandGapSec: 0,
    commandTypes: {} as Record<string, number>,
    activityWindows: new Map(),
  }
  current.commandCount += 1
  if (event.known) current.knownCommandCount += 1
  else current.unknownCommandCount += 1
  current.firstCommandSec =
    current.firstCommandSec == null
      ? event.timeSec
      : Math.min(current.firstCommandSec, event.timeSec)
  if (current.lastCommandSec != null) {
    const gap = Math.max(0, event.timeSec - current.lastCommandSec)
    if (gap > IDLE_GAP_THRESHOLD_SEC) {
      current.commandGapSec += gap
      current.maxCommandGapSec = Math.max(current.maxCommandGapSec, gap)
      current.commandGapCount += 1
    }
  }
  current.lastCommandSec =
    current.lastCommandSec == null ? event.timeSec : Math.max(current.lastCommandSec, event.timeSec)
  current.commandTypes[event.commandName] = (current.commandTypes[event.commandName] ?? 0) + 1
  const windowStart = Math.floor(event.timeSec / ACTIVITY_WINDOW_SEC) * ACTIVITY_WINDOW_SEC
  const activityWindow = current.activityWindows.get(windowStart) ?? {
    commandCount: 0,
    knownCommandCount: 0,
  }
  activityWindow.commandCount += 1
  if (event.known) activityWindow.knownCommandCount += 1
  current.activityWindows.set(windowStart, activityWindow)
  accumulators.set(event.playerId, current)
}

function playerStats(
  accumulators: Map<number, PlayerStatsAccumulator>,
  durationSec: number | null,
): ReplayPlayerCommandStats[] {
  return [...accumulators.values()]
    .map((stats) => {
      const first = stats.firstCommandSec
      const last = stats.lastCommandSec
      const activeMinutes = first != null && last != null && last > first ? (last - first) / 60 : 0
      const activityWindows = [...stats.activityWindows.entries()]
        .sort(([a], [b]) => a - b)
        .map(([startSec, window]) => {
          const endSec = Math.max(
            startSec + 1,
            Math.min(durationSec ?? startSec + ACTIVITY_WINDOW_SEC, startSec + ACTIVITY_WINDOW_SEC),
          )
          const spanMinutes = Math.max(1 / 60, (endSec - startSec) / 60)
          return {
            startSec,
            endSec,
            commandCount: window.commandCount,
            knownCommandPct:
              window.commandCount > 0
                ? Math.round((window.knownCommandCount / window.commandCount) * 1000) / 10
                : null,
            apm: Math.round((window.commandCount / spanMinutes) * 10) / 10,
          }
        })
      const firstWindow = activityWindows[0]
      const lastWindow = activityWindows.at(-1)
      const activityDropPct =
        activityWindows.length >= 2 && firstWindow && lastWindow && firstWindow.apm > 0
          ? Math.round(((lastWindow.apm - firstWindow.apm) / firstWindow.apm) * 100)
          : null
      const { activityWindows: _rawActivityWindows, ...rest } = stats
      void _rawActivityWindows
      return {
        ...rest,
        activityWindows,
        activityDropPct,
        apm:
          activeMinutes > 0
            ? Math.round((stats.commandCount / activeMinutes) * 10) / 10
            : stats.commandCount > 0
              ? stats.commandCount
              : 0,
        knownCommandPct:
          stats.commandCount > 0
            ? Math.round((stats.knownCommandCount / stats.commandCount) * 1000) / 10
            : null,
      }
    })
    .sort((a, b) => b.commandCount - a.commandCount)
}

function emptyAnalysis(
  coverage: ReplayAnalysisCoverage,
  streamOffset: number | null,
  streamBytes: number,
  dataGaps: ReplayDataGap[] = [],
): ReplayCommandAnalysis {
  return {
    coverage,
    format: 'aoe4-replay-data-v1',
    streamOffset,
    streamBytes,
    recordsParsed: 0,
    ticksParsed: 0,
    durationSec: null,
    commandCount: 0,
    unknownCommandCount: 0,
    eventsTruncated: false,
    events: [],
    players: [],
    setup: null,
    chunks: [],
    chat: [],
    dataGaps,
  }
}

/** Decode the replay data stream. This never throws on a truncated/unknown body. */
export function parseReplayCommandStream(
  bytes: Uint8Array,
  streamOffset?: number,
  options: ReplayCommandParseOptions = {},
): ReplayCommandAnalysis {
  if (bytes.byteLength > MAX_ANALYZED_BYTES)
    return emptyAnalysis('unavailable', null, bytes.byteLength, [
      {
        code: 'invalid-record',
        message: 'Replay exceeds the 100 MB analysis limit.',
        offset: null,
      },
    ])
  const location =
    streamOffset == null ? locateReplayData(bytes) : { streamOffset, chunkyVersion: null }
  if (!location)
    return emptyAnalysis('header-only', null, 0, [
      { code: 'no-stream', message: 'Replay command stream was not found.', offset: null },
    ])

  const reader = makeReader(bytes)
  const events: ReplayCommandEvent[] = []
  const playerAccumulators = new Map<number, PlayerStatsAccumulator>()
  const dataGaps: ReplayDataGap[] = []
  let cursor = location.streamOffset
  let recordsParsed = 0
  let ticksParsed = 0
  let durationSec: number | null = null
  let currentTimeSec = 0
  let commandCount = 0
  let unknownCommandCount = 0
  let eventsTruncated = false
  const chat: ReplayChatMessage[] = []
  const maxEvents = Math.max(0, Math.floor(options.maxEvents ?? 50_000))

  while (canRead(reader, cursor, 8)) {
    const recordType = u32(reader, cursor)
    const declaredSize = u32(reader, cursor + 4)
    if (recordType === GAME_TICK_RECORD) {
      if (declaredSize < 13 || !canRead(reader, cursor + 8, declaredSize)) {
        dataGaps.push({
          code: 'truncated-record',
          message: `Game tick at 0x${cursor.toString(16)} is truncated or has an invalid size.`,
          offset: cursor,
        })
        break
      }
      const recordEnd = cursor + 8 + declaredSize
      const tick = u32(reader, cursor + 9)
      const blockCount = u32(reader, cursor + 17)
      durationSec = Math.max(durationSec ?? 0, tick / 8)
      currentTimeSec = tick / 8
      ticksParsed += 1
      let blockCursor = cursor + 21
      let blockError = false
      for (let blockIndex = 0; blockIndex < blockCount; blockIndex++) {
        if (!canRead(reader, blockCursor, 12, recordEnd)) {
          blockError = true
          break
        }
        const hostComputerId = u32(reader, blockCursor)
        const blockSize = u32(reader, blockCursor + 8)
        const commandsStart = blockCursor + 12
        const blockEnd = commandsStart + blockSize
        if (!canRead(reader, commandsStart, blockSize, recordEnd)) {
          blockError = true
          break
        }
        let commandCursor = commandsStart
        while (commandCursor < blockEnd) {
          if (!canRead(reader, commandCursor, 2, blockEnd)) {
            blockError = true
            break
          }
          const size = i16(reader, commandCursor)
          const event = commandEvent(
            reader,
            commandCursor,
            tick,
            hostComputerId,
            blockEnd,
            commandCount,
          )
          if (!event) {
            blockError = true
            break
          }
          commandCount += 1
          if (!event.known) {
            unknownCommandCount += 1
            if (dataGaps.filter((gap) => gap.code === 'unknown-command').length < 20)
              dataGaps.push({
                code: 'unknown-command',
                message: `Unknown command type ${event.commandType} was skipped.`,
                offset: commandCursor,
              })
          }
          updatePlayerStats(playerAccumulators, event)
          try {
            options.onEvent?.(event)
          } catch {
            // An optional journal sink must never make a valid replay look corrupt.
          }
          if (events.length < maxEvents) events.push(event)
          else eventsTruncated = true
          commandCursor += size
        }
        if (commandCursor !== blockEnd) blockError = true
        blockCursor = blockEnd
      }
      if (blockError || blockCursor > recordEnd) {
        dataGaps.push({
          code: 'invalid-record',
          message: `Command block in tick ${tick} could not be decoded completely.`,
          offset: cursor,
        })
        break
      }
      cursor = recordEnd
      recordsParsed += 1
      continue
    }
    // Chat records use the opposite header order: [size][type=1][...].
    if (declaredSize === CHAT_RECORD && recordType >= 8 && canRead(reader, cursor + 4, recordType)) {
      const recordEnd = cursor + 4 + recordType
      const message = parseChatRecord(reader, cursor, recordEnd)
      if (!message) {
        dataGaps.push({
          code: 'invalid-record',
          message: `Chat record at 0x${cursor.toString(16)} could not be decoded.`,
          offset: cursor,
        })
        break
      }
      message.timeSec = currentTimeSec
      chat.push(message)
      cursor = recordEnd
      recordsParsed += 1
      continue
    }
    dataGaps.push({
      code: 'invalid-record',
      message: `Unknown replay record type ${recordType} at 0x${cursor.toString(16)}.`,
      offset: cursor,
    })
    break
  }

  if (eventsTruncated)
    dataGaps.push({
      code: 'event-cap',
      message:
        'The inline preview is capped at 50,000 commands; the complete decoded action journal is stored separately.',
      offset: null,
    })
  const coverage: ReplayAnalysisCoverage = dataGaps.some(
    (gap) => gap.code === 'truncated-record' || gap.code === 'invalid-record',
  )
    ? 'partial'
    : events.length > 0 || ticksParsed > 0
      ? 'full'
      : 'partial'
  return {
    coverage,
    format: 'aoe4-replay-data-v1',
    streamOffset: location.streamOffset,
    streamBytes: bytes.length - location.streamOffset,
    recordsParsed,
    ticksParsed,
    durationSec,
    commandCount,
    unknownCommandCount,
    eventsTruncated,
    events,
    players: playerStats(playerAccumulators, durationSec),
    setup: location.setup ?? null,
    chunks: location.chunks ?? [],
    chat,
    dataGaps,
  }
}
