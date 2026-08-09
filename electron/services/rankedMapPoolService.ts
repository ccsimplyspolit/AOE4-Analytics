import type { IpcResult } from '@ipc/contract'
import { resolveRankedMapPool } from '@domain/rankedMapPool'
import { ok } from './result'

/**
 * Main-process boundary for the dated map-pool snapshot. Keeping this out of
 * the renderer makes future replacement with a signed/remote manifest a
 * one-file change and keeps provenance available to every screen.
 */
export function getRankedMapPool(): IpcResult<ReturnType<typeof resolveRankedMapPool>> {
  return ok(resolveRankedMapPool())
}
