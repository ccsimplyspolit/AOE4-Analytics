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
  /** Guide vs ranked/demo VOD — used to keep build pages from mixing teaching tapes with casts. */
  sourceKind?: 'guide' | 'demo' | 'other'
  /** Transcript windows aligned to build-order checkpoints (YouTube `t=` seconds). */
  frameCheckpoints?: Array<{ timeSec: number; label: string; quote: string }>
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

/**
 * Compact evidence keys (`holyromanempire`) and YouTube title aliases.
 * Longer aliases must win so "Holy Roman Empire" is not parsed as noise next to HRE.
 */
const CIV_TITLE_ALIASES: readonly { compact: string; aliases: readonly string[] }[] = [
  { compact: 'abbasiddynasty', aliases: ['abbasid dynasty', 'abbasids', 'abbasid'] },
  { compact: 'ayyubids', aliases: ['ayyubids', 'ayyubid'] },
  { compact: 'byzantines', aliases: ['byzantines', 'byzantine'] },
  { compact: 'chinese', aliases: ['chinese'] },
  { compact: 'delhisultanate', aliases: ['delhi sultanate', 'delhi'] },
  { compact: 'english', aliases: ['english'] },
  { compact: 'french', aliases: ['french'] },
  { compact: 'goldenhorde', aliases: ['golden horde'] },
  { compact: 'houseoflancaster', aliases: ['house of lancaster', 'lancaster'] },
  { compact: 'holyromanempire', aliases: ['holy roman empire', 'hre'] },
  { compact: 'japanese', aliases: ['japanese'] },
  { compact: 'jeannedarc', aliases: ["jeanne d'arc", 'jeanne d arc', 'joan of arc', 'jeanne'] },
  { compact: 'jindynasty', aliases: ['jin dynasty'] },
  { compact: 'knightstemplar', aliases: ['knights templar', 'templar'] },
  { compact: 'malians', aliases: ['malians', 'malian'] },
  { compact: 'macedoniandynasty', aliases: ['macedonian dynasty', 'macedonians', 'macedonian'] },
  { compact: 'mongols', aliases: ['mongols', 'mongol'] },
  { compact: 'orderofthedragon', aliases: ['order of the dragon', 'ootd'] },
  { compact: 'ottomans', aliases: ['ottomans', 'ottoman'] },
  { compact: 'rus', aliases: ['rus'] },
  { compact: 'sengokudaimyo', aliases: ['sengoku daimyo', 'sengoku'] },
  { compact: 'tughlaqdynasty', aliases: ['tughlaq dynasty', 'tughlaq'] },
  { compact: 'zhuxislegacy', aliases: ["zhu xi's legacy", 'zhu xi legacy', 'zhu xi'] },
]

const ALIAS_BY_LENGTH = CIV_TITLE_ALIASES.flatMap((civ) =>
  civ.aliases.map((alias) => ({ compact: civ.compact, alias })),
).sort((left, right) => right.alias.length - left.alias.length)

/** Collapse a civ display name, slug, or evidence map key to the harvest compact form. */
export function compactCivKey(value: string | string[] | null | undefined): string {
  const label = Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
  return label.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '')
}

function aliasBoundaryPattern(alias: string): RegExp {
  return new RegExp(`(?<![a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`, 'i')
}

function firstCivKeyInText(text: string): string | null {
  const lower = text.toLocaleLowerCase()
  for (const { compact, alias } of ALIAS_BY_LENGTH) {
    if (aliasBoundaryPattern(alias).test(lower)) return compact
  }
  return null
}

/**
 * The civilization a video is actually teaching, from its title.
 * A matchup mention in the description must not steal another civ's masterclass.
 */
export function primaryCivKeyFromVideoTitle(title: string): string | null {
  const trimmed = title.trim()
  const howToPlay = /how to play(?: the)?\s+(.+?)(?:\s+like a pro|\s+[-–—]|\s+masterclass|\s+build|\s+guide|\s+in\b|$)/i.exec(
    trimmed,
  )
  if (howToPlay?.[1]) {
    const subject = firstCivKeyInText(howToPlay[1])
    if (subject) return subject
  }

  const versus = /^(.+?)\s+vs\.?\s+/i.exec(trimmed)
  if (versus?.[1]) {
    const left = firstCivKeyInText(versus[1])
    if (left) return left
  }

  return firstCivKeyInText(trimmed)
}

export function videoTitleBelongsToCiv(title: string, civKey: string): boolean {
  const want = compactCivKey(civKey)
  if (!want) return false
  const subject = primaryCivKeyFromVideoTitle(title)
  if (subject) return subject === want
  return firstCivKeyInText(title) === want
}

function recountEvidence(
  evidence: BuildOrderVideoEvidence,
  sources: VideoEvidenceSource[],
): BuildOrderVideoEvidence {
  const actionCounts = new Map<string, number>()
  const resourceCounts = new Map<string, number>()
  const topicCounts = new Map<string, number>()
  const opponentCounts = new Map<string, number>()
  const militaryCounts = new Map<string, number>()
  const timingCounts = new Map<string, VideoTimingSignal>()

  const bump = (map: Map<string, number>, values: string[]) => {
    for (const value of values) map.set(value, (map.get(value) ?? 0) + 1)
  }

  for (const source of sources) {
    bump(actionCounts, source.signals.actions)
    bump(resourceCounts, source.signals.resources)
    bump(topicCounts, source.signals.topics)
    bump(opponentCounts, source.signals.opponentCivs)
    bump(militaryCounts, source.signals.militaryMentions)
    for (const timing of source.signals.timings) {
      const current = timingCounts.get(timing.label)
      timingCounts.set(timing.label, {
        label: timing.label,
        timeSec: timing.timeSec,
        mentions: (current?.mentions ?? 0) + timing.mentions,
      })
    }
  }

  const top = (map: Map<string, number>, limit: number) =>
    [...map.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, limit)
      .map(([label]) => label)

  return {
    ...evidence,
    sampleSize: sources.length,
    coverageNote:
      sources.length === evidence.sources.length
        ? evidence.coverageNote
        : `${sources.length} matching videos kept; videos about other civilizations were removed`,
    commonActions: top(actionCounts, 5),
    commonResources: top(resourceCounts, 4),
    commonTopics: top(topicCounts, 6),
    commonOpponents: top(opponentCounts, 8),
    commonMilitaryMentions: top(militaryCounts, 8),
    timingSignals: [...timingCounts.values()]
      .sort((left, right) => left.timeSec - right.timeSec)
      .slice(0, 8),
    sources,
  }
}

/** Drop harvested videos whose title is clearly about a different civilization. */
export function filterVideoEvidenceForCiv(
  evidence: BuildOrderVideoEvidence | undefined,
  civKey: string,
): BuildOrderVideoEvidence | undefined {
  if (!evidence) return undefined
  const kept = evidence.sources.filter((source) => videoTitleBelongsToCiv(source.title, civKey))
  if (kept.length === 0) return undefined
  if (kept.length === evidence.sources.length) return evidence
  return recountEvidence(evidence, kept)
}
