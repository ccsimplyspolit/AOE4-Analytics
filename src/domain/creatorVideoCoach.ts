/**
 * Picks per-video Valdemar / Beastyqt lessons for a match or a player civ.
 * Lessons are transcript-backed only (see creatorVideoLessons.generated.ts).
 * Catalog shells without captions are never presented as quotes.
 */

import {
  CREATOR_VIDEO_LESSONS,
  type CreatorId,
  type CreatorVideoLesson,
} from '@data/creatorVideoLessons.generated'
import { VALDEMAR_VIDEOS, type ValdemarVideoEntry } from '@data/valdemarCatalog.generated'
import { BEASTY_VIDEOS, type BeastyVideoEntry } from '@data/beastyCatalog.generated'
import type { LastMatchCoachContext } from './coachContext'

export interface CreatorVideoPick {
  lesson: CreatorVideoLesson | null
  catalogTitle: string
  catalogUrl: string
  creator: CreatorId
  reason: string
  side: 'player' | 'opponent' | 'shared'
}

export interface CreatorMatchCoach {
  forPlayer: CreatorVideoPick[]
  forOpponent: CreatorVideoPick[]
  sharedFundamentals: CreatorVideoPick[]
}

function civKey(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function lessonMentionsCiv(lesson: CreatorVideoLesson, civ: string): boolean {
  const key = civKey(civ)
  if (!key) return false
  return lesson.primaryCivs.includes(key) || lesson.opponentCivs.includes(key)
}

function valdemarMentionsCiv(video: ValdemarVideoEntry, civ: string): boolean {
  const key = civKey(civ)
  return video.primaryCivs.includes(key) || video.opponentCivs.includes(key)
}

function youtubeUrl(videoId: string, timeSec?: number): string {
  const base = `https://www.youtube.com/watch?v=${videoId}`
  return timeSec != null && timeSec > 0 ? `${base}&t=${timeSec}s` : base
}

export function lessonWatchUrl(lesson: CreatorVideoLesson, timeSec?: number): string {
  return youtubeUrl(lesson.id, timeSec)
}

/** Transcript-backed lessons for one civilization. */
export function getLessonsForCiv(civ: string | null | undefined, creator?: CreatorId): CreatorVideoLesson[] {
  const key = civKey(civ)
  return CREATOR_VIDEO_LESSONS.filter((lesson) => {
    if (creator && lesson.creator !== creator) return false
    if (!key) return lesson.primaryCivs.length === 0
    return lessonMentionsCiv(lesson, key)
  })
}

function pickFromLessons(
  civ: string | null,
  opponentCiv: string | null,
  side: CreatorVideoPick['side'],
  limit: number,
): CreatorVideoPick[] {
  const exact: CreatorVideoPick[] = []
  const civOnly: CreatorVideoPick[] = []
  const fundamentals: CreatorVideoPick[] = []

  for (const lesson of CREATOR_VIDEO_LESSONS) {
    const myHit = civ ? lessonMentionsCiv(lesson, civ) : false
    const oppHit = opponentCiv ? lessonMentionsCiv(lesson, opponentCiv) : false
    const isFundamental = lesson.primaryCivs.length === 0
    if (civ && opponentCiv && myHit && oppHit) {
      exact.push({
        lesson,
        catalogTitle: lesson.title,
        catalogUrl: lessonWatchUrl(lesson, lesson.builds[0]?.timeSec ?? lesson.mechanics[0]?.timeSec),
        creator: lesson.creator,
        reason: 'Transcript matchup for both civilizations',
        side,
      })
    } else if (myHit) {
      civOnly.push({
        lesson,
        catalogTitle: lesson.title,
        catalogUrl: lessonWatchUrl(lesson, lesson.builds[0]?.timeSec ?? lesson.mechanics[0]?.timeSec),
        creator: lesson.creator,
        reason: `Transcript lesson for ${civ}`,
        side,
      })
    } else if (isFundamental && lesson.creator === 'beastyqt') {
      fundamentals.push({
        lesson,
        catalogTitle: lesson.title,
        catalogUrl: lessonWatchUrl(lesson, lesson.mechanics[0]?.timeSec ?? lesson.builds[0]?.timeSec),
        creator: lesson.creator,
        reason: 'Beastyqt fundamentals (on-disk chapters)',
        side: 'shared',
      })
    }
  }

  const merged = [...exact, ...civOnly, ...fundamentals]
  const seen = new Set<string>()
  const unique: CreatorVideoPick[] = []
  for (const pick of merged) {
    const id = pick.lesson?.id ?? pick.catalogUrl
    if (seen.has(id)) continue
    seen.add(id)
    unique.push(pick)
    if (unique.length >= limit) break
  }
  return unique
}

function fillCatalogShells(
  existing: CreatorVideoPick[],
  civ: string | null,
  side: CreatorVideoPick['side'],
  limit: number,
): CreatorVideoPick[] {
  if (!civ) return existing
  const merged = [...existing]
  const seen = new Set(existing.map((pick) => pick.lesson?.id ?? pick.catalogUrl))
  const { valdemar, beasty } = getCatalogVideosForCiv(civ)
  const rows: Array<{ creator: CreatorId; id: string; title: string; url: string }> = [
    ...valdemar.map((video) => ({
      creator: 'valdemar' as const,
      id: video.id,
      title: video.title,
      url: video.url,
    })),
    ...beasty.map((video) => ({
      creator: 'beastyqt' as const,
      id: video.id,
      title: video.title,
      url: video.url,
    })),
  ]
  for (const row of rows) {
    if (merged.length >= limit) break
    if (seen.has(row.id) || seen.has(row.url)) continue
    seen.add(row.id)
    const lesson = CREATOR_VIDEO_LESSONS.find((item) => item.id === row.id) ?? null
    merged.push({
      lesson,
      catalogTitle: row.title,
      catalogUrl: row.url,
      creator: row.creator,
      reason: lesson
        ? `Transcript lesson for ${civ}`
        : `3-year catalog title for ${civ} (no on-disk transcript yet)`,
      side,
    })
  }
  return merged
}

/**
 * Catalog videos (may lack transcripts) plus transcript lessons when present.
 * Catalog titles are metadata; quotes only appear when `lesson` is non-null.
 */
export function getCatalogVideosForCiv(civ: string | null | undefined): {
  valdemar: ValdemarVideoEntry[]
  beasty: BeastyVideoEntry[]
} {
  const key = civKey(civ)
  if (!key) return { valdemar: [], beasty: [] }
  return {
    valdemar: VALDEMAR_VIDEOS.filter((video) => valdemarMentionsCiv(video, key)).slice(0, 6),
    beasty: BEASTY_VIDEOS.filter(
      (video) => video.aoe4Relevant !== false && (video.primaryCivs.includes(key) || video.opponentCivs.includes(key)),
    ).slice(0, 4),
  }
}

export function selectCreatorMatchCoach(
  myCiv: string | null,
  opponentCiv: string | null,
): CreatorMatchCoach {
  const forPlayer = fillCatalogShells(pickFromLessons(myCiv, opponentCiv, 'player', 4), myCiv, 'player', 6)
  const forOpponent = opponentCiv
    ? fillCatalogShells(
        pickFromLessons(opponentCiv, myCiv, 'opponent', 3).filter(
          (pick) =>
            pick.side === 'opponent' ||
            (pick.lesson != null && opponentCiv && lessonMentionsCiv(pick.lesson, opponentCiv)),
        ),
        opponentCiv,
        'opponent',
        5,
      )
    : []
  const sharedFundamentals = CREATOR_VIDEO_LESSONS.filter(
    (lesson) => lesson.creator === 'beastyqt' && lesson.primaryCivs.length === 0,
  ).map((lesson) => ({
    lesson,
    catalogTitle: lesson.title,
    catalogUrl: lessonWatchUrl(lesson, lesson.mechanics[0]?.timeSec),
    creator: lesson.creator,
    reason: 'Shared Beastyqt masterclass chapters',
    side: 'shared' as const,
  }))
  return { forPlayer, forOpponent, sharedFundamentals: sharedFundamentals.slice(0, 2) }
}

export function selectCreatorMatchCoachFromContext(context: LastMatchCoachContext): CreatorMatchCoach {
  return selectCreatorMatchCoach(
    context.player.civilization,
    context.opponents[0]?.civilization ?? null,
  )
}
