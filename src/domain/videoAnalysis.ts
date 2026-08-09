import type { BuildOrder } from './buildOrderSchema'
import type {
  VideoAnalysisSignals,
  VideoTactic,
  VideoTranscriptSegment,
  VideoTranscriptStatus,
} from './videoEvidence'

export type VideoProvider = 'youtube' | 'twitch' | 'unknown'
export type VideoTranscriptProvider =
  'youtube-captions' | 'twitch-captions' | 'yt-dlp' | 'local' | 'none'

export interface VideoAnalysisInput {
  url: string
  civilization?: string | null
  /** AoE4World/local match id when the VOD was found for an exact game. */
  gameId?: string | null
}

/** Persisted local result of one video/VOD extraction run. */
export interface VideoAnalysisRecord {
  schemaVersion: 1
  id: string
  gameId: string | null
  provider: VideoProvider
  url: string
  title: string
  channel: string | null
  publishedAt: string | null
  capturedAt: string
  transcriptLanguage: string | null
  transcriptProvider: VideoTranscriptProvider
  transcriptStatus: VideoTranscriptStatus
  transcriptText: string
  transcriptSegments: VideoTranscriptSegment[]
  signals: VideoAnalysisSignals
  tactics: VideoTactic[]
  build: BuildOrder
  warnings: string[]
}
