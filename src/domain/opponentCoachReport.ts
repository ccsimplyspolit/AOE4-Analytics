/**
 * Opponent-centric coaching: how they actually play, what to punish, decision tree.
 * Uses the opponent's games when available; never invents their feudal times.
 */

import { CIV_PROFILES, matchupTipForCiv } from '../data/civProfiles'
import type { ScoutMatchRow } from '../../electron/ipc/contract'
import type { StoredMatch } from '../store/historyStore'
import type { MatchSummary } from './statsSummary'
import {
  OPPONENT_SECTION_IDS,
  bi,
  citationsFor,
  coachConfidence,
  collectCoachGames,
  curatedCivNote,
  civLabelRu,
  durationBucket,
  finding,
  groupCount,
  insufficient,
  rate,
  type BiText,
  type ChecklistItem,
  type CoachConfidence,
  type CoachFinding,
  type CoachGame,
  type CoachSection,
} from './coachReportCommon'
import { buildSelfCoachReport, type DecisionBranch, type FormatSplit } from './selfCoachReport'

export interface OpponentCoachReport {
  kind: 'opponent'
  profileId: number
  playerName: string
  knownCiv: string | null
  gameCount: number
  overallConfidence: CoachConfidence
  sections: Record<(typeof OPPONENT_SECTION_IDS)[number], CoachSection<unknown>>
  civPool: { civ: string; games: number; winRate: number | null }[]
  predictablePatterns: CoachFinding[]
  punishPlan: BiText[]
  decisionTree: DecisionBranch[]
  preMatchEnemyChecklist: ChecklistItem[]
  strengths: CoachFinding[]
  weaknesses: CoachFinding[]
  formatSplits: FormatSplit[]
}

export interface OpponentCoachInput {
  profileId: number
  playerName: string
  /** Civ they locked this lobby, if any. */
  knownCiv?: string | null
  scoutGames?: ScoutMatchRow[]
  localMatches?: StoredMatch[]
  summariesByMatchId?: Record<string, MatchSummary | null | undefined>
}

function emptyOppSections() {
  const reason = bi('No opponent match sample.', 'Нет выборки матчей противника.')
  const out = {} as OpponentCoachReport['sections']
  for (const id of OPPONENT_SECTION_IDS) out[id] = { status: 'insufficient_data', reason }
  return out
}

function patternsFromGames(games: CoachGame[]): CoachFinding[] {
  const out: CoachFinding[] = []
  const short = games.filter((g) => durationBucket(g.durationSec) === 'short')
  const late = games.filter((g) => durationBucket(g.durationSec) === 'late')
  const civs = groupCount(games.map((g) => g.civ))
  const top = civs[0]
  if (top && top.count >= 3) {
    out.push(
      finding({
        id: 'civ-repeat',
        originalPoints: [2, 16],
        severity: 'important',
        title: bi(`Repeats ${top.key}`, `Часто берёт «${civLabelRu(top.key)}»`),
        why: bi(
          `${top.count}/${games.length} games on ${top.key} — plan the matchup, do not assume a random civ.`,
          `${top.count} из ${games.length} игр на цивилизации «${civLabelRu(top.key)}» — готовь матчап, не жди случайный пик.`,
        ),
        instead: bi(
          `Queue a counter or a comfortable mirror; scout their first military building on ${top.key}.`,
          `Бери контр или комфортное зеркало; разведай первое военное здание на «${civLabelRu(top.key)}».`,
        ),
        evidence: `${top.count} games on ${top.key}`,
        evidenceCount: top.count,
        citations: citationsFor(['build_order', 'military'], top.key),
      }),
    )
  }
  if (short.length >= games.length * 0.45 && short.length >= 3) {
    out.push(
      finding({
        id: 'early-closer',
        originalPoints: [3, 16, 29],
        severity: 'critical',
        title: bi('Closes or dies early', 'Закрывает или сыпется рано'),
        why: bi(
          `${short.length} games under 15 minutes — expect Feudal pressure. Duration is the proxy; no feudal timestamps invented.`,
          `${short.length} игр до 15 минут — жди давление во 2-й эпохе. Длительность здесь замена точного времени апа.`,
        ),
        instead: bi(
          'Do not greedy 2TC until you see their first military building. Have spears/horsemen ready.',
          'Не жадничай 2ТЦ пока не увидишь первое военное здание. Копья/конница должны быть готовы.',
        ),
        evidence: `${short.length}/${games.length} games < 15 min`,
        evidenceCount: short.length,
        citations: citationsFor(['military', 'macro']),
      }),
    )
  }
  if (late.length >= games.length * 0.4 && late.length >= 3) {
    out.push(
      finding({
        id: 'late-scaler',
        originalPoints: [6, 14, 16],
        severity: 'important',
        title: bi('Wants the long game', 'Хочет длинную игру'),
        why: bi(
          `${late.length} games last 28+ minutes — they are comfortable scaling. Deny relics/trade rather than all-ining a keep.`,
          `${late.length} игр дольше 28 минут — им комфортна поздняя экономика. Режь реликвии и торговлю, не иди олл-ином в донжон.`,
        ),
        instead: bi(
          'Take a Castle timing or relic lead before minute 20; do not sit and boom with them unless you are the better late civ.',
          'Замковый тайминг или лид по реликвиям до 20-й минуты; не набирай экономику вместе с ними, если ты не сильнее в лейте.',
        ),
        evidence: `${late.length}/${games.length} games > 28 min`,
        evidenceCount: late.length,
        citations: citationsFor(['map', 'macro']),
      }),
    )
  }
  return out
}

