import { CIV_PROFILES } from '@data/civProfiles'
import type { BuildCatalogEntry } from './buildCatalog'
import type { LastMatchCoachContext } from './coachContext'
import { civDisplayName } from './civ'

export interface CoachBuildRecommendation {
  entry: BuildCatalogEntry
  score: number
  reasons: string[]
}

function normalized(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function buildMatchesCiv(entry: BuildCatalogEntry, civilization: string): boolean {
  const target = normalized(civDisplayName(civilization))
  return entry.civilizationLabels.some((label) => normalized(label) === target)
}

function profileText(civilization: string): string {
  const profile = CIV_PROFILES[civilization]
  return profile
    ? [profile.focus, profile.opening, profile.gamePlan, ...profile.tags].join(' ')
    : ''
}

/** Rank local Cellar builds for the actual civ and match context without pretending to detect a build. */
export function recommendBuildsForCoach(
  context: LastMatchCoachContext,
  entries: readonly BuildCatalogEntry[],
  limit = 5,
): CoachBuildRecommendation[] {
  const civ = context.player.civilization
  const profile = profileText(civ).toLocaleLowerCase()
  const opponentText = context.opponents
    .map((opponent) => profileText(opponent.civilization))
    .join(' ')
    .toLocaleLowerCase()

  return entries
    .filter((entry) => buildMatchesCiv(entry, civ))
    .map((entry) => {
      const searchable = [
        entry.build.name,
        entry.build.archetype,
        entry.build.reasoning,
        entry.build.author,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
      let score = 100
      const reasons = [`Matches ${civDisplayName(civ)}`]

      if (entry.timedSteps > 0) {
        score += 12
        reasons.push(`${entry.timedSteps} timed checkpoints`)
      }
      if (entry.hasVideoEvidence) {
        score += 8
        reasons.push('Recent video evidence')
      }
      const videoEvidence = entry.build.video_evidence
      const coveredOpponent = context.opponents.find((opponent) =>
        videoEvidence?.commonOpponents.some(
          (covered) => normalized(covered) === normalized(civDisplayName(opponent.civilization)),
        ),
      )
      if (coveredOpponent) {
        score += 12
        reasons.push(`Video evidence covers ${civDisplayName(coveredOpponent.civilization)}`)
      }
      if (coveredOpponent && videoEvidence?.commonTopics.includes('Counterplay')) {
        score += 4
        reasons.push('Video evidence includes counterplay context')
      }
      if (entry.confidence != null) score += Math.round(entry.confidence * 10)
      if (
        profile &&
        searchable.split(/\s+/).some((word) => word.length > 4 && profile.includes(word))
      ) {
        score += 6
        reasons.push('Fits the civ profile')
      }
      if (opponentText && /aggressive|tempo|raiding|cavalry|mobility/.test(opponentText)) {
        if (/defen|wall|boom|economy|counter|spear|archer/.test(searchable)) {
          score += 5
          reasons.push('Useful against a mobile pressure read')
        }
      }

      return { entry, score, reasons }
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        (right.entry.confidence ?? -1) - (left.entry.confidence ?? -1) ||
        left.entry.build.name.localeCompare(right.entry.build.name),
    )
    .slice(0, Math.max(1, limit))
}
