/**
 * Subject-player coaching report covering the original ~70 self/ally training
 * points in compact structured sections. Evidence-only: no invented timings.
 */

import {
  SELF_SECTION_IDS,
  avg,
  bi,
  citationsFor,
  coachConfidence,
  collectCoachGames,
  durationBucket,
  finding,
  gamesWith,
  groupCount,
  hasToken,
  insufficient,
  rate,
  biVoice,
  civLabelRu,
  mapLabelRu,
  type BiText,
  type ChecklistItem,
  type CoachConfidence,
  type CoachFinding,
  type CoachGame,
  type CoachSection,
  type CoachVoice,
  type FormatLane,
  type SelfSectionId,
} from './coachReportCommon'
import type { ScoutMatchRow } from '../../electron/ipc/contract'
import type { StoredMatch } from '../store/historyStore'
import { civDisplayName } from './civ'
import type { MatchSummary } from './statsSummary'

export interface FormatSplit {
  lane: FormatLane
  games: number
  wins: number
  losses: number
  winRate: number | null
  note: BiText
}

export interface DecisionBranch {
  ifId: '2tc' | 'fc' | 'rush' | 'trade' | 'mass_cav' | 'mass_ranged' | 'mass_inf' | 'siege' | 'turtle'
  status: 'ok' | 'insufficient_data'
  ifLabel: BiText
  then: BiText
  reason?: BiText
}

export interface TimingProxy {
  bucket: 'short' | 'mid' | 'late'
  games: number
  wins: number
  losses: number
  winRate: number | null
  meanDurationSec: number | null
}

export interface SelfCoachReport {
  kind: 'self'
  profileId: number
  playerName: string
  voice: CoachVoice
  gameCount: number
  decided: number
  winRate: number | null
  overallConfidence: CoachConfidence
  sections: Record<SelfSectionId, CoachSection<unknown>>
  styleFingerprint: CoachSection<{
    tag: BiText
    rationale: BiText
    civPool: { civ: string; games: number; winRate: number | null }[]
  }>
  strengths: CoachSection<CoachFinding[]>
  weaknesses: CoachSection<CoachFinding[]>
  formatSplits: CoachSection<FormatSplit[]>
  topErrors: CoachFinding[]
  topStrengths: CoachFinding[]
  bottleneck: CoachFinding | null
  mostImportantChange: BiText
  preMatchChecklist: ChecklistItem[]
  inGameChecklist: ChecklistItem[]
  decisionTree: DecisionBranch[]
}

export interface SelfCoachInput {
  profileId: number
  playerName: string
  voice?: CoachVoice
  scoutGames?: ScoutMatchRow[]
  localMatches?: StoredMatch[]
  summariesByMatchId?: Record<string, MatchSummary | null | undefined>
  /** Civ locked in the current or reviewed match. Takes priority over historical mains. */
  currentCiv?: string | null
  /** True when the checklist is for a match that already started (or a specific replay). */
  inMatch?: boolean
}

function emptySections(): Record<SelfSectionId, CoachSection<unknown>> {
  const reason = bi('No match sample for this player.', 'Нет выборки матчей по этому игроку.')
  const out = {} as Record<SelfSectionId, CoachSection<unknown>>
  for (const id of SELF_SECTION_IDS) {
    out[id] = { status: 'insufficient_data', reason }
  }
  return out
}

function civStats(games: CoachGame[]) {
  const map = new Map<string, { games: number; wins: number; losses: number }>()
  for (const g of games) {
    const row = map.get(g.civ) ?? { games: 0, wins: 0, losses: 0 }
    row.games++
    if (g.result === 'win') row.wins++
    if (g.result === 'loss') row.losses++
    map.set(g.civ, row)
  }
  return [...map.entries()]
    .map(([civ, row]) => ({
      civ,
      games: row.games,
      wins: row.wins,
      losses: row.losses,
      winRate: rate(row.wins, row.wins + row.losses),
    }))
    .sort((a, b) => b.games - a.games)
}

function styleFromGames(games: CoachGame[], voice: CoachVoice, name: string) {
  const short = games.filter((g) => durationBucket(g.durationSec) === 'short')
  const late = games.filter((g) => durationBucket(g.durationSec) === 'late')
  const shortWins = short.filter((g) => g.result === 'win').length
  const lateWins = late.filter((g) => g.result === 'win').length
  const top = civStats(games)[0]
  let tag = bi('Flexible / mixed timings', 'Смешанный темп — нет одной любимой длительности')
  let rationale = biVoice(
    voice,
    name,
    {
      en: 'You do not have a single duration cluster that dominates the sample.',
      ru: 'Нет одного доминирующего кластера по длительности — игры размазаны по разным таймингам.',
    },
    {
      en: '{name} does not have a single duration cluster that dominates the sample.',
      ru: 'У {name} нет одного доминирующего кластера по длительности — игры размазаны по разным таймингам.',
    },
  )
  if (short.length >= games.length * 0.45 && shortWins >= lateWins) {
    tag = bi('Early pressure / tempo', 'Раннее давление')
    rationale = bi(
      `${short.length}/${games.length} games end before 15 minutes — the sample plays for Feudal/Castle timings, not a long boom.`,
      `${short.length} из ${games.length} игр заканчиваются до 15 минут — ставка на ранний тайминг, а не на долгий набор экономики.`,
    )
  } else if (late.length >= games.length * 0.4) {
    tag = bi('Late scaling / boom', 'Поздняя игра / набор экономики')
    rationale = bi(
      `${late.length}/${games.length} games last 28+ minutes — the sample reaches late fights more often than a rush close.`,
      `${late.length} из ${games.length} игр длятся 28+ минут — чаще доходите до поздней стадии, чем закрываете рашем.`,
    )
  } else if (games.filter((g) => durationBucket(g.durationSec) === 'mid').length >= games.length * 0.4) {
    tag = bi('Castle-timing specialist', 'Специалист по замковому таймингу')
    rationale = bi(
      'Most decided games land in the 15–28 minute window — a Castle-age fight pattern.',
      'Большинство игр укладывается в 15–28 минут — типичный бой замковой эпохи.',
    )
  }
  if (top) {
    const civEn = civDisplayName(top.civ)
    const civRu = civLabelRu(top.civ)
    rationale = bi(
      `${rationale.text} Most-played civ: ${civEn} (${top.games} games${top.winRate != null ? `, ${top.winRate}%` : ''}).`,
      `${rationale.textRu} Основная цивилизация: ${civRu} (${top.games} игр${top.winRate != null ? `, ${top.winRate}%` : ''}).`,
    )
  }
  return { tag, rationale, civPool: civStats(games).slice(0, 5) }
}

