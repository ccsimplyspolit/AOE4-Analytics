import { BEASTY_VIDEOS, type BeastyVideoEntry } from './beastyCatalog.generated'
import { VIDEO_EVIDENCE_BY_CIV as HARVESTED_VIDEO_EVIDENCE } from './videoEvidence.generated'
import {
  compactCivKey,
  filterVideoEvidenceForCiv,
  videoTitleBelongsToCiv,
  type BuildOrderVideoEvidence,
  type VideoEvidenceSource,
} from '@domain/videoEvidence'

const COMPACT_TO_SLUG: Record<string, string> = {
  abbasiddynasty: 'abbasid_dynasty',
  ayyubids: 'ayyubids',
  byzantines: 'byzantines',
  chinese: 'chinese',
  delhisultanate: 'delhi_sultanate',
  english: 'english',
  french: 'french',
  goldenhorde: 'golden_horde',
  houseoflancaster: 'house_of_lancaster',
  holyromanempire: 'holy_roman_empire',
  japanese: 'japanese',
  jeannedarc: 'jeanne_darc',
  jindynasty: 'jin_dynasty',
  knightstemplar: 'knights_templar',
  malians: 'malians',
  macedoniandynasty: 'macedonian_dynasty',
  mongols: 'mongols',
  orderofthedragon: 'order_of_the_dragon',
  ottomans: 'ottomans',
  rus: 'rus',
  sengokudaimyo: 'sengoku_daimyo',
  tughlaqdynasty: 'tughlaq_dynasty',
  zhuxislegacy: 'zhu_xis_legacy',
}

function sourceFromBeasty(video: BeastyVideoEntry): VideoEvidenceSource {
  return {
    id: video.id,
    title: video.title,
    url: video.url,
    channel: 'BeastyqtSC2',
    publishedAt: video.publishedAt,
    viewCount: video.viewCount || null,
    transcriptLanguage: null,
    transcriptSource: 'none',
    transcriptProvider: 'none',
    transcriptStatus: video.transcriptStatus === 'available' ? 'available' : 'missing',
    signals: {
      archetype: video.category === 'build_order' ? 'Build order' : null,
      actions: [],
      resources: [],
      topics: video.category === 'build_order' ? ['Opening military'] : ['Counterplay'],
      opponentCivs: [],
      militaryMentions: [],
      timings: [],
      confidence: 0.7,
    },
  }
}

function evidenceFromBeasty(civKey: string): BuildOrderVideoEvidence | undefined {
  const slug = COMPACT_TO_SLUG[compactCivKey(civKey)]
  if (!slug) return undefined
  const sources = BEASTY_VIDEOS.filter(
    (video) =>
      video.aoe4Relevant !== false &&
      video.primaryCivs.includes(slug) &&
      videoTitleBelongsToCiv(video.title, civKey) &&
      /\b(how to play|build order|masterclass)\b/i.test(video.title),
  )
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
    .slice(0, 5)
    .map(sourceFromBeasty)
  if (sources.length === 0) return undefined
  return {
    schemaVersion: 1,
    windowStart: sources.at(-1)?.publishedAt?.slice(0, 10) ?? '2025-01-01',
    windowEnd: sources[0]?.publishedAt?.slice(0, 10) ?? '2026-08-22',
    sampleSize: sources.length,
    requestedSampleSize: 5,
    coverageNote: `${sources.length} creator videos whose titles teach this civilization`,
    commonActions: [],
    commonResources: [],
    commonTopics: [...new Set(sources.flatMap((source) => source.signals.topics))],
    commonOpponents: [],
    commonMilitaryMentions: [],
    timingSignals: [],
    sources,
  }
}

/** Harvested evidence with title-mismatch videos removed and a catalog fallback. */
export function videoEvidenceForCiv(
  civilization: string | string[] | null | undefined,
): BuildOrderVideoEvidence | undefined {
  const key = compactCivKey(civilization)
  if (!key) return undefined
  return filterVideoEvidenceForCiv(HARVESTED_VIDEO_EVIDENCE[key], key) ?? evidenceFromBeasty(key)
}

export const VIDEO_EVIDENCE_BY_CIV: Record<string, BuildOrderVideoEvidence> = Object.fromEntries(
  [...new Set([...Object.keys(HARVESTED_VIDEO_EVIDENCE), ...Object.keys(COMPACT_TO_SLUG)])].flatMap(
    (key) => {
      const evidence = videoEvidenceForCiv(key)
      return evidence ? [[key, evidence] as const] : []
    },
  ),
)
