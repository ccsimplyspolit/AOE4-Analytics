/**
 * Shared types and evidence helpers for the 70-point coaching reports.
 * Never invent timings, idle, sheep, or villager counts — missing fields stay missing.
 */

import type { ScoutMatchRow } from '../../electron/ipc/contract'
import type { StoredMatch } from '../store/historyStore'
import { resultFromPerPlayer } from './analysis'
import { CIV_PROFILES } from '../data/civProfiles'
import { civDisplayName } from './civ'
import { selectCreatorMatchCoach } from './creatorVideoCoach'
import { CIV_AND_MAP_NAMES, expandGameNameKeys, lookupCivOrMapName } from './gameNameDictionary'
import { PRO_TIPS, VIDEO_BASE_URLS, buildTipVideoUrl, type ProTip, type TipCategory } from './proTips'
import type { MatchSummary, PlayerSummary } from './statsSummary'
import { civFromToken } from './statsSummary'

const RU_GAME_NAMES = expandGameNameKeys(CIV_AND_MAP_NAMES.ru)

/** Russian civ/map label for coaching copy. Falls back to the English display name. */
export function civLabelRu(civ: string): string {
  const en = civDisplayName(civ)
  return lookupCivOrMapName(RU_GAME_NAMES, en) ?? lookupCivOrMapName(RU_GAME_NAMES, civ) ?? en
}

export function mapLabelRu(map: string): string {
  return lookupCivOrMapName(RU_GAME_NAMES, map) ?? map
}

export type CoachConfidence = 'confirmed' | 'probable' | 'single'
export type CoachSeverity = 'critical' | 'important' | 'minor'
export type FormatLane = '1v1' | '2v2' | '3v3' | '4v4' | 'other'
export type CoachVoice = 'you' | 'third'

export interface BiText {
  text: string
  textRu: string
}

export interface CoachCitation {
  source: 'proTip' | 'creator'
  videoId: string
  timeSec: number
  label: string
  url: string
}

export type CoachSection<T> =
  | { status: 'ok'; confidence: CoachConfidence; data: T }
  | { status: 'insufficient_data'; reason: BiText }

export interface CoachFinding {
  id: string
  originalPoints: readonly number[]
  severity: CoachSeverity
  title: BiText
  why: BiText
  instead: BiText
  evidence: string
  evidenceCount: number
  confidence: CoachConfidence
  citations: CoachCitation[]
}

export interface CoachGame {
  playedAt: string
  result: 'win' | 'loss' | null
  civ: string
  oppCiv: string | null
  oppCivs: string[]
  oppNames: string[]
  map: string
  durationSec: number | null
  format: string | null
  formatLane: FormatLane
  ratingDiff: number | null
  apm: number | null
  unitsProduced: number | null
  kills: number | null
  deaths: number | null
  techs: number | null
  villagersProduced: number | null
  foodGathered: number | null
  woodGathered: number | null
  goldGathered: number | null
  age2Sec: number | null
  age3Sec: number | null
  relicsCaptured: number | null
  sacredCaptured: number | null
  villagerHigh: number | null
  villagersLost: number | null
  buildTokens: string[]
  teammates: { profileId: number | null; name: string; civ: string }[]
  opponents: { profileId: number | null; name: string; civ: string }[]
  source: 'scout' | 'local' | 'summary'
}

export interface ChecklistItem {
  id: string
  label: BiText
}

export function bi(text: string, textRu: string): BiText {
  return { text, textRu }
}

export function coachConfidence(evidenceCount: number): CoachConfidence {
  if (evidenceCount >= 12) return 'confirmed'
  if (evidenceCount >= 5) return 'probable'
  return 'single'
}

export function insufficient(reason: string, reasonRu: string): CoachSection<never> {
  return { status: 'insufficient_data', reason: bi(reason, reasonRu) }
}

export function classifyFormat(format: string | null | undefined, teammateCount = 0): FormatLane {
  const s = (format ?? '').toLowerCase()
  if (s.includes('4v4') || s.includes('team_4')) return '4v4'
  if (s.includes('3v3')) return '3v3'
  if (s.includes('2v2')) return '2v2'
  if (s.includes('1v1') || s.includes('rm_solo') || s.includes('rm_1v1')) return '1v1'
  if (teammateCount >= 3) return '4v4'
  if (teammateCount === 2) return '3v3'
  if (teammateCount === 1) return '2v2'
  return 'other'
}

export function durationBucket(sec: number | null): 'short' | 'mid' | 'late' | null {
  if (sec == null || sec <= 0) return null
  if (sec < 15 * 60) return 'short'
  if (sec <= 28 * 60) return 'mid'
  return 'late'
}

export function who(voice: CoachVoice, name: string): { en: string; ru: string } {
  if (voice === 'you') return { en: 'You', ru: 'ты' }
  return { en: name, ru: name }
}