function buildFindings(games: CoachGame[], voice: CoachVoice, name: string): {
  strengths: CoachFinding[]
  weaknesses: CoachFinding[]
} {
  const strengths: CoachFinding[] = []
  const weaknesses: CoachFinding[] = []
  const decided = games.filter((g) => g.result === 'win' || g.result === 'loss')
  const wins = decided.filter((g) => g.result === 'win')
  const losses = decided.filter((g) => g.result === 'loss')
  const shortLoss = losses.filter((g) => durationBucket(g.durationSec) === 'short')
  const lateLoss = losses.filter((g) => durationBucket(g.durationSec) === 'late')
  const shortWin = wins.filter((g) => durationBucket(g.durationSec) === 'short')
  const lateWin = wins.filter((g) => durationBucket(g.durationSec) === 'late')
  const civs = civStats(games)
  const topCiv = civs[0]
  const weakCiv = [...civs].reverse().find((c) => c.games >= 3 && (c.winRate ?? 100) < 45)
  const mapWins = new Map<string, { games: number; wins: number }>()
  for (const g of games) {
    if (!g.map) continue
    const row = mapWins.get(g.map) ?? { games: 0, wins: 0 }
    row.games++
    if (g.result === 'win') row.wins++
    mapWins.set(g.map, row)
  }
  const bestMap = [...mapWins.entries()]
    .map(([map, row]) => ({ map, ...row, wr: rate(row.wins, row.games) }))
    .filter((r) => r.games >= 3 && (r.wr ?? 0) >= 55)
    .sort((a, b) => (b.wr ?? 0) - (a.wr ?? 0))[0]
  const worstMap = [...mapWins.entries()]
    .map(([map, row]) => ({ map, ...row, wr: rate(row.wins, row.games) }))
    .filter((r) => r.games >= 3 && (r.wr ?? 100) < 45)
    .sort((a, b) => (a.wr ?? 100) - (b.wr ?? 100))[0]

  if (topCiv && topCiv.games >= 3 && (topCiv.winRate ?? 0) >= 55) {
    strengths.push(
      finding({
        id: 'best-civ',
        originalPoints: [3, 60],
        severity: 'important',
        title: bi(`${civDisplayName(topCiv.civ)} is the reliable civ`, `${civLabelRu(topCiv.civ)} — стабильная цивилизация`),
        why: bi(`Most games and a winning sample are on ${civDisplayName(topCiv.civ)}.`, `Больше всего игр и победная выборка на цивилизации «${civLabelRu(topCiv.civ)}».`),
        instead: bi(
          `Queue ${civDisplayName(topCiv.civ)} first unless the map or teammate role forbids it.`,
          `Бери «${civLabelRu(topCiv.civ)}» первым, если карта или роль союзника не мешают.`,
        ),
        evidence: `${topCiv.games} games · ${topCiv.wins}–${topCiv.losses} · ${topCiv.winRate ?? 'n/a'}%`,
        evidenceCount: topCiv.games,
        citations: citationsFor(['build_order', 'macro'], topCiv.civ),
      }),
    )
  }

  if (shortWin.length >= 4) {
    strengths.push(
      finding({
        id: 'early-closings',
        originalPoints: [3, 27, 46],
        severity: 'important',
        title: bi('Wins more often before 15 minutes', 'Чаще победы до 15 минут'),
        why: bi('Short wins usually mean the first army timing actually lands.', 'Короткие победы обычно значат, что первый армейский тайминг реально доходит.'),
        instead: bi(
          'Keep the first production building continuous; do not bank resources during that window.',
          'Не останавливай первое военное здание и не копи ресурсы в этом окне.',
        ),
        evidence: `${shortWin.length} wins under 15 minutes in ${games.length} games`,
        evidenceCount: shortWin.length,
        citations: citationsFor(['military', 'macro']),
      }),
    )
  }

  if (lateWin.length >= 4 && lateWin.length > lateLoss.length) {
    strengths.push(
      finding({
        id: 'late-closings',
        originalPoints: [3, 27],
        severity: 'minor',
        title: bi('Converts long games', 'Дожимает длинные игры'),
        why: bi(
          'Wins that last 28+ minutes imply relics/trade/siege were not auto-conceded.',
          'Победы дольше 28 минут значат, что реликвии, торговля и осада не отдаются просто так.',
        ),
        instead: bi(
          'Keep taking the same late objectives (relics, then siege) instead of improvising a new win condition.',
          'Продолжай брать те же поздние цели (реликвии, затем осада).',
        ),
        evidence: `${lateWin.length} wins over 28 minutes vs ${lateLoss.length} such losses`,
        evidenceCount: lateWin.length,
        citations: citationsFor(['map', 'macro']),
      }),
    )
  }

  if (bestMap) {
    strengths.push(
      finding({
        id: 'best-map',
        originalPoints: [3, 19],
        severity: 'minor',
        title: bi(`Stronger on ${bestMap.map}`, `Сильнее на карте «${mapLabelRu(bestMap.map)}»`),
        why: bi('Map sample is small-to-medium; treat as a preference, not a guarantee.', 'Выборка по карте небольшая — это предпочтение, а не гарантия.'),
        instead: bi(`On ${bestMap.map}, play the usual opening instead of a new build.`, `На «${mapLabelRu(bestMap.map)}» играй привычный опенинг, а не новый билд.`),
        evidence: `${bestMap.games} games · ${bestMap.wr}%`,
        evidenceCount: bestMap.games,
      }),
    )
  }

  const apmVals = games.map((g) => g.apm).filter((n): n is number => n != null && n > 0)
  const meanApm = avg(apmVals)
  if (meanApm != null && meanApm >= 80 && apmVals.length >= 3) {
    strengths.push(
      finding({
        id: 'apm-floor',
        originalPoints: [13, 14],
        severity: 'minor',
        title: bi('Command rate is not the limiter', 'APM не является узким местом'),
        why: bi(`Average APM ${meanApm} across ${apmVals.length} games with Relic counters.`, `Средний APM ${meanApm} по ${apmVals.length} играм со счётчиками Relic.`),
        instead: bi(
          'Spend the next games on decision quality (when to fight), not clicking faster.',
          'В следующих играх работай над решениями (когда драться), а не над скоростью кликов.',
        ),
        evidence: `mean APM ${meanApm} · n=${apmVals.length}`,
        evidenceCount: apmVals.length,
        citations: citationsFor(['micro']),
      }),
    )
  }

  if (shortLoss.length >= 4) {
    weaknesses.push(
      finding({
        id: 'early-losses',
        originalPoints: [4, 5, 10, 45, 51],
        severity: 'critical',
        title: bi('Too many losses before 15 minutes', 'Слишком много поражений до 15 минут'),
        why: bi(
          'A short loss is usually a broken opening: idle TC, no army, or a fight without scouting — duration is the proxy because feudal time is not in this sample.',
          'Короткий проигрыш обычно ломаный опенинг: простой ТЦ, нет армии или бой без разведки. Длительность здесь — замена, потому что точного времени 2-й эпохи в выборке нет.',
        ),
        instead: bi(
          'Before queue: scout gold by the first military building, keep TC queued, do not take a Dark/Feudal fight until production is running.',
          'Перед очередью: разведай золото к первому военному зданию, держи очередь ТЦ, не принимай ранний бой, пока производство не идёт.',
        ),
        evidence: `${shortLoss.length} losses under 15 minutes`,
        evidenceCount: shortLoss.length,
        citations: citationsFor(['build_order', 'macro']),
      }),
    )
  }

  if (lateLoss.length >= 4) {
    weaknesses.push(
      finding({
        id: 'late-macro',
        originalPoints: [4, 9, 14, 16, 45, 50],
        severity: 'critical',
        title: bi('Long games are leaking', 'Длинные игры сыплются'),
        why: biVoice(
          voice,
          name,
          {
            en: 'You lose games that reach 28+ minutes. That pattern is a mid/late macro problem (relics, trade, siege, villager production through the fight), not an opening fail. Age-up seconds are not assumed.',
            ru: 'Игры дольше 28 минут часто проигрываются. Это позднее макро (реликвии, торговля, осада, крестьяне во время боя), а не сломанный опенинг. Тайминги эпох не выдумываются.',
          },
          {
            en: '{name} loses games that reach 28+ minutes. That pattern is a mid/late macro problem (relics, trade, siege, villager production through the fight), not an opening fail. Age-up seconds are not assumed.',
            ru: '{name} часто проигрывает игры дольше 28 минут. Это позднее макро (реликвии, торговля, осада, крестьяне во время боя), а не сломанный опенинг. Тайминги эпох не выдумываются.',
          },
        ),
        instead: bi(
          'From the first Castle fight: keep TC queued, add a siege workshop before the third engagement, and contest relics if a monastery exists in the build.',
          'С первого замкового боя: очередь в ТЦ, мастерская осады до третьего боя, спор реликвий, если в билде есть монастырь.',
        ),
        evidence: `${lateLoss.length} losses over 28 minutes (of ${losses.length} losses)`,
        evidenceCount: lateLoss.length,
        citations: citationsFor(['macro', 'economic']),
      }),
    )
  }

  if (weakCiv) {
    weaknesses.push(
      finding({
        id: 'weak-civ',
        originalPoints: [4, 60],
        severity: 'important',
        title: bi(`${civDisplayName(weakCiv.civ)} is leaking games`, `${civLabelRu(weakCiv.civ)} сливает игры`),
        why: bi('A civ with a losing sample is a pool problem, not one-game variance.', 'Цивилизация с проигрышной выборкой — проблема пула, а не дисперсия одной игры.'),
        instead: bi(
          `Bench ${civDisplayName(weakCiv.civ)} until the next 5 games on the main civ are stable.`,
          `Убери «${civLabelRu(weakCiv.civ)}», пока следующие 5 игр на основной цивилизации не стабилизируются.`,
        ),
        evidence: `${weakCiv.games} games · ${weakCiv.wins}–${weakCiv.losses} · ${weakCiv.winRate}%`,
        evidenceCount: weakCiv.games,
        citations: citationsFor(['build_order'], weakCiv.civ),
      }),
    )
  }

  if (worstMap) {
    weaknesses.push(
      finding({
        id: 'weak-map',
        originalPoints: [4, 19],
        severity: 'minor',
        title: bi(`Weaker on ${worstMap.map}`, `Слабее на карте «${mapLabelRu(worstMap.map)}»`),
        why: bi('Map-specific losses often come from the same opening on a layout that punishes it.', 'Проигрыши на карте часто от того же опенинга на раскладке, которая его наказывает.'),
        instead: bi(
          `On ${worstMap.map}, scout the contested resource first and delay greedy 2TC if the opponent is already on military.`,
          `На «${mapLabelRu(worstMap.map)}» сначала разведай спорный ресурс и отложи жадный 2 ТЦ, если враг уже в армии.`,
        ),
        evidence: `${worstMap.games} games · ${worstMap.wr}%`,
        evidenceCount: worstMap.games,
      }),
    )
  }

  const teamGames = games.filter((g) => g.formatLane === '2v2' || g.formatLane === '3v3' || g.formatLane === '4v4')
  const teamDecided = teamGames.filter((g) => g.result === 'win' || g.result === 'loss')
  const teamWins = teamDecided.filter((g) => g.result === 'win').length
  const teamWr = rate(teamWins, teamDecided.length)
  if (teamDecided.length >= 5 && (teamWr ?? 50) < 45) {
    weaknesses.push(
      finding({
        id: 'team-leak',
        originalPoints: [31, 32, 44],
        severity: 'important',
        title: bi('Team-game sample is below break-even', 'Командные игры ниже 50%'),
        why: bi(
          'Do not treat this as “allies threw”. The subject still chooses fights, civ, and whether to wait. Fighting 1v2 is the usual subject-side error.',
          'Не списывай на союзников. Ты всё равно выбираешь бой, цивилизацию и момент атаки. Типичная ошибка — драться 1 на 2.',
        ),
        instead: bi(
          'Ping before engaging. If an ally is more than 20 seconds away, raid instead of taking the fight.',
          'Пингуй перед боем. Если союзник дальше 20 секунд — рейдь, а не принимай бой.',
        ),
        evidence: `${teamDecided.length} team games · ${teamWr}%`,
        evidenceCount: teamDecided.length,
      }),
    )
  }

  const lowProd = games.filter(
    (g) => g.result === 'loss' && g.unitsProduced != null && g.unitsProduced < 20 && (g.durationSec ?? 0) > 12 * 60,
  )
  if (lowProd.length >= 3) {
    weaknesses.push(
      finding({
        id: 'low-production',
        originalPoints: [11, 12, 14],
        severity: 'important',
        title: bi('Military production stalls in losses', 'Военное производство стопорится в поражениях'),
        why: bi(
          `${lowProd.length} losses last 12+ minutes with under 20 units produced (Relic counters).`,
          `${lowProd.length} поражений 12+ минут при <20 произведённых юнитах (счётчики Relic).`,
        ),
        instead: bi(
          'One extra production building before the next age-up click; never sit on a bank during a fight.',
          'Одно лишнее военное здание до клика в эпоху; не сиди на банке во время боя.',
        ),
        evidence: `${lowProd.length} losses with unitsProduced < 20`,
        evidenceCount: lowProd.length,
        citations: citationsFor(['military', 'macro']),
      }),
    )
  }

  const villagerLossHeavy = games.filter((g) => g.villagersLost != null && g.villagersLost >= 8 && g.result === 'loss')
  if (villagerLossHeavy.length >= 2) {
    weaknesses.push(
      finding({
        id: 'raid-defense',
        originalPoints: [18, 17],
        severity: 'important',
        title: bi('Villager losses show up in defeats', 'Потери крестьян в поражениях'),
        why: bi(
          `${villagerLossHeavy.length} losses with 8+ villagers lost in the summary casualty list.`,
          `${villagerLossHeavy.length} поражений с 8+ потерянными крестьянами в сводке.`,
        ),
        instead: bi(
          'Park 2–3 spears or a tower on the exposed gold before sending the army out.',
          'Оставь 2–3 копейщика или башню на открытом золоте, прежде чем уводить армию.',
        ),
        evidence: `${villagerLossHeavy.length} losses with villagersLost ≥ 8`,
        evidenceCount: villagerLossHeavy.length,
        citations: citationsFor(['military', 'micro']),
      }),
    )
  }

  const feudalSample = games.filter((g) => g.age2Sec != null && g.age2Sec > 0)
  const meanFeudal = avg(feudalSample.map((g) => g.age2Sec!))
  /** Beastyqt macro: do not let Feudal slide past ~4:30 on a standard opening. */
  const FEUDAL_BENCH_SEC = 270
  if (feudalSample.length >= 3 && meanFeudal != null && meanFeudal > FEUDAL_BENCH_SEC) {
    weaknesses.push(
      finding({
        id: 'feudal-late',
        originalPoints: [5, 16, 49],
        severity: 'critical',
        title: bi(
          `Feudal usually lands at ${fmtClock(meanFeudal)}, later than the ~4:30 benchmark`,
          `2-я эпоха обычно в ${fmtClock(meanFeudal)} — позже ориентира ~4:30`,
        ),
        why: biVoice(
          voice,
          name,
          {
            en: `You usually click Feudal at ${fmtClock(meanFeudal)} across ${feudalSample.length} decoded summaries. The extra idle before Age 2 is lost villager production, not “bad luck on one game”.`,
            ru: `Обычно выход во 2-ю эпоху в ${fmtClock(meanFeudal)} (по ${feudalSample.length} сводкам). Лишние секунды до апа — потерянные крестьяне, а не «невезение одной игры».`,
          },
          {
            en: `{name} usually clicks Feudal at ${fmtClock(meanFeudal)} across ${feudalSample.length} decoded summaries. The extra idle before Age 2 is lost villager production, not “bad luck on one game”.`,
            ru: `{name} обычно выходит во 2-ю эпоху в ${fmtClock(meanFeudal)} (по ${feudalSample.length} сводкам). Лишние секунды до апа — потерянные крестьяне, а не «невезение одной игры».`,
          },
        ),
        instead: bi(
          `Next games: click Feudal by 4:30 with TC still queued and the first military building started. Track the clock at 4:00 — if Landmark is not down, drop the greedy gather and send 3 more to gold/wood.`,
          `В следующих играх: 2-я эпоха к 4:30, очередь в ТЦ жива, первое военное здание уже заложено. В 4:00, если ориентир ещё не стоит — снимай жадность и кидай ещё 3 крестьян на золото или дерево.`,
        ),
        evidence: `${feudalSample.length} summaries · mean Feudal ${fmtClock(meanFeudal)} (bench 4:30)`,
        evidenceCount: feudalSample.length,
        citations: citationsFor(['build_order', 'macro']),
      }),
    )
  }

  return { strengths, weaknesses }
}

