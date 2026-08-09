/**
 * Safe boundary for an optional local OCR/HUD companion.
 *
 * This follows the useful part of ycx-aoe4-hud-frontend's design: the app may
 * send calibrated screen ROIs to a local process and receive confidence-scored
 * observations. The core app remains usable without that process and never
 * reads game memory or injects into AoE4.
 */

export type HudRoiKind =
  | 'timer'
  | 'idle'
  | 'population'
  | 'res_food'
  | 'res_wood'
  | 'res_gold'
  | 'res_stone'
  | 'gather_food'
  | 'gather_wood'
  | 'gather_gold'
  | 'gather_stone'
  | 'custom'

export interface HudRoi {
  id: string
  name: string
  kind: HudRoiKind
  rect: { x: number; y: number; w: number; h: number }
  expected?: { charset?: 'digits' | 'digits_colon'; maxLen?: number }
}

export interface HudScreenSignature {
  width: number
  height: number
  dpiScale?: number
  displayId?: number
}

export interface HudConfigPayload {
  clientId: 'rtslytics'
  screen: HudScreenSignature
  rois: HudRoi[]
  recognition: { enabled: boolean; hz: number }
  tts?: { enabled: boolean; rate?: number; volume?: number }
}

export interface HudField<T> {
  value: T
  confidence: number
}

export interface HudDataPayload {
  fields: {
    timer?: HudField<string>
    idleVillagers?: HudField<number>
    population?: HudField<number>
    resources?: Partial<Record<'food' | 'wood' | 'gold' | 'stone', HudField<number>>>
    gatherers?: Partial<Record<'food' | 'wood' | 'gold' | 'stone', HudField<number>>>
  }
  frameTs: number
  quality?: { ok: boolean; reason?: string }
}

export type HudMessage =
  | { type: 'CONFIG_SET'; version: 1; ts: number; payload: HudConfigPayload }
  | { type: 'START' | 'STOP'; version: 1; ts: number; payload: Record<string, never> }
  | { type: 'PING'; version: 1; ts: number; payload: { seq: number } }
  | { type: 'BACKEND_STATUS'; version: 1; ts: number; payload: { state: string; message?: string } }
  | { type: 'DATA'; version: 1; ts: number; payload: HudDataPayload }
  | {
      type: 'ALERT_EVENT'
      version: 1
      ts: number
      payload: { id: string; level: 'info' | 'warn' | 'critical'; text: string; spoken?: boolean }
    }

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Reject malformed/untrusted local backend messages before they reach UI state. */
export function parseHudMessage(value: unknown): HudMessage | null {
  const message = object(value)
  if (!message || message.version !== 1 || typeof message.type !== 'string') return null
  if (!object(message.payload)) return null
  const ts = finite(message.ts)
  if (ts == null) return null
  const type = message.type
  if (
    type !== 'CONFIG_SET' &&
    type !== 'START' &&
    type !== 'STOP' &&
    type !== 'PING' &&
    type !== 'BACKEND_STATUS' &&
    type !== 'DATA' &&
    type !== 'ALERT_EVENT'
  ) {
    return null
  }
  return message as HudMessage
}

export function clampHudRoi(roi: HudRoi): HudRoi {
  const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  return {
    ...roi,
    rect: {
      x: clamp(roi.rect.x),
      y: clamp(roi.rect.y),
      w: clamp(roi.rect.w),
      h: clamp(roi.rect.h),
    },
  }
}

export function buildHudCommand(
  type: 'START' | 'STOP' | 'PING',
  payload: Record<string, never> | { seq: number } = {},
  ts = Date.now(),
): HudMessage {
  return { type, version: 1, ts, payload } as HudMessage
}
