import type { IpcResult, PublicGameDetail, PublicGameQuery } from '@ipc/contract'
import { perPlayerStatsFromMatch } from '@domain/relic'
import { err, errFrom, ok } from './result'
import { getClient, getRelicClient } from './appContext'
import { fetchRankedSummary } from './relicAuthService'

class PublicGameValidationError extends Error {}

function parseQuery(input: unknown): PublicGameQuery {
  if (!input || typeof input !== 'object') {
    throw new PublicGameValidationError('A profile id and game id are required')
  }
  const value = input as Record<string, unknown>
  const profileId = value.profileId
  const gameId = value.gameId
  if (
    typeof profileId !== 'number' ||
    !Number.isSafeInteger(profileId) ||
    profileId <= 0 ||
    typeof gameId !== 'number' ||
    !Number.isSafeInteger(gameId) ||
    gameId <= 0
  ) {
    throw new PublicGameValidationError('Profile id and game id must be positive integers')
  }
  return { profileId, gameId }
}

/** Loads a match from public APIs; optional summary data never blocks the match view. */
export async function getPublicGame(input: unknown): Promise<IpcResult<PublicGameDetail>> {
  try {
    const { profileId, gameId } = parseQuery(input)
    const game = await getClient().getGame(profileId, gameId)
    const recentHistory = await getRelicClient()
      .getRecentMatchHistory(profileId)
      .catch(() => null)
    const relicMatch =
      recentHistory?.matchHistoryStats.find((match) => Number(match.id) === gameId) ?? null
    const perPlayer = relicMatch ? perPlayerStatsFromMatch(relicMatch) : []

    let summary = null
    if (recentHistory) {
      try {
        summary = await fetchRankedSummary(String(gameId), profileId, recentHistory)
      } catch {
        // Public combat data remains useful when Steam summary access is unavailable.
      }
    }

    return ok({
      game,
      profileId,
      perPlayer,
      summary,
      summaryStatus: summary ? 'available' : 'unavailable',
    })
  } catch (error) {
    return error instanceof PublicGameValidationError
      ? err('validation', error.message)
      : errFrom(error)
  }
}
