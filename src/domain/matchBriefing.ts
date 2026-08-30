/**
 * Pre-game / post-game briefing for a roster. Uses dossiers when history exists,
 * civilization identities otherwise. Never claims a detected in-game build.
 */

import { civDisplayName } from './civ'
import { selectCreatorMatchCoach, type CreatorMatchCoach } from './creatorVideoCoach'
import type { PlayerDossier } from './playerDossier'

export interface BriefingPlayer {
  profileId: number
  name: string
  civ: string | null
  isOpponent?: boolean
  dossier?: PlayerDossier | null
}

export interface MatchBriefing {
  phase: 'upcoming' | 'historical'
  format: string
  map: string | null
  headline: string
  focusPlayer: string
  deny: string
  attackWindow: string
  compositionHint: string
  loseCondition: string
  planB: string
  winCondition: string
  matchRule: string
  roles: { profileId: number; name: string; civ: string | null; role: string; note: string }[]
  decisionTree: { ifSeen: string; thenDo: string }[]
  videos: CreatorMatchCoach
}

function civLabel(civ: string | null): string {
  return civ ? civDisplayName(civ) : 'unknown civ'
}

function weakestOpponent(opponents: BriefingPlayer[]): BriefingPlayer | null {
  if (opponents.length === 0) return null
  const ranked = [...opponents].sort((a, b) => {
    const aWr = a.dossier?.winRate ?? 50
    const bWr = b.dossier?.winRate ?? 50
    return aWr - bWr
  })
  return ranked[0] ?? null
}

function strongestOpponent(opponents: BriefingPlayer[]): BriefingPlayer | null {
  if (opponents.length === 0) return null
  const ranked = [...opponents].sort((a, b) => (b.dossier?.winRate ?? 50) - (a.dossier?.winRate ?? 50))
  return ranked[0] ?? null
}

export function buildMatchBriefing(input: {
  phase: 'upcoming' | 'historical'
  format: string
  map: string | null
  subject: BriefingPlayer
  teammates: BriefingPlayer[]
  opponents: BriefingPlayer[]
}): MatchBriefing {
  const { subject, teammates, opponents, format, map, phase } = input
  const focus = weakestOpponent(opponents)
  const threat = strongestOpponent(opponents)
  const subjectCiv = civLabel(subject.civ)
  const focusName = focus?.name ?? opponents[0]?.name ?? 'the nearest opponent'
  const focusCiv = civLabel(focus?.civ ?? opponents[0]?.civ ?? null)
  const videos = selectCreatorMatchCoach(subject.civ, focus?.civ ?? opponents[0]?.civ ?? null)

  const bottleneck = subject.dossier?.bottleneck
  const oppWeak = focus?.dossier?.weaknesses[0]

  const roles = [subject, ...teammates].map((player) => ({
    profileId: player.profileId,
    name: player.name,
    civ: player.civ,
    role: player.dossier?.preMatch.role ?? (player.profileId === subject.profileId ? 'Primary' : 'Support'),
    note:
      player.dossier?.preMatch.firstPriority ??
      `Play ${civLabel(player.civ)} on-role; keep Town Center queued.`,
  }))

  const isTeam = teammates.length > 0 || /2v2|3v3|4v4|team/i.test(format)

  return {
    phase,
    format,
    map,
    headline:
      phase === 'upcoming'
        ? `Play ${subjectCiv} on-role. First target is ${focusName} (${focusCiv}).`
        : `Review ${subjectCiv} vs ${focusCiv}. First question: did you hit the planned timing?`,
    focusPlayer: `${focusName} · ${focusCiv}`,
    deny: oppWeak?.title
      ? `Punish “${oppWeak.title}” — ${oppWeak.action}`
      : `Deny ${focusName}'s first gold / forward food. That is the default economic target.`,
    attackWindow: subject.dossier?.preMatch.firstTiming ?? '5:30–8:00 after the first military building is producing',
    compositionHint: isTeam
      ? 'One player makes the mobile army, one keeps production and siege. Do not both dive.'
      : 'Answer the scouted army: spears vs cavalry, cavalry vs ranged, ranged vs spears. Add siege before the third fight.',
    loseCondition: bottleneck
      ? `Repeat “${bottleneck.title}”.`
      : 'Fight 1v2, idle the Town Center during the first engagement, or dive a Town Center without siege.',
    planB: 'If Plan A bounces: stop the dive, re-queue villagers, add a counter unit, and raid a different resource.',
    winCondition: subject.dossier?.preMatch.winCondition ?? `Convert the first ${subjectCiv} timing into a denied gold or relics.`,
    matchRule: subject.dossier?.preMatch.matchRule ?? 'Keep making villagers.',
    roles,
    decisionTree: [
      { ifSeen: '2TC', thenDo: 'Do not mirror blindly. Make army, hit the exposed gold, and delay their Castle by 2 minutes.' },
      { ifSeen: 'Fast Castle', thenDo: 'Pressure gold now. Food-heavy Fast Castle is weakest while the landmark is building.' },
      { ifSeen: 'Early rush', thenDo: 'Keep Town Center queued, drop spears/horsemen, and pull villagers only under the Town Center.' },
      { ifSeen: 'Mass cavalry', thenDo: 'Spears + spear upgrades before adding more cavalry of your own.' },
      { ifSeen: 'Mass ranged', thenDo: 'Horsemen or manganel; do not walk melee through open field without a screen.' },
      { ifSeen: 'Trade', thenDo: 'Raid the route with cavalry. Do not both boom trade if nobody is defending it.' },
      { ifSeen: threat ? `${threat.name} getting ahead` : 'One opponent snowballing', thenDo: 'Contain the carry with vision + counter units; attack the weaker partner to collapse the team.' },
    ],
    videos,
  }
}

export function briefingFromCoachContext(
  context: import('./coachContext').LastMatchCoachContext,
  phase: 'upcoming' | 'historical',
  subjectDossier?: PlayerDossier | null,
): MatchBriefing {
  return buildMatchBriefing({
    phase,
    format: context.game.format,
    map: context.game.map,
    subject: {
      profileId: context.player.profileId,
      name: context.player.name,
      civ: context.player.civilization,
      dossier: subjectDossier,
    },
    teammates: context.teammates.map((player) => ({
      profileId: player.profileId,
      name: player.name,
      civ: player.civilization,
    })),
    opponents: context.opponents.map((player) => ({
      profileId: player.profileId,
      name: player.name,
      civ: player.civilization,
      isOpponent: true,
    })),
  })
}
