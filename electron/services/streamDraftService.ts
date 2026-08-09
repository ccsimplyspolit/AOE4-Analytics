import type { IpcResult, StreamDraftImport } from '@ipc/contract'
import { err, ok } from './result'

const AOE2CM_HOST = 'aoe2cm.net'
const DRAFT_ID = /\/draft\/([A-Za-z0-9_-]+)(?:[/?#]|$)/i

/**
 * Import a completed civ draft from AoE2 Captains Mode.  The public API returns
 * the original Draft model (participants + event log); this adapter keeps the
 * stream desk provider-neutral and turns the event log into bans/picks.
 */
export async function importAoe2cmDraft(input: unknown): Promise<IpcResult<StreamDraftImport>> {
  if (typeof input !== 'string' || !input.trim()) return err('validation', 'Draft URL is required.')
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return err('validation', 'Enter a valid aoe2cm.net draft URL.')
  }
  if (url.hostname !== AOE2CM_HOST && !url.hostname.endsWith(`.${AOE2CM_HOST}`)) {
    return err('validation', 'Only aoe2cm.net draft links are supported.')
  }
  const match = DRAFT_ID.exec(url.pathname)
  if (!match?.[1]) return err('validation', 'The link does not contain a draft id.')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(`https://${AOE2CM_HOST}/api/draft/${encodeURIComponent(match[1])}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'RTSLytics/1.0' },
      signal: controller.signal,
    })
    if (!response.ok) return err('network', `AoE2CM returned HTTP ${response.status}.`)
    const payload = (await response.json()) as unknown
    const result = normalizeDraft(payload, url.toString())
    return result ? ok(result) : err('validation', 'AoE2CM draft contains no completed civ actions.')
  } catch (error) {
    return err('network', error instanceof Error ? error.message : 'Unable to load AoE2CM draft.')
  } finally {
    clearTimeout(timeout)
  }
}

function normalizeDraft(payload: unknown, sourceUrl: string): StreamDraftImport | null {
  if (!isObject(payload)) return null
  const events = Array.isArray(payload.events) ? payload.events : []
  const civDraft = { leftBans: [], rightBans: [], leftPicks: [], rightPicks: [] } as StreamDraftImport['civDraft']

  for (const event of events) {
    if (!isObject(event)) continue
    const action = String(event.actionType ?? event.action ?? '').toLowerCase()
    const player = String(event.player ?? event.executingPlayer ?? '').toUpperCase()
    const civ = String(event.chosenOptionId ?? event.civilization ?? '').trim()
    if (!civ || !['HOST', 'GUEST'].includes(player)) continue
    if (action === 'pick' || action === 'steal') {
      ;(player === 'HOST' ? civDraft.leftPicks : civDraft.rightPicks).push(civ)
    } else if (action === 'ban') {
      ;(player === 'HOST' ? civDraft.leftBans : civDraft.rightBans).push(civ)
    } else if (action === 'snipe') {
      // AoE2CM's legacy stream-manager integration displays a sniped civ as a
      // ban on the opposing side, which is the least surprising OBS graphic.
      ;(player === 'HOST' ? civDraft.rightBans : civDraft.leftBans).push(civ)
    }
  }

  const hasActions = Object.values(civDraft).some((items) => items.length > 0)
  if (!hasActions) return null
  return {
    sourceUrl,
    leftName: stringOrUndefined(payload.nameHost),
    rightName: stringOrUndefined(payload.nameGuest),
    civDraft,
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value)
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 80) : undefined
}
