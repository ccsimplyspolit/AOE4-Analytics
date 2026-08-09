import type { VideoAnalysisRecord } from './videoAnalysis'

/** Input for the automatic public-gameplay lookup workflow. */
export interface GameplayAutoInput {
  /** AoE4World game id. Custom/AI matches are intentionally not accepted. */
  gameId: string
  /** Optional active profile for the exact AoE4World game lookup. */
  profileId?: number | null
  civilization: string
  opponentCivilization?: string | null
  map?: string | null
  durationSec?: number | null
  playedAt?: string | null
  /** Skip the potentially large yt-dlp download and analyze public captions only. */
  download?: boolean
  /** Bypass the short-lived workflow cache when the user explicitly retries. */
  force?: boolean
}

export type GameplayProvider = 'twitch' | 'youtube'

export interface GameplayCandidate {
  provider: GameplayProvider
  url: string
  title: string
  channel: string | null
  durationSec: number | null
  publishedAt: string | null
  /** True only when AoE4World linked the VOD to this exact game id. */
  exactGame: boolean
  /** AoE4World's in-VOD offset for the beginning of the game, when known. */
  offsetSec: number | null
  score: number
  reason: string
}

export type GameplayAutoStage =
  | 'searching'
  | 'found'
  | 'downloading'
  | 'downloaded'
  | 'analyzing'
  | 'completed'
  | 'not_found'
  | 'failed'

export interface GameplayAutoResult {
  gameId: string
  stage: GameplayAutoStage
  candidate: GameplayCandidate | null
  /** Absolute path in the app's private userData folder, if downloaded. */
  downloadedPath: string | null
  downloadedBytes: number | null
  analysis: VideoAnalysisRecord | null
  warnings: string[]
  attemptedAt: string
}

const GAME_ID = /^\d{1,16}$/

export function isGameplayAutoInput(value: unknown): value is GameplayAutoInput {
  if (!value || typeof value !== 'object') return false
  const input = value as Partial<GameplayAutoInput>
  return (
    typeof input.gameId === 'string' &&
    GAME_ID.test(input.gameId) &&
    (input.profileId == null ||
      (typeof input.profileId === 'number' &&
        Number.isSafeInteger(input.profileId) &&
        input.profileId > 0)) &&
    typeof input.civilization === 'string' &&
    input.civilization.trim().length > 0
  )
}

export function gameplaySearchQuery(input: GameplayAutoInput): string {
  return [input.map, input.civilization, input.opponentCivilization]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .join(' ')
}
