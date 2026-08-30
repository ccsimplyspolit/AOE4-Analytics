import type { IpcResult } from '@ipc/contract'
import { buildLastMatchCoachContext } from '@domain/coachContext'
import type { LastMatchCoachContext } from '@domain/coachContext'
import { getClient } from './appContext'
import { aoe4WorldOwnQuery } from './aoe4WorldAccess'
import { err, errFrom, ok } from './result'

function validProfileId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

/** Fetches only the bounded profile + last-game payload needed by Tincture Coach. */
export async function getLastMatchCoach(
  profileId: unknown,
): Promise<IpcResult<LastMatchCoachContext>> {
  if (!validProfileId(profileId)) {
    return err('validation', 'Player profile id must be a positive integer.')
  }

  try {
    const client = getClient()
    const [player, game] = await Promise.all([
      client.getPlayer(profileId),
      client.getLastGame(profileId, {
        includeStats: true,
        includeAlts: true,
        ...aoe4WorldOwnQuery(profileId),
      }),
    ])
    return ok(buildLastMatchCoachContext(player, game))
  } catch (error) {
    return errFrom(error)
  }
}