/** Pick you/they wording so Russian verbs stay grammatical. `{name}` is replaced in the third-person pair. */
export function biVoice(
  voice: CoachVoice,
  name: string,
  you: { en: string; ru: string },
  other: { en: string; ru: string },
): BiText {
  if (voice === 'you') return bi(you.en, you.ru)
  return bi(other.en.replaceAll('{name}', name), other.ru.replaceAll('{name}', name))
}

export function avg(nums: number[]): number | null {
  if (nums.length === 0) return null
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

export function rate(wins: number, decided: number): number | null {
  return decided > 0 ? Math.round((wins / decided) * 100) : null
}

export function tokensFromBuild(player: PlayerSummary | null | undefined): string[] {
  if (!player) return []
  return player.buildOrder.map((ev) => `${ev.name} ${ev.blueprint}`.toLowerCase())
}

function summaryForProfile(summary: MatchSummary | undefined, profileId: number): PlayerSummary | null {
  if (!summary) return null
  return summary.players.find((p) => p.profileId === profileId) ?? null
}

export function coachGamesFromScout(rows: ScoutMatchRow[]): CoachGame[] {
  return rows.map((row) => ({
    playedAt: row.startedAt,
    result: row.result === 'unknown' ? null : row.result,
    civ: row.civilization ?? 'unknown',
    oppCiv: row.opponentCivilizations[0] ?? null,
    oppCivs: row.opponentCivilizations,
    oppNames: row.opponentNames,
    map: row.map ?? '',
    durationSec: row.durationSec,
    format: row.format,
    formatLane: classifyFormat(row.format),
    ratingDiff: null,
    apm: null,
    unitsProduced: null,
    kills: null,
    deaths: null,
    techs: null,
    villagersProduced: null,
    foodGathered: null,
    woodGathered: null,
    goldGathered: null,
    age2Sec: null,
    age3Sec: null,
    relicsCaptured: null,
    sacredCaptured: null,
    villagerHigh: null,
    villagersLost: null,
    buildTokens: [],
    teammates: [],
    opponents: row.opponentCivilizations.map((civ, i) => ({
      profileId: null,
      name: row.opponentNames[i] ?? 'Opponent',
      civ,
    })),
    source: 'scout' as const,
  }))
}

export function coachGamesFromStored(
  matches: StoredMatch[],
  profileId: number,
  summariesByMatchId?: Record<string, MatchSummary | null | undefined>,
): CoachGame[] {
  return matches.map((match) => {
    const mine = match.perPlayer?.find((p) => p.profileId === profileId)
    const result = match.result ?? resultFromPerPlayer(match.perPlayer, profileId)
    const summary = summariesByMatchId?.[match.id] ?? undefined
    const sp = summaryForProfile(summary, profileId)
    const totals = sp?.totals ?? null
    const teammates = (match.myTeam ?? []).map((p) => ({
      profileId: null as number | null,
      name: p.name ?? 'Ally',
      civ: p.civ,
    }))
    const opponents = match.oppTeam?.length
      ? match.oppTeam.map((p) => ({
          profileId: null as number | null,
          name: p.name ?? 'Opponent',
          civ: p.civ,
        }))
      : match.oppCiv
        ? [{ profileId: null, name: match.oppName ?? 'Opponent', civ: match.oppCiv }]
        : []
    return {
      playedAt: match.playedAt,
      result,
      civ: match.civ,
      oppCiv: match.oppCiv,
      oppCivs: opponents.map((o) => o.civ),
      oppNames: opponents.map((o) => o.name),
      map: match.map,
      durationSec: match.durationSec,
      format: match.format ?? null,
      formatLane: classifyFormat(match.format, teammates.length),
      ratingDiff: match.ratingDiff,
      apm: mine?.apm ?? match.analysis.apm ?? null,
      unitsProduced: mine?.unitsProduced ?? null,
      kills: mine?.kills ?? null,
      deaths: mine?.deaths ?? null,
      techs: mine?.techsResearched ?? null,
      villagersProduced: match.local?.villagersProduced ?? totals?.villagerHigh ?? null,
      foodGathered: match.local?.resourcesGathered?.food ?? totals?.resourcesGathered.food ?? null,
      woodGathered: match.local?.resourcesGathered?.wood ?? totals?.resourcesGathered.wood ?? null,
      goldGathered: match.local?.resourcesGathered?.gold ?? totals?.resourcesGathered.gold ?? null,
      age2Sec: totals?.age2Sec ?? null,
      age3Sec: totals?.age3Sec ?? null,
      relicsCaptured: totals?.relicsCaptured ?? null,
      sacredCaptured: totals?.sacredCaptured ?? null,
      villagerHigh: totals?.villagerHigh ?? null,
      villagersLost: sp?.villagersLost ?? null,
      buildTokens: tokensFromBuild(sp),
      teammates,
      opponents,
      source: summary ? ('summary' as const) : ('local' as const),
    }
  })
}

export function collectCoachGames(input: {
  profileId: number
  scoutGames?: ScoutMatchRow[]
  localMatches?: StoredMatch[]
  summariesByMatchId?: Record<string, MatchSummary | null | undefined>
}): CoachGame[] {
  const local = input.localMatches ?? []
  if (local.length > 0) return coachGamesFromStored(local, input.profileId, input.summariesByMatchId)
  return coachGamesFromScout(input.scoutGames ?? [])
}

export function hasToken(tokens: string[], ...needles: string[]): boolean {
  return tokens.some((t) => needles.some((n) => t.includes(n)))
}

export function gamesWith(games: CoachGame[], pred: (g: CoachGame) => boolean): CoachGame[] {
  return games.filter(pred)
}

export function groupCount<T extends string>(items: T[]): { key: T; count: number }[] {
  const map = new Map<T, number>()
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1)
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
}

