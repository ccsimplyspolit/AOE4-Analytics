import { describe, expect, it } from 'vitest'
import { CREATOR_VIDEO_LESSONS, CREATOR_VIDEO_LESSON_STATS } from '@data/creatorVideoLessons.generated'
import {
  getLessonsForCiv,
  lessonWatchUrl,
  selectCreatorMatchCoach,
} from '../creatorVideoCoach'
import { buildMatchBriefing } from '../matchBriefing'

describe('creator video lessons', () => {
  it('only includes transcript-backed videos', () => {
    expect(CREATOR_VIDEO_LESSON_STATS.valdemarWithTranscripts).toBeGreaterThanOrEqual(26)
    expect(CREATOR_VIDEO_LESSON_STATS.beastyWithTranscripts).toBeGreaterThanOrEqual(2)
    expect(CREATOR_VIDEO_LESSONS.length).toBe(
      CREATOR_VIDEO_LESSON_STATS.valdemarWithTranscripts +
        CREATOR_VIDEO_LESSON_STATS.beastyWithTranscripts,
    )
    for (const lesson of CREATOR_VIDEO_LESSONS) {
      expect(lesson.transcriptStatus).toBe('available')
      expect(lesson.snippetsCount).toBeGreaterThan(0)
      expect(lesson.id).toMatch(/^[A-Za-z0-9_-]{11}$/)
    }
  })

  it('keeps Beastyqt masterclass chapters with real timestamps', () => {
    const macro = CREATOR_VIDEO_LESSONS.find((lesson) => lesson.id === 'vrH85EESrSY')
    const micro = CREATOR_VIDEO_LESSONS.find((lesson) => lesson.id === 'FdJFDsXr4ws')
    expect(macro?.mechanics.some((beat) => beat.quote.includes('Workers') || beat.name.includes('Idle'))).toBe(true)
    expect(micro?.mechanics.some((beat) => /stutter|attack move|kiting/i.test(`${beat.name} ${beat.quote}`))).toBe(true)
    expect(lessonWatchUrl(macro!, 25)).toContain('t=25s')
  })

  it('selects player vs opponent lessons without inventing quotes', () => {
    const coach = selectCreatorMatchCoach('byzantines', 'chinese')
    expect(coach.sharedFundamentals.length).toBeGreaterThan(0)
    expect(coach.sharedFundamentals.every((pick) => pick.lesson != null)).toBe(true)
    expect(coach.forPlayer.length).toBeGreaterThan(0)
    expect(coach.forPlayer.every((pick) => pick.catalogTitle.length > 0)).toBe(true)
    expect(
      coach.forPlayer.filter((pick) => pick.lesson != null).every((pick) => pick.lesson?.transcriptStatus === 'available'),
    ).toBe(true)
    const byz = getLessonsForCiv('byzantines', 'valdemar')
    expect(byz.length).toBeGreaterThan(0)
    expect(byz.every((lesson) => lesson.primaryCivs.includes('byzantines') || lesson.opponentCivs.includes('byzantines'))).toBe(true)
  })
})

describe('buildMatchBriefing', () => {
  it('names a focus target and keeps a decision tree', () => {
    const briefing = buildMatchBriefing({
      phase: 'upcoming',
      format: 'rm_1v1',
      map: 'Dry Arabia',
      subject: { profileId: 1, name: 'Me', civ: 'english' },
      teammates: [],
      opponents: [{ profileId: 2, name: 'Opp', civ: 'french', isOpponent: true }],
    })
    expect(briefing.focusPlayer).toContain('Opp')
    expect(briefing.decisionTree.some((row) => row.ifSeen === '2TC')).toBe(true)
    expect(briefing.videos.sharedFundamentals.length).toBeGreaterThan(0)
    expect(briefing.matchRule.length).toBeGreaterThan(0)
  })
})
