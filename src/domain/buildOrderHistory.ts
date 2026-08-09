import type { BuildOrder } from './buildOrderSchema'
import { comparePlayerToBuild, selectReferenceBuild } from './buildOrderComparison'
import type { MatchSummary } from './statsSummary'
import { summaryPlayerForMe } from './summaryCoaching'
import type { StoredMatch } from '../store/historyStore'

/** Lightweight history row used by the multi-game build-review panel. */
export interface BuildAuditHistoryRow {
  matchId: string
  playedAt: string
  result: 'win' | 'loss' | null
  civ: string
  map: string
  format: string | null
  summaryStatus: 'available' | 'unavailable'
  referenceBuild: string | null
  score: number | null
  confirmedIssues: number
  reviewItems: number
  strengths: number
  eventCount: number
  gradeableCheckpoints: number
  timedCheckpoints: number
  confidence: 'high' | 'medium' | 'low' | 'none'
}

export interface BuildAuditHistorySummary {
  games: number
  available: number
  scored: number
  averageScore: number | null
  confirmedIssues: number
  reviewItems: number
  strengths: number
}

/**
 * Builds one honest row from a stored match and its decoded summary. Missing
 * summaries stay unavailable; they are never converted into a zero score.
 */
export function buildAuditHistoryRow(input: {
  match: StoredMatch
  summary: MatchSummary | null
  profileId: number | null
  builds: BuildOrder[]
  pinnedBuildName?: string | null
}): BuildAuditHistoryRow {
  const { match, summary, profileId, builds, pinnedBuildName } = input
  const base = {
    matchId: match.id,
    playedAt: match.playedAt,
    result: match.result,
    civ: match.civ,
    map: match.map,
    format: match.format ?? null,
  } as const
  if (!summary) {
    return {
      ...base,
      summaryStatus: 'unavailable',
      referenceBuild: null,
      score: null,
      confirmedIssues: 0,
      reviewItems: 0,
      strengths: 0,
      eventCount: 0,
      gradeableCheckpoints: 0,
      timedCheckpoints: 0,
      confidence: 'none',
    }
  }

  const me = summaryPlayerForMe(summary, profileId, match.civ)
  const selection = selectReferenceBuild(builds, {
    civ: match.civ,
    map: match.map,
    patch: match.patch,
    pinnedName: pinnedBuildName,
    player: me,
  })
  if (!me || !selection.reference) {
    return {
      ...base,
      summaryStatus: 'available',
      referenceBuild: selection.reference?.name ?? null,
      score: null,
      confirmedIssues: 0,
      reviewItems: 0,
      strengths: 0,
      eventCount: me?.buildOrder.length ?? 0,
      gradeableCheckpoints: 0,
      timedCheckpoints: 0,
      confidence: me ? 'low' : 'none',
    }
  }

  const audit = comparePlayerToBuild({
    player: me,
    civ: match.civ,
    reference: selection.reference,
    referenceCandidates: selection.candidates,
    referenceReason: selection.reason,
    referenceFitScore: selection.observedFitScore,
    referenceMatchedActions: selection.observedMatchedActions,
    referenceExpectedActions: selection.observedExpectedActions,
    referenceConfidence: selection.observedConfidence,
  })
  return {
    ...base,
    summaryStatus: 'available',
    referenceBuild: audit.reference?.name ?? null,
    score: audit.report?.score ?? null,
    confirmedIssues: audit.improvements.filter(
      (issue) => issue.certainty === 'confirmed' && issue.severity !== 'info',
    ).length,
    reviewItems: audit.improvements.filter((issue) => issue.certainty === 'review').length,
    strengths: audit.strengths.length,
    eventCount: audit.coverage.eventCount,
    gradeableCheckpoints: audit.coverage.gradeableCheckpoints,
    timedCheckpoints: audit.coverage.timedCheckpoints,
    confidence: audit.coverage.confidence,
  }
}

export function summarizeBuildAuditHistory(rows: BuildAuditHistoryRow[]): BuildAuditHistorySummary {
  const scored = rows.filter((row) => row.score != null)
  return {
    games: rows.length,
    available: rows.filter((row) => row.summaryStatus === 'available').length,
    scored: scored.length,
    averageScore:
      scored.length > 0
        ? Math.round((scored.reduce((sum, row) => sum + (row.score ?? 0), 0) / scored.length) * 10) / 10
        : null,
    confirmedIssues: rows.reduce((sum, row) => sum + row.confirmedIssues, 0),
    reviewItems: rows.reduce((sum, row) => sum + row.reviewItems, 0),
    strengths: rows.reduce((sum, row) => sum + row.strengths, 0),
  }
}