function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatSplits(games: CoachGame[]): FormatSplit[] {
  const lanes: FormatLane[] = ['1v1', '2v2', '3v3', '4v4']
  return lanes.map((lane) => {
    const rows = games.filter((g) => g.formatLane === lane)
    const wins = rows.filter((g) => g.result === 'win').length
    const losses = rows.filter((g) => g.result === 'loss').length
    const wr = rate(wins, wins + losses)
    let note = bi('No games in this format.', 'Нет игр в этом формате.')
    if (rows.length > 0) {
      note = bi(
        wr == null
          ? `${rows.length} games, no decided results.`
          : `${rows.length} games, ${wr}% win rate. Do not copy 1v1 habits into team fights or vice versa.`,
        wr == null
          ? `${rows.length} игр, нет решённых результатов.`
          : `${rows.length} игр, ${wr}% побед. Не копируй привычки 1v1 в командные бои и наоборот.`,
      )
    }
    return { lane, games: rows.length, wins, losses, winRate: wr, note }
  })
}

function timingProxies(games: CoachGame[]): TimingProxy[] {
  const buckets = ['short', 'mid', 'late'] as const
  return buckets.map((bucket) => {
    const rows = games.filter((g) => durationBucket(g.durationSec) === bucket)
    const wins = rows.filter((g) => g.result === 'win').length
    const losses = rows.filter((g) => g.result === 'loss').length
    const durs = rows.map((g) => g.durationSec).filter((n): n is number => n != null)
    return {
      bucket,
      games: rows.length,
      wins,
      losses,
      winRate: rate(wins, wins + losses),
      meanDurationSec: avg(durs),
    }
  })
}