function punishFrom(games: CoachGame[], knownCiv: string | null): BiText[] {
  const plan: BiText[] = []
  const tip = matchupTipForCiv(knownCiv ?? games[0]?.civ ?? null)
  if (tip?.exploit) {
    plan.push(bi(`Exploit: ${tip.exploit}`, `Наказывай: ${tip.exploit}`))
  }
  if (tip?.watch) {
    plan.push(bi(`Watch first: ${tip.watch}`, `Сначала смотри: ${tip.watch}`))
  }
  const note = curatedCivNote(knownCiv ?? null)
  if (note && !tip) plan.push(note)
  const lateLoss = games.filter((g) => g.result === 'loss' && durationBucket(g.durationSec) === 'late')
  if (lateLoss.length >= 3) {
    plan.push(
      bi(
        `They drop ${lateLoss.length} long games — drag them past 25 minutes only if you are ahead on relics/map.`,
        `Они отдают ${lateLoss.length} длинных игр — тяни за 25 минут только с лидом по реликвиям/карте.`,
      ),
    )
  }
  const shortLoss = games.filter((g) => g.result === 'loss' && durationBucket(g.durationSec) === 'short')
  if (shortLoss.length >= 3) {
    plan.push(
      bi(
        `They bleed ${shortLoss.length} short games — a clean early army punishes them. Do not overextend into TC fire.`,
        `Они отдают ${shortLoss.length} коротких игр — чистая ранняя армия наказывает. Не заходи под ТЦ.`,
      ),
    )
  }
  if (plan.length === 0) {
    plan.push(
      bi(
        'Not enough opponent games for a punish plan beyond scouting their first military building.',
        'Мало игр противника для плана наказания — разведай первое военное здание.',
      ),
    )
  }
  return plan.slice(0, 6)
}

function enemyChecklist(games: CoachGame[], knownCiv: string | null, name: string): ChecklistItem[] {
  const top = groupCount(games.map((g) => g.civ))[0]
  const civ = knownCiv ?? top?.key ?? null
  const profile = civ ? CIV_PROFILES[civ] : undefined
  return [
    {
      id: 'civ',
      label: civ
        ? bi(`Expect ${civ}${top ? ` (${top.count} recent games)` : ''}.`, `Жди ${civ}${top ? ` (${top.count} недавних игр)` : ''}.`)
        : bi(`${name}: civ unknown — scout immediately.`, `${name}: цива неизвестна — сразу скауть.`),
    },
    {
      id: 'open',
      label: profile
        ? bi(`Opening threat: ${profile.watchFor[0] ?? profile.opening}`, `Угроза опенинга: ${profile.watchFor[0] ?? profile.opening}`)
        : bi('Opening: look for military building vs second TC by 5:00.', 'Опенинг: военное здание vs второй ТЦ к 5:00.'),
    },
    {
      id: 'deny',
      label: profile
        ? bi(`Deny: ${profile.weaknesses[0] ?? 'greedy woodlines'}`, `Deny: ${profile.weaknesses[0] ?? 'жадные линии дерева'}`)
        : bi('Deny the exposed gold if they leave it unguarded.', 'Режь открытое золото, если оно без охраны.'),
    },
    {
      id: 'not',
      label: bi(
        'Do not mirror their greed until you have seen army. Do not dive their TC.',
        'Не зеркаль жадность пока не увидел армию. Не дайвить их ТЦ.',
      ),
    },
    {
      id: 'adapt',
      label: bi(
        'If they deviate from the usual civ/timing, reset: scout again, do not play the prepared all-in.',
        'Если они отошли от обычной цивы/тайминга — скауть заново, не играй заготовленный олл-ин.',
      ),
    },
  ]
}

