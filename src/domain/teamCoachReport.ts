/**
 * Team coaching for 2v2/3v3/4v4: ally roles, synergy, focus, team mistakes.
 * Does not blame allies for things the subject could compensate.
 */

import { CIV_PROFILES } from '../data/civProfiles'
import { buildAdvisoryTeamPlan, type TeamPlanRosterPlayer } from './teamInsights'
import type { ScoutMatchRow } from '../../electron/ipc/contract'
import type { StoredMatch } from '../store/historyStore'
import type { MatchSummary } from './statsSummary'
import {
  TEAM_SECTION_IDS,
  bi,
  coachConfidence,
  collectCoachGames,
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
  type FormatLane,
} from './coachReportCommon'

export interface AllyProfile {
  name: string
  civs: { civ: string; count: number }[]
  gamesTogether: number
  suggestedRole: BiText
}

export interface TeamCoachReport {
  kind: 'team'
  subjectProfileId: number
  subjectName: string
  gameCount: number
  overallConfidence: CoachConfidence
  sections: Record<(typeof TEAM_SECTION_IDS)[number], CoachSection<unknown>>
  allyProfiles: AllyProfile[]
  roleAssignment: BiText[]
  synergy: BiText
  focusTarget: BiText
  weakLink: BiText
  teamTopErrors: CoachFinding[]
  allyErrors: CoachFinding[]
  teamChecklist: ChecklistItem[]
  formatPlans: { lane: FormatLane; plan: BiText }[]
}

export interface TeamCoachInput {
  subjectProfileId: number
  subjectName: string
  scoutGames?: ScoutMatchRow[]
  localMatches?: StoredMatch[]
  summariesByMatchId?: Record<string, MatchSummary | null | undefined>
  /** Live/post-game roster: subject team first. */
  liveRoster?: TeamPlanRosterPlayer[][]
}

function emptyTeamSections() {
  const reason = bi('Not enough team-game evidence.', 'Недостаточно командных игр.')
  const out = {} as TeamCoachReport['sections']
  for (const id of TEAM_SECTION_IDS) out[id] = { status: 'insufficient_data', reason }
  return out
}

function roleForCiv(civ: string | null): BiText {
  const tags = civ ? (CIV_PROFILES[civ]?.tags ?? []) : []
  if (tags.some((t) => ['aggressive', 'tempo', 'raiding', 'cavalry'].includes(t))) {
    return bi('Pressure / tempo', 'Давление / темп')
  }
  if (tags.some((t) => ['economy', 'boom', 'trade'].includes(t))) {
    return bi('Economy / scaling', 'Экономика / скейл')
  }
  if (tags.some((t) => ['defensive', 'fortifications'].includes(t))) {
    return bi('Anchor / defense', 'Якорь / оборона')
  }
  return bi('Flexible', 'Гибкая роль')
}

function alliesFromGames(games: CoachGame[]): AllyProfile[] {
  const map = new Map<string, { civs: string[]; games: number }>()
  for (const g of games) {
    if (g.formatLane === '1v1' || g.formatLane === 'other') continue
    for (const mate of g.teammates) {
      const row = map.get(mate.name) ?? { civs: [], games: 0 }
      row.games++
      row.civs.push(mate.civ)
      map.set(mate.name, row)
    }
  }
  return [...map.entries()]
    .map(([name, row]) => {
      const civs = groupCount(row.civs).map((row) => ({ civ: row.key, count: row.count }))
      return {
        name,
        civs,
        gamesTogether: row.games,
        suggestedRole: roleForCiv(civs[0]?.civ ?? null),
      }
    })
    .sort((a, b) => b.gamesTogether - a.gamesTogether)
}