function optionalSignalSection(
  games: CoachGame[],
  pred: (g: CoachGame) => boolean,
  okData: (rows: CoachGame[]) => unknown,
  missingEn: string,
  missingRu: string,
): CoachSection<unknown> {
  const rows = games.filter(pred)
  if (rows.length === 0) return insufficient(missingEn, missingRu)
  return { status: 'ok', confidence: coachConfidence(rows.length), data: okData(rows) }
}

function decisionTree(games: CoachGame[]): DecisionBranch[] {
  const tokens = games.flatMap((g) => g.buildTokens)
  const hasBo = tokens.length > 0
  const shortLoss = games.filter((g) => g.result === 'loss' && durationBucket(g.durationSec) === 'short').length
  const lateLoss = games.filter((g) => g.result === 'loss' && durationBucket(g.durationSec) === 'late').length
  const mk = (
    ifId: DecisionBranch['ifId'],
    ifLabel: BiText,
    then: BiText,
    ok: boolean,
    reason?: BiText,
  ): DecisionBranch =>
    ok
      ? { ifId, status: 'ok', ifLabel, then }
      : {
          ifId,
          status: 'insufficient_data',
          ifLabel,
          then,
          reason:
            reason ??
            bi('No build-order or duration evidence for this branch.', 'Нет билда или длительности для этой ветки.'),
        }

  return [
    mk(
      '2tc',
      bi('If they 2TC', 'Если враг 2ТЦ'),
      bi(
        'Take a military timing before their second TC pays off; do not mirror boom unless you already have map control.',
        'Бей армией до окупаемости второго ТЦ; не зеркаль бум без контроля карты.',
      ),
      hasBo && hasToken(tokens, 'town center', 'town_center', 'tc_'),
    ),
    mk(
      'fc',
      bi('If they Fast Castle', 'Если враг идёт в быстрый замок'),
      bi(
        'Stay on Feudal army and deny gold; do not race Castle unless your eco is already ahead in the summary.',
        'Оставайся на армии 2-й эпохи и режь золото; не гонись в замок без преимущества в экономике.',
      ),
      hasBo && games.some((g) => g.age3Sec != null && g.age3Sec > 0 && g.age3Sec < 11 * 60),
      games.some((g) => g.age3Sec != null)
        ? undefined
        : bi('No Castle age-up timestamps in this sample.', 'В выборке нет меток выхода в замковую эпоху.'),
    ),
    mk(
      'rush',
      bi('If they rush', 'Если ранний раш'),
      bi(
        'Keep TC queued, place the first military building, and do not leave villagers on a greedy woodline.',
        'Очередь ТЦ, первое военное здание, не оставляй крестьян на жадной древесине.',
      ),
      shortLoss >= 3,
      shortLoss >= 3
        ? undefined
        : bi('Not enough short losses to confirm a rush-punish pattern.', 'Мало коротких поражений, чтобы подтвердить раш-паттерн.'),
    ),
    mk(
      'trade',
      bi('If they trade', 'Если торговля'),
      bi('Assign one mobile group to the trade line; do not send the whole army.', 'Один мобильный отряд на торговую линию; не отправляй всю армию.'),
      hasBo && hasToken(tokens, 'market', 'trader', 'trade'),
      bi('No market/trader tokens in recorded build orders.', 'В билдах нет рынка и торговцев.'),
    ),
    mk(
      'mass_cav',
      bi('If mass cavalry', 'Если масса кавалерии'),
      bi('Spears/maa in front, production already running before the fight.', 'Копья/латники впереди, производство уже идёт до боя.'),
      hasBo && hasToken(tokens, 'knight', 'horseman', 'lancer', 'cavalry'),
    ),
    mk(
      'mass_ranged',
      bi('If mass ranged', 'Если масса стрелков'),
      bi(
        'Do not walk melee across open ground; surround or add your own ranged plus a meat wall.',
        'Не ходи мили по открытому полю: окружай или добавь своих стрелков и мясо впереди.',
      ),
      hasBo && hasToken(tokens, 'archer', 'crossbow', 'handcannoneer', 'longbow'),
    ),
    mk(
      'mass_inf',
      bi('If mass infantry', 'Если масса пехоты'),
      bi('Kite with ranged or flank with cavalry; do not front-a-ball of maa.', 'Кайть стрелками или заходи с фланга конницей; не бей в лоб комок латников.'),
      hasBo && hasToken(tokens, 'man-at-arms', 'spearman', 'maa', 'manatarms'),
    ),
    mk(
      'siege',
      bi('If siege', 'Если осада'),
      bi(
        'Never take a third fight into rams/springalds without your own siege or a surround.',
        'Не принимай третий бой в тараны/спрингальды без своей осады или окружения.',
      ),
      hasBo && hasToken(tokens, 'ram', 'springald', 'trebuchet', 'cannon', 'bombard', 'siege'),
    ),
    mk(
      'turtle',
      bi('If they turtle', 'Если черепаха'),
      bi(
        'Take relics and map; do not dive keeps. Long-loss pattern in this sample supports patience over all-in.',
        'Бери реликвии и карту; не дайвь в донжоны.',
      ),
      lateLoss >= 3,
    ),
  ]
}