/** Opponent report from their public/local games plus optional lobby civ. */
export function buildOpponentCoachReport(input: OpponentCoachInput): OpponentCoachReport {
  const games = collectCoachGames({
    profileId: input.profileId,
    scoutGames: input.scoutGames,
    localMatches: input.localMatches,
    summariesByMatchId: input.summariesByMatchId,
  })
  const knownCiv = input.knownCiv ?? null
  const sections = emptyOppSections()
  const self = buildSelfCoachReport({
    profileId: input.profileId,
    playerName: input.playerName,
    voice: 'third',
    scoutGames: input.scoutGames,
    localMatches: input.localMatches,
    summariesByMatchId: input.summariesByMatchId,
  })

  const civPool =
    self.styleFingerprint.status === 'ok'
      ? self.styleFingerprint.data.civPool.map((c) => ({ civ: c.civ, games: c.games, winRate: c.winRate }))
      : []
  const predictable = patternsFromGames(games)
  const punishPlan = punishFrom(games, knownCiv)
  const checklist = enemyChecklist(games, knownCiv, input.playerName)
  const strengths = self.topStrengths
  const weaknesses = self.topErrors
  const formatSplits = self.formatSplits.status === 'ok' ? self.formatSplits.data : []

  const ok = (id: (typeof OPPONENT_SECTION_IDS)[number], n: number, data: unknown) => {
    sections[id] = { status: 'ok', confidence: coachConfidence(Math.max(n, 1)), data }
  }

  if (games.length === 0 && !knownCiv) {
    return {
      kind: 'opponent',
      profileId: input.profileId,
      playerName: input.playerName,
      knownCiv,
      gameCount: 0,
      overallConfidence: 'single',
      sections,
      civPool: [],
      predictablePatterns: [],
      punishPlan: [
        bi(
          'Insufficient opponent history. Scout gold and the first military building; do not assume a build.',
          'Нет истории противника. Разведай золото и первое военное здание; не предполагай билд.',
        ),
      ],
      decisionTree: self.decisionTree,
      preMatchEnemyChecklist: checklist,
      strengths: [],
      weaknesses: [],
      formatSplits: [],
    }
  }

  ok('sample', Math.max(games.length, 1), { games: games.length, knownCiv })
  if (civPool.length || knownCiv) {
    ok('civPool', civPool[0]?.games ?? 1, { civPool, knownCiv, curated: curatedCivNote(knownCiv) })
  }
  if (self.styleFingerprint.status === 'ok') ok('styleFingerprint', games.length, self.styleFingerprint.data)
  if (strengths.length) ok('strengths', strengths[0]!.evidenceCount, strengths)
  if (weaknesses.length) ok('weaknesses', weaknesses[0]!.evidenceCount, weaknesses)
  if (predictable.length) ok('predictablePatterns', predictable[0]!.evidenceCount, predictable)
  else sections.predictablePatterns = insufficient('Need more games to call a pattern.', 'Нужно больше игр, чтобы назвать паттерн.')

  sections.opening = knownCiv
    ? {
        status: 'ok',
        confidence: games.length >= 5 ? 'probable' : 'single',
        data: {
          civ: knownCiv,
          note: bi(
            'Curated civ opening only — not a detected build order from this opponent.',
            'Только курсированный опенинг цивы — не детект билда этого игрока.',
          ),
          profile: CIV_PROFILES[knownCiv]?.opening ?? null,
        },
      }
    : insufficient('No civ lock and no history to infer an opening.', 'Нет лока цивы и истории для опенинга.')

  sections.economy = self.sections.economy
  sections.raids = self.sections.raids
  sections.mapControl = self.sections.mapControl
  sections.relics = self.sections.relics
  sections.trade = self.sections.trade
  if (formatSplits.some((s) => s.games > 0)) ok('formatSplits', games.length, formatSplits)
  ok('punishPlan', Math.max(games.length, 1), punishPlan)
  ok('decisionTree', Math.max(games.length, 1), self.decisionTree)
  ok('preMatchEnemyChecklist', Math.max(games.length, 1), checklist)
  ok(
    'adaptationNote',
    1,
    bi(
      'If they pick an off-civ or the game is already 20 minutes, throw the prepared all-in — scout again.',
      'Если они взяли другую циву или игре уже 20 минут — выкинь заготовленный олл-ин, скауть заново.',
    ),
  )

  return {
    kind: 'opponent',
    profileId: input.profileId,
    playerName: input.playerName,
    knownCiv,
    gameCount: games.length,
    overallConfidence: coachConfidence(games.length || 1),
    sections,
    civPool,
    predictablePatterns: predictable,
    punishPlan,
    decisionTree: self.decisionTree,
    preMatchEnemyChecklist: checklist,
    strengths,
    weaknesses,
    formatSplits,
  }
}
