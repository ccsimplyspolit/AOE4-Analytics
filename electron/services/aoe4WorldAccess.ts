import { getSettings } from './appContext'
import { getAoe4WorldApiKey } from './externalApiService'

/**
 * Overlay/custom-game access applies only to the signed-in AoE4World account.
 * Never attach this key to opponent or scout requests.
 */
export function aoe4WorldOwnQuery(profileId: number | null | undefined): {
  apiKey?: string
  includeCustom?: true
} {
  const apiKey = getAoe4WorldApiKey()
  const ownId = getSettings().getAll().profileId
  if (!apiKey || profileId == null || ownId == null || profileId !== ownId) return {}
  return { apiKey, includeCustom: true }
}