function civChecklistItem(
  games: CoachGame[],
  currentCiv?: string | null,
  inMatch?: boolean,
): ChecklistItem {
  const locked = currentCiv?.trim() || null
  if (locked) {
    return {
      id: 'civ',
      label: bi(
        `This match: ${civDisplayName(locked)}.`,
        `Сейчас: ${civLabelRu(locked)}.`,
      ),
    }
  }
  if (inMatch) {
    return {
      id: 'civ',
      label: bi(
        'Civilization is already locked — play the civ you queued this match.',
        'Цивилизация уже выбрана — играй ту, которую взял в этом матче.',
      ),
    }
  }
  const topCiv = civStats(games)[0]
  return {
    id: 'civ',
    label: topCiv
      ? bi(
          `Civ: ${civDisplayName(topCiv.civ)} unless the teammate already locked it.`,
          `Цивилизация: ${civLabelRu(topCiv.civ)}, если союзник её ещё не занял.`,
        )
      : bi('Civ: pick the pool civ you have the most games on.', 'Цивилизация: та, на которой больше всего игр.'),
  }
}

function checklists(
  games: CoachGame[],
  bottleneck: CoachFinding | null,
  voice: CoachVoice,
  name: string,
  currentCiv?: string | null,
  inMatch?: boolean,
): { pre: ChecklistItem[]; ingame: ChecklistItem[] } {
  const shortLoss = games.filter((g) => g.result === 'loss' && durationBucket(g.durationSec) === 'short').length
  const pre: ChecklistItem[] = [
    {
      id: 'role',
      label: bi(
        `Role: ${shortLoss >= 4 ? 'survive the first 8 minutes, then take a timing' : 'play the usual opening on the main civ'}.`,
        `Роль: ${shortLoss >= 4 ? 'пережить первые 8 минут, затем тайминг' : 'обычный опенинг на основной циве'}.`,
      ),
    },
    civChecklistItem(games, currentCiv, inMatch),
    {
      id: 'priority',
      label: bottleneck
        ? bi(`First priority: ${bottleneck.instead.text}`, `Первый приоритет: ${bottleneck.instead.textRu}`)
        : bi('First priority: Town Center never idle, first army before minute 6.', 'Первый приоритет: ТЦ не простаивает, первая армия до 6-й минуты.'),
    },
    {
      id: 'scout',
      label: bi(
        'Scout: opponent gold, first military building, 2TC vs Fast Castle.',
        'Разведка: золото врага, первое военное здание, 2 ТЦ или быстрый замок.',
      ),
    },
    {
      id: 'timing',
      label: bi(
        'First timing: army out before you click the next age unless the scout shows a full boom.',
        'Первый тайминг: армия до клика в эпоху, если разведка не показывает полный бум.',
      ),
    },
    {
      id: 'never',
      label: biVoice(
        voice,
        name,
        {
          en: 'You: do not stop villagers during the first fight.',
          ru: 'Не останавливай крестьян во время первого боя.',
        },
        {
          en: '{name}: do not stop villagers during the first fight.',
          ru: '{name}: не останавливать крестьян во время первого боя.',
        },
      ),
    },
    {
      id: 'attack',
      label: bi(
        'Attack when production is running and a resource or isolated army is scouted.',
        'Атакуй, когда производство идёт и разведан ресурс или изолированная армия.',
      ),
    },
    {
      id: 'no-fight',
      label: bi('Do not fight 1v2 or under Town Center without siege.', 'Не дерись 1v2 и под ТЦ без осады.'),
    },
    {
      id: 'win',
      label: bi(
        'Win condition: convert the first advantage into denied gold or relics — not a keep dive.',
        'Победа: первое преимущество в отрезанное золото или реликвии, а не дайв в донжон.',
      ),
    },
    {
      id: 'rule',
      label: bottleneck
        ? bi(`Match rule: fix “${bottleneck.title.text}”.`, `Правило матча: исправить «${bottleneck.title.textRu}».`)
        : bi('Match rule: keep making villagers.', 'Правило матча: продолжай делать крестьян.'),
    },
  ]
  const ingame: ChecklistItem[] = [
    { id: 'opp', label: bi('What is the opponent doing (military building vs 2TC)?', 'Что делает враг (военное здание vs 2ТЦ)?') },
    { id: 'army', label: bi('Where is their army right now?', 'Где их армия сейчас?') },
    { id: 'tc', label: bi('Is the Town Center queued?', 'Есть ли очередь в ТЦ?') },
    { id: 'prod', label: bi('Are production buildings actually producing?', 'Военные здания реально производят?') },
    { id: 'house', label: bi('Is the next house needed?', 'Нужен ли следующий дом?') },
    { id: 'res', label: bi('Which resource is the bottleneck in the bank?', 'Какой ресурс — узкое место в банке?') },
    { id: 'age', label: bi('When is the next age-up click — and is army still coming?', 'Когда клик в эпоху — и идёт ли армия?') },
    { id: 'ally', label: bi('Where are allies, and can we take this fight together?', 'Где союзники, и можем ли принять бой вместе?') },
  ]
  return { pre, ingame }
}

