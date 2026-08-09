/**
 * Provenance-first, derived evidence extracted from public AoE4 videos.
 *
 * We deliberately store facts about a video and short analytical signals,
 * rather than copying a creator's full transcript into the application.
 */
export interface VideoTimingSignal {
  label: string
  timeSec: number
  mentions: number
}

/** A timestamped caption fragment kept for local video analysis. */
export interface VideoTranscriptSegment {
  startSec: number
  durationSec?: number
  text: string
}

/** A compact, provenance-linked tactical observation derived from a caption. */
export interface VideoTactic {
  id: string
  category: 'opening' | 'economy' | 'military' | 'transition' | 'reaction' | 'general'
  title: string
  detail: string
  timeSec: number | null
  confidence: number
}

export interface VideoAnalysisSignals {
  archetype: string | null
  actions: string[]
  resources: string[]
  topics: string[]
  opponentCivs: string[]
  militaryMentions: string[]
  timings: VideoTimingSignal[]
  confidence: number
}

export type VideoTranscriptStatus =
  'available' | 'missing' | 'unavailable' | 'rate-limited' | 'not-requested'

export interface VideoEvidenceSource {
  id: string
  title: string
  url: string
  channel: string | null
  publishedAt: string
  viewCount: number | null
  transcriptLanguage: string | null
  transcriptSource: 'manual' | 'auto' | 'none'
  transcriptProvider?: 'youtube-transcript-api' | 'yt-dlp' | 'cache' | 'local' | 'none'
  transcriptStatus?: VideoTranscriptStatus
  transcriptWordCount?: number
  transcriptExcerpt?: string
  tactics?: VideoTactic[]
  signals: VideoAnalysisSignals
}

export interface BuildOrderVideoEvidence {
  schemaVersion: 1
  windowStart: string
  windowEnd: string
  sampleSize: number
  requestedSampleSize: number
  coverageNote: string | null
  commonActions: string[]
  commonResources: string[]
  commonTopics: string[]
  commonOpponents: string[]
  commonMilitaryMentions: string[]
  timingSignals: VideoTimingSignal[]
  sources: VideoEvidenceSource[]
}

export function evidenceLabel(evidence: BuildOrderVideoEvidence): string {
  if (evidence.sampleSize === 0) return 'No video evidence harvested yet'
  const transcriptCount = evidence.sources.filter(
    (source) => source.transcriptSource !== 'none',
  ).length
  const videoLabel = `${evidence.sampleSize} video${evidence.sampleSize === 1 ? '' : 's'}`
  if (transcriptCount === 0) return `${videoLabel} · metadata only`
  return `${videoLabel} analysed · ${transcriptCount} transcript${transcriptCount === 1 ? '' : 's'}`
}