export function civLabel(slug: string): string {
  return civDisplayName(slug)
}

export function citationsFor(
  categories: TipCategory[],
  civ?: string | null,
  limit = 2,
): CoachCitation[] {
  const slug = civ?.toLowerCase() ?? ''
  const tips: ProTip[] = []
  for (const tip of PRO_TIPS) {
    if (!categories.includes(tip.category)) continue
    if (tip.trigger.civs && slug && !tip.trigger.civs.includes(slug) && !tip.trigger.always) continue
    tips.push(tip)
    if (tips.length >= limit) break
  }
  const fromTips: CoachCitation[] = tips.map((tip) => ({
    source: 'proTip',
    videoId: tip.videoId === 'macro' ? 'vrH85EESrSY' : 'FdJFDsXr4ws',
    timeSec: tip.timeSec,
    label: tip.shortText,
    url: buildTipVideoUrl(tip),
  }))
  const lessons = selectCreatorMatchCoach(civ ?? null, null)
  const fromLessons: CoachCitation[] = [...lessons.forPlayer, ...lessons.sharedFundamentals]
    .filter((p) => p.lesson)
    .slice(0, 1)
    .map((p) => {
      const beat = p.lesson!.mechanics[0] ?? p.lesson!.builds[0]
      return {
        source: 'creator' as const,
        videoId: p.lesson!.id,
        timeSec: beat?.timeSec ?? 0,
        label: p.lesson!.title,
        url: p.catalogUrl,
      }
    })
  return [...fromTips, ...fromLessons].slice(0, limit + 1)
}

export function curatedCivNote(civ: string | null): BiText | null {
  if (!civ) return null
  const profile = CIV_PROFILES[civ]
  if (!profile) return null
  const exploit = profile.weaknesses[0] ?? profile.focus
  return bi(
    `${profile.name}: ${exploit}`,
    `${civLabelRu(civ)}: ${exploit}`,
  )
}

export function finding(partial: Omit<CoachFinding, 'confidence' | 'citations'> & {
  citations?: CoachCitation[]
}): CoachFinding {
  return {
    ...partial,
    confidence: coachConfidence(partial.evidenceCount),
    citations: partial.citations ?? [],
  }
}

export const SELF_SECTION_IDS = [
  'sample',
  'styleFingerprint',
  'strengths',
  'weaknesses',
  'buildConsistency',
  'typicalTimings',
  'economy',
  'idleProduction',
  'composition',
  'scouting',
  'raids',
  'mapControl',
  'relics',
  'sacredSites',
  'trade',
  'siege',
  'fights',
  'formatSplits',
  'topErrors',
  'topStrengths',
  'unusedOpportunities',
  'stopDoing',
  'startDoing',
  'bottleneck',
  'mostImportantChange',
  'trainingPlan',
  'progressMetrics',
  'decisionTree',
  'preMatchChecklist',
  'inGameChecklist',
] as const

export type SelfSectionId = (typeof SELF_SECTION_IDS)[number]

export const OPPONENT_SECTION_IDS = [
  'sample',
  'civPool',
  'styleFingerprint',
  'strengths',
  'weaknesses',
  'predictablePatterns',
  'opening',
  'economy',
  'raids',
  'mapControl',
  'relics',
  'trade',
  'formatSplits',
  'punishPlan',
  'decisionTree',
  'preMatchEnemyChecklist',
  'adaptationNote',
] as const

export const TEAM_SECTION_IDS = [
  'sample',
  'allyProfiles',
  'roleAssignment',
  'synergy',
  'focusTarget',
  'weakLink',
  'allyErrors',
  'teamErrors',
  'stopStartAllies',
  'civPoolPlan',
  'formatPlans',
  'teamDecisionTree',
  'allyTraining',
  'teamChecklist',
] as const

export { VIDEO_BASE_URLS }