function trainingPlanFor(bottleneck: CoachFinding | null): BiText[] {
  if (bottleneck?.id === 'feudal-late') {
    return [
      bi('Matches 1–3: Landmark down by 4:00, Feudal click by 4:30, TC never idle.', 'Матчи 1–3: ориентир к 4:00, клик во 2-ю эпоху к 4:30, ТЦ без простоя.'),
      bi('Matches 4–7: same opening; if Landmark is late at 4:00, pull 3 extra to gold/wood immediately.', 'Матчи 4–7: тот же опенинг; если в 4:00 ориентир не стоит — сразу +3 на золото или дерево.'),
      bi('Matches 8–10: keep Feudal ≤4:30 and start the first military building before the age-up finishes.', 'Матчи 8–10: 2-я эпоха не позже 4:30 и первое военное здание до конца апа.'),
    ]
  }
  if (bottleneck?.id === 'early-losses') {
    return [
      bi('Matches 1–3: no fight until TC is queued and first production is running.', 'Матчи 1–3: никакого боя, пока ТЦ в очереди и первое производство идёт.'),
      bi('Matches 4–7: scout opponent gold before 5:00; if military is down, skip greedy 2TC.', 'Матчи 4–7: золото врага до 5:00; если уже армия — без жадного 2ТЦ.'),
      bi('Matches 8–10: one opening only; first army on the map before 6:00.', 'Матчи 8–10: один опенинг; первая армия на карте до 6:00.'),
    ]
  }
  if (bottleneck?.id === 'late-macro') {
    return [
      bi('Matches 1–3: TC stays queued through the first Castle fight.', 'Матчи 1–3: очередь ТЦ во время первого замкового боя.'),
      bi('Matches 4–7: siege workshop before the third engagement after 20:00.', 'Матчи 4–7: мастерская осады до третьего боя после 20:00.'),
      bi('Matches 8–10: contest relics if a monastery exists; do not third-fight without siege.', 'Матчи 8–10: спорь реликвии при монастыре; третий бой без осады не начинай.'),
    ]
  }
  return [
    bi('Matches 1–3: one opening only; TC queued; first army before 6:00.', 'Матчи 1–3: один опенинг; очередь ТЦ; первая армия до 6:00.'),
    bi('Matches 4–7: scout gold + military building before any fight.', 'Матчи 4–7: разведка золота и военного здания до любого боя.'),
    bi('Matches 8–10: if the game goes past 20 min, add siege before the third fight.', 'Матчи 8–10: если игра >20 мин — осада до третьего боя.'),
  ]
}