/** Team report from subject history plus optional live roster. */
export function buildTeamCoachReport(input: TeamCoachInput): TeamCoachReport {
  const games = collectCoachGames({
    profileId: input.subjectProfileId,
    scoutGames: input.scoutGames,
    localMatches: input.localMatches,
    summariesByMatchId: input.summariesByMatchId,
  })
  const teamGames = games.filter((g) => g.formatLane === '2v2' || g.formatLane === '3v3' || g.formatLane === '4v4')
  const sections = emptyTeamSections()
  const allies = alliesFromGames(teamGames)
  const advisory = input.liveRoster ? buildAdvisoryTeamPlan(input.liveRoster) : null

  const empty: TeamCoachReport = {
    kind: 'team',
    subjectProfileId: input.subjectProfileId,
    subjectName: input.subjectName,
    gameCount: teamGames.length,
    overallConfidence: 'single',
    sections,
    allyProfiles: [],
    roleAssignment: [],
    synergy: bi('No 2v2/3v3/4v4 sample.', 'Нет выборки 2v2/3v3/4v4.'),
    focusTarget: bi('Insufficient data to name a focus target.', 'Недостаточно данных, чтобы назвать цель фокуса.'),
    weakLink: bi(
      'Do not label an ally as the weak link without their own match sample.',
      'Не называй союзника слабым звеном без его собственной выборки.',
    ),
    teamTopErrors: [],
    allyErrors: [],
    teamChecklist: [],
    formatPlans: [
      { lane: '2v2', plan: bi('Insufficient 2v2 sample.', 'Недостаточно игр 2v2.') },
      { lane: '3v3', plan: bi('Insufficient 3v3 sample.', 'Недостаточно игр 3v3.') },
      { lane: '4v4', plan: bi('Insufficient 4v4 sample.', 'Недостаточно игр 4v4.') },
    ],
  }

  if (teamGames.length === 0 && !advisory) return empty

  const ok = (id: (typeof TEAM_SECTION_IDS)[number], n: number, data: unknown) => {
    sections[id] = { status: 'ok', confidence: coachConfidence(Math.max(n, 1)), data }
  }

  const decided = teamGames.filter((g) => g.result === 'win' || g.result === 'loss')
  const wr = rate(decided.filter((g) => g.result === 'win').length, decided.length)
  ok('sample', Math.max(teamGames.length, 1), { games: teamGames.length, winRate: wr, advisory: Boolean(advisory) })

  if (allies.length) ok('allyProfiles', allies[0]!.gamesTogether, allies)
  else if (advisory) {
    ok(
      'allyProfiles',
      1,
      advisory.assignments.map((a) => ({
        name: a.name,
        civs: a.civ ? [{ civ: a.civ, count: 1 }] : [],
        gamesTogether: 1,
        suggestedRole: bi(a.role, a.role),
      })),
    )
  }

  const roles: BiText[] = []
  if (advisory) {
    for (const a of advisory.assignments) {
      roles.push(bi(`${a.name}: ${a.role} — ${a.rationale}`, `${a.name}: ${a.role} — ${a.rationale}`))
    }
  } else {
    roles.push(bi(`${input.subjectName}: play the main civ on-role.`, `${input.subjectName}: играй основную циву в роли.`))
    for (const ally of allies.slice(0, 3)) {
      roles.push(
        bi(
          `${ally.name}: ${ally.suggestedRole.text} (from ${ally.civs[0]?.civ ?? 'unknown civ'}, ${ally.gamesTogether} games together).`,
          `${ally.name}: ${ally.suggestedRole.textRu} (по ${ally.civs[0]?.civ ?? 'неизвестной циве'}, ${ally.gamesTogether} игр вместе).`,
        ),
      )
    }
  }
  ok('roleAssignment', Math.max(teamGames.length, 1), roles)

  const synergy = advisory
    ? bi(advisory.headline, advisory.headline)
    : allies.length
      ? bi(
          'Pair pressure civs with a scaler. Do not both greedy 2TC. Subject compensates by waiting for the ally’s first army ping.',
          'Давящая цива + скейл. Не жадничайте 2ТЦ вдвоём. Субъект компенсирует ожиданием пинга первой армии союзника.',
        )
      : empty.synergy
  ok('synergy', Math.max(teamGames.length, 1), synergy)

  const oppCivs = teamGames.flatMap((g) => g.oppCivs)
  const focusCiv = groupCount(oppCivs)[0]
  const focusTarget = focusCiv
    ? bi(
        `Focus the most common enemy civ in this sample (${focusCiv.key}, ${focusCiv.count} appearances). Collapse on that player first in team fights.`,
        `Фокус на самой частой вражеской циве (${focusCiv.key}, ${focusCiv.count} раз). В командных боях схлопывайтесь на этом игроке.`,
      )
    : empty.focusTarget
  if (focusCiv) ok('focusTarget', focusCiv.count, focusTarget)
  else sections.focusTarget = insufficient('No opponent civs recorded in team games.', 'В командных играх нет цив противника.')

  ok(
    'weakLink',
    1,
    bi(
      'Weak-link label is withheld unless an ally’s own history is loaded. Subject-side compensation: do not take 1v2, ping before engaging, raid if the ally is late.',
      'Слабое звено не назначается без истории союзника. Компенсация субъекта: не 1v2, пинг до боя, рейд если союзник опаздывает.',
    ),
  )

  const teamErrors: CoachFinding[] = []
  if (decided.length >= 5 && (wr ?? 50) < 45) {
    teamErrors.push(
      finding({
        id: 'team-wr',
        originalPoints: [44, 53],
        severity: 'important',
        title: bi('Team sample below break-even', 'Командная выборка ниже 50%'),
        why: bi(
          'This is a team result, not proof that allies threw. Typical subject error: fighting without the ally.',
          'Это командный результат, не доказательство, что союзники слили. Типичная ошибка субъекта — бой без союзника.',
        ),
        instead: bi(
          'One shared timing ping. If an ally is not there, take a raid, not a 1v2.',
          'Один общий пинг тайминга. Нет союзника — рейд, не 1v2.',
        ),
        evidence: `${decided.length} team games · ${wr}%`,
        evidenceCount: decided.length,
      }),
    )
  }
  const shortTeamLoss = teamGames.filter((g) => g.result === 'loss' && g.durationSec != null && g.durationSec < 15 * 60)
  if (shortTeamLoss.length >= 3) {
    teamErrors.push(
      finding({
        id: 'team-early',
        originalPoints: [34, 53],
        severity: 'critical',
        title: bi('Team dies early together', 'Команда сыпется рано вместе'),
        why: bi(
          `${shortTeamLoss.length} team losses under 15 minutes. That is usually an uncoordinated first fight, not one ally’s eco.`,
          `${shortTeamLoss.length} командных поражений до 15 минут. Обычно это несогласованный первый бой, не эко одного союзника.`,
        ),
        instead: bi(
          'Agree who makes the first army. The other player walls or stays on eco until that army is out.',
          'Договоритесь, кто делает первую армию. Второй играет в стены/эко пока армия не вышла.',
        ),
        evidence: `${shortTeamLoss.length} short team losses`,
        evidenceCount: shortTeamLoss.length,
      }),
    )
  }
  ok('teamErrors', Math.max(teamErrors.length, 1), teamErrors)
  sections.allyErrors = insufficient(
    'Ally-specific errors need that ally’s match sample. Not inferred from the subject’s losses.',
    'Ошибки союзника требуют его выборки. Не выводятся из поражений субъекта.',
  )

  ok('stopStartAllies', 1, {
    stop: bi(
      'Allies should stop taking isolated fights. The subject should stop blaming the result on them without counters.',
      'Союзникам — не принимать изолированные бои. Субъекту — не винить их без счётчиков.',
    ),
    start: bi(
      'Start: one ping for the first attack, one player on raid if trade appears, one player adding siege.',
      'Начать: один пинг первой атаки, один на рейд трейда, один добавляет осаду.',
    ),
  })

  const civPoolPlan = allies.slice(0, 4).map((a) =>
    bi(
      `${a.name}: primary ${a.civs[0]?.civ ?? '?'}${a.civs[1] ? `, secondary ${a.civs[1].civ}` : ''} — ${a.suggestedRole.text}.`,
      `${a.name}: основа ${a.civs[0]?.civ ?? '?'}${a.civs[1] ? `, вторая ${a.civs[1].civ}` : ''} — ${a.suggestedRole.textRu}.`,
    ),
  )
  if (civPoolPlan.length) ok('civPoolPlan', allies[0]!.gamesTogether, civPoolPlan)

  const formatPlans: TeamCoachReport['formatPlans'] = (['2v2', '3v3', '4v4'] as FormatLane[]).map((lane) => {
    const n = teamGames.filter((g) => g.formatLane === lane).length
    if (n === 0) {
      return { lane, plan: bi(`No ${lane} games in sample.`, `Нет игр ${lane} в выборке.`) }
    }
    if (lane === '2v2') {
      return {
        lane,
        plan: bi(
          `${n} games. Duo: one tempo, one scaler. First pressure together; trade only after Castle unless the map is water.`,
          `${n} игр. Пара: темп + скейл. Первое давление вместе; трейд только после Замка, если карта не вода.`,
        ),
      }
    }
    if (lane === '3v3') {
      return {
        lane,
        plan: bi(
          `${n} games. Name an aggressor, a macro player, and a siege/ranged. Collapse on one enemy.`,
          `${n} игр. Назначьте агрессора, макро-игрока и осаду/стрелков. Схлопывайтесь в одного врага.`,
        ),
      }
    }
    return {
      lane,
      plan: bi(
        `${n} games. Flanks pressure, pockets boom/trade. Do not all four fight on one flank.`,
        `${n} игр. Фланги давят, карманы бумят/трейдят. Не деритесь всемером на одном фланге.`,
      ),
    }
  })
  ok('formatPlans', teamGames.length || 1, formatPlans)

  ok('teamDecisionTree', teamGames.length || 1, [
    bi('If one ally is rushed: nearest player helps, the rest keep TC queued.', 'Если союзника рашат: ближайший помогает, остальные держат очередь ТЦ.'),
    bi('If they trade: one mobile player raids the line.', 'Если трейд: один мобильный рейдит линию.'),
    bi('If one enemy Fast Castles: pressure that player, do not all boom.', 'Если один враг идёт в быстрый замок: давите его, не набирайте экономику все сразу.'),
    bi('If Feudal all-in: both/all production on, no greedy second TC.', 'Если феодальный олл-ин: всё производство, без жадного второго ТЦ.'),
  ])

  ok(
    'allyTraining',
    1,
    bi(
      'Ally homework is not assigned from the subject’s losses. Open their /profile to build a real plan.',
      'Домашку союзнику не назначаем из твоих поражений. Открой его страницу статистики.',
    ),
  )

  const teamChecklist: ChecklistItem[] = [
    { id: 'civs', label: bi('Who plays which civ / role.', 'Кто на какой циве / роли.') },
    { id: 'scout', label: bi('Who scouts which opponent.', 'Кто скаутит какого врага.') },
    { id: 'army', label: bi('Who makes the first army.', 'Кто делает первую армию.') },
    { id: 'fc', label: bi('Who (if anyone) Fast Castles.', 'Кто (если вообще) идёт в быстрый замок.') },
    { id: 'cav', label: bi('Who is cavalry / who is ranged / who adds siege.', 'Кто конница / кто стрелки / кто осада.') },
    { id: 'trade', label: bi('Do we trade, and who raids if they do.', 'Торгуем ли мы, и кто рейдит, если торгуют они.') },
    { id: 'focus', label: focusTarget },
  ]
  ok('teamChecklist', teamGames.length || 1, teamChecklist)

  return {
    kind: 'team',
    subjectProfileId: input.subjectProfileId,
    subjectName: input.subjectName,
    gameCount: teamGames.length,
    overallConfidence: coachConfidence(teamGames.length || 1),
    sections,
    allyProfiles: allies,
    roleAssignment: roles,
    synergy,
    focusTarget,
    weakLink:
      (sections.weakLink.status === 'ok' ? (sections.weakLink.data as BiText) : empty.weakLink),
    teamTopErrors: teamErrors.slice(0, 5),
    allyErrors: [],
    teamChecklist,
    formatPlans,
  }
}