/** Builds the compact 70-point self report from scout rows, stored matches, and optional summaries. */
export function buildSelfCoachReport(input: SelfCoachInput): SelfCoachReport {
  const voice = input.voice ?? 'third'
  const games = collectCoachGames(input)
  const decided = games.filter((g) => g.result === 'win' || g.result === 'loss')
  const wins = decided.filter((g) => g.result === 'win').length
  const wr = rate(wins, decided.length)
  const overallConfidence = coachConfidence(games.length)

  if (games.length === 0) {
    const sections = emptySections()
    return {
      kind: 'self',
      profileId: input.profileId,
      playerName: input.playerName,
      voice,
      gameCount: 0,
      decided: 0,
      winRate: null,
      overallConfidence: 'single',
      sections,
      styleFingerprint: sections.styleFingerprint as SelfCoachReport['styleFingerprint'],
      strengths: sections.strengths as SelfCoachReport['strengths'],
      weaknesses: sections.weaknesses as SelfCoachReport['weaknesses'],
      formatSplits: sections.formatSplits as SelfCoachReport['formatSplits'],
      topErrors: [],
      topStrengths: [],
      bottleneck: null,
      mostImportantChange: bi(
        'Play games so the coach has a sample — nothing to change yet.',
        'Нужна выборка игр — пока менять нечего.',
      ),
      preMatchChecklist: [
        ...(input.currentCiv || input.inMatch ? [civChecklistItem([], input.currentCiv, input.inMatch)] : []),
        { id: 'tc', label: bi('Keep the Town Center queued.', 'Держи очередь ТЦ.') },
      ],
      inGameChecklist: [],
      decisionTree: decisionTree([]),
    }
  }

  const { strengths, weaknesses } = buildFindings(games, voice, input.playerName)
  const style = styleFromGames(games, voice, input.playerName)
  const splits = formatSplits(games)
  const timings = timingProxies(games)
  const bottleneck =
    weaknesses.find((f) => f.severity === 'critical') ??
    weaknesses.find((f) => f.severity === 'important') ??
    null
  const { pre, ingame } = checklists(
    games,
    bottleneck,
    voice,
    input.playerName,
    input.currentCiv,
    input.inMatch,
  )
  const tree = decisionTree(games)

  const sections = emptySections()
  const ok = <T>(id: SelfSectionId, n: number, data: T) => {
    sections[id] = { status: 'ok', confidence: coachConfidence(n), data }
  }

  ok('sample', games.length, {
    games: games.length,
    decided: decided.length,
    winRate: wr,
    sources: groupCount(games.map((g) => g.source)),
  })
  ok('styleFingerprint', games.length, style)
  if (strengths.length) ok('strengths', strengths[0]!.evidenceCount, strengths)
  else sections.strengths = insufficient('No repeated winning pattern yet.', 'Пока нет повторяющегося победного паттерна.')
  if (weaknesses.length) ok('weaknesses', weaknesses[0]!.evidenceCount, weaknesses)
  else sections.weaknesses = insufficient('No repeated losing pattern yet.', 'Пока нет повторяющегося проигрышного паттерна.')

  const durs = games.map((g) => g.durationSec).filter((n): n is number => n != null)
  if (durs.length >= 3) {
    const mean = avg(durs) ?? 0
    ok('buildConsistency', durs.length, {
      durationStdProxySec: Math.round(Math.sqrt(durs.reduce((s, d) => s + (d - mean) ** 2, 0) / durs.length)),
      meanDurationSec: avg(durs),
      note: bi(
        'Feudal/Castle click times are not in scout history. Duration spread is the consistency proxy.',
        'Времени кликов во 2-ю и 3-ю эпоху нет в истории разведки. Разброс длительности — замена для оценки стабильности опенинга.',
      ),
    })
  } else {
    sections.buildConsistency = insufficient(
      'Need more timed games to judge opening consistency.',
      'Нужно больше игр с длительностью, чтобы судить о консистентности опенинга.',
    )
  }
  ok('typicalTimings', Math.max(durs.length, 1), {
    durationBuckets: timings,
    meanAge2Sec: avg(games.map((g) => g.age2Sec).filter((n): n is number => n != null && n > 0)),
    meanAge3Sec: avg(games.map((g) => g.age3Sec).filter((n): n is number => n != null && n > 0)),
    ageSample: games.filter((g) => g.age2Sec != null && g.age2Sec > 0).length,
    note: bi(
      'Age-up seconds come only from decoded stats summaries. Duration buckets fill the rest.',
      'Секунды эпох только из расшифрованных сводок. Остальное — корзины по длительности матча.',
    ),
  })

  const ecoGames = games.filter((g) => g.foodGathered != null || g.villagersProduced != null || g.villagerHigh != null)
  if (ecoGames.length) {
    ok('economy', ecoGames.length, {
      meanVillagerHigh: avg(ecoGames.map((g) => g.villagerHigh).filter((n): n is number => n != null)),
      meanFood: avg(ecoGames.map((g) => g.foodGathered).filter((n): n is number => n != null)),
      meanWood: avg(ecoGames.map((g) => g.woodGathered).filter((n): n is number => n != null)),
      meanGold: avg(ecoGames.map((g) => g.goldGathered).filter((n): n is number => n != null)),
      note: bi('From match summaries / local logs only.', 'Только из сводок матча / локальных логов.'),
    })
  } else {
    sections.economy = insufficient('No resource or villager totals in this sample.', 'В выборке нет ресурсов и крестьян.')
  }

  const prodGames = games.filter((g) => g.unitsProduced != null || g.apm != null)
  if (prodGames.length) {
    ok('idleProduction', prodGames.length, {
      meanUnits: avg(prodGames.map((g) => g.unitsProduced).filter((n): n is number => n != null)),
      meanApm: avg(prodGames.map((g) => g.apm).filter((n): n is number => n != null)),
      note: bi(
        'TC idle seconds are not stored on scout rows. Production/APM counters are the proxy.',
        'Секунды простоя ТЦ нет в разведке. Прокси — производство и APM.',
      ),
    })
  } else {
    sections.idleProduction = insufficient('No Relic production/APM counters.', 'Нет счётчиков производства/APM Relic.')
  }

  const boGames = games.filter((g) => g.buildTokens.length > 0)
  if (boGames.length) {
    const flat = boGames.flatMap((g) => g.buildTokens)
    ok('composition', boGames.length, {
      cav: gamesWith(boGames, (g) => hasToken(g.buildTokens, 'knight', 'horseman', 'lancer')).length,
      ranged: gamesWith(boGames, (g) => hasToken(g.buildTokens, 'archer', 'crossbow', 'longbow')).length,
      inf: gamesWith(boGames, (g) => hasToken(g.buildTokens, 'spearman', 'man-at-arms', 'maa')).length,
      tokenCount: flat.length,
    })
  } else {
    sections.composition = insufficient('No build-order lists to infer composition.', 'Нет билдов, чтобы вывести композицию.')
  }

  sections.scouting = insufficient(
    'Scout path / sheep / fog reveals are not in public match rows.',
    'Путь разведчика, овцы и туман войны не приходят в публичных строках матчей.',
  )
  sections.raids = optionalSignalSection(
    games,
    (g) => g.villagersLost != null || g.kills != null,
    (rows) => ({
      meanVillagersLost: avg(rows.map((g) => g.villagersLost).filter((n): n is number => n != null)),
      meanKills: avg(rows.map((g) => g.kills).filter((n): n is number => n != null)),
    }),
    'No casualty or kill counters to score raids.',
    'Нет потерь и убийств, чтобы оценить рейды.',
  )
  const mapNamed = games.filter((g) => g.map)
  if (mapNamed.length) ok('mapControl', mapNamed.length, groupCount(mapNamed.map((g) => g.map)))
  else sections.mapControl = insufficient('No map names.', 'Нет названий карт.')

  sections.relics = optionalSignalSection(
    games,
    (g) => g.relicsCaptured != null,
    (rows) => ({ meanRelics: avg(rows.map((g) => g.relicsCaptured).filter((n): n is number => n != null)) }),
    'Relic captures are not present (need a stats summary).',
    'Захваты реликвий отсутствуют (нужна сводка).',
  )
  sections.sacredSites = optionalSignalSection(
    games,
    (g) => g.sacredCaptured != null,
    (rows) => ({ meanSacred: avg(rows.map((g) => g.sacredCaptured).filter((n): n is number => n != null)) }),
    'Sacred site captures are not present.',
    'Захваты священных мест отсутствуют.',
  )
  sections.trade = optionalSignalSection(
    games,
    (g) => hasToken(g.buildTokens, 'market', 'trader', 'trade'),
    (rows) => ({ gamesWithMarket: rows.length }),
    'No market/trader build-order evidence.',
    'В билдах нет рынка и торговцев.',
  )
  sections.siege = optionalSignalSection(
    games,
    (g) => hasToken(g.buildTokens, 'ram', 'springald', 'trebuchet', 'cannon', 'bombard', 'siege'),
    (rows) => ({ gamesWithSiege: rows.length }),
    'No siege tokens in recorded build orders.',
    'В билдах нет осадных орудий.',
  )

  const fightNote = bi(
    `${wins} wins / ${decided.length - wins} losses. Lead/deficit play is inferred from result+duration only unless a summary exists.`,
    `${wins} побед / ${decided.length - wins} поражений. Игра при лиде или отставании выводится только из результата и длительности, если нет сводки.`,
  )
  ok('fights', decided.length, { wins, losses: decided.length - wins, note: fightNote })
  ok('formatSplits', games.length, splits)
  ok('topErrors', Math.max(weaknesses.length, 1), weaknesses.slice(0, 5))
  ok('topStrengths', Math.max(strengths.length, 1), strengths.slice(0, 5))
  sections.unusedOpportunities = strengths.length
    ? { status: 'ok', confidence: overallConfidence, data: strengths.slice(0, 5).map((s) => s.instead) }
    : insufficient('No unused-opportunity sample yet.', 'Пока нет выборки неиспользованных возможностей.')
  ok('stopDoing', Math.max(weaknesses.length, 1), weaknesses.slice(0, 3).map((f) => f.why))
  ok('startDoing', Math.max(weaknesses.length, 1), weaknesses.slice(0, 3).map((f) => f.instead))
  if (bottleneck) ok('bottleneck', bottleneck.evidenceCount, bottleneck)
  else sections.bottleneck = insufficient('No bottleneck with enough repeats.', 'Нет узкого места с достаточным числом повторов.')
  ok(
    'mostImportantChange',
    bottleneck?.evidenceCount ?? 1,
    bottleneck?.instead ?? bi('Keep Town Center queued.', 'Держи очередь ТЦ.'),
  )
  ok('trainingPlan', 1, { nextMatches: trainingPlanFor(bottleneck) })
  ok('progressMetrics', 1, {
    metrics: [
      bi('Share of losses under 15 minutes (should fall).', 'Доля поражений до 15 минут (должна падать).'),
      bi('Share of losses over 28 minutes (should fall).', 'Доля поражений после 28 минут (должна падать).'),
      bi('Win rate on the main civ (should rise or stay stable).', 'Винрейт на основной цивилизации (должен расти или держаться).'),
      ...(ecoGames.length
        ? [bi('Villager high / food gathered when summaries exist.', 'Пик крестьян и еда — когда есть сводки.')]
        : []),
    ],
    skipped: bi(
      'Feudal time, idle TC seconds, supply block, and sheep counts are omitted — they are not in this sample.',
      'Время 2-й эпохи, простой ТЦ, лимит домов и овцы опущены — их нет в этой выборке.',
    ),
  })
  ok('decisionTree', games.length, tree)
  ok('preMatchChecklist', games.length, pre)
  ok('inGameChecklist', games.length, ingame)

  return {
    kind: 'self',
    profileId: input.profileId,
    playerName: input.playerName,
    voice,
    gameCount: games.length,
    decided: decided.length,
    winRate: wr,
    overallConfidence,
    sections,
    styleFingerprint: sections.styleFingerprint as SelfCoachReport['styleFingerprint'],
    strengths: sections.strengths as SelfCoachReport['strengths'],
    weaknesses: sections.weaknesses as SelfCoachReport['weaknesses'],
    formatSplits: sections.formatSplits as SelfCoachReport['formatSplits'],
    topErrors: weaknesses.slice(0, 5),
    topStrengths: strengths.slice(0, 5),
    bottleneck,
    mostImportantChange:
      bottleneck?.instead ??
      bi('Keep making villagers and produce the first army on time.', 'Делай крестьян и первую армию вовремя.'),
    preMatchChecklist: pre,
    inGameChecklist: ingame,
    decisionTree: tree,
  }
}

export function pickLocaleText(item: BiText, locale: string): string {
  return locale === 'ru' || locale === 'uk' ? item.textRu : item.text
}
