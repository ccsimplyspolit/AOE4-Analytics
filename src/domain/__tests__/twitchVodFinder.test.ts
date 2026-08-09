import { describe, expect, it } from 'vitest'
import {
  twitchFinderLastPage,
  twitchGameLengthFilter,
  twitchOffsetSeconds,
  twitchVideoFinderUrl,
  twitchVodReferenceFromUrl,
  twitchVodReferencesFromFinderHtml,
} from '../twitchVodFinder'

describe('twitch VOD finder helpers', () => {
  it('uses AoE4World filters without assuming one team-game opponent', () => {
    const url = twitchVideoFinderUrl({
      gameId: '245635094',
      civilization: 'macedonian_dynasty',
      opponentCivilization: 'japanese',
      map: 'Boulder Bay',
      durationSec: 1407,
    })

    expect(url).toBe(
      'https://aoe4world.com/tools/twitch-video-finder?civilization=macedonian_dynasty&map=Boulder+Bay&game_length=20-24mins',
    )
  })

  it.each([
    [299, '<10mins'],
    [300, '5-9mins'],
    [1407, '20-24mins'],
    [3599, '55-59mins'],
    [3600, '>60mins'],
  ])('maps %s seconds to %s', (seconds, expected) => {
    expect(twitchGameLengthFilter(seconds)).toBe(expected)
  })

  it('accepts only trusted Twitch VOD URLs and keeps the timestamp', () => {
    expect(
      twitchVodReferenceFromUrl('https://www.twitch.tv/videos/2840769756?t=1h2m3s', '42'),
    ).toEqual({
      gameId: '42',
      videoId: '2840769756',
      offsetSec: 3723,
      url: 'https://www.twitch.tv/videos/2840769756?t=1h2m3s',
    })
    expect(twitchVodReferenceFromUrl('https://evil.example/videos/2840769756', '42')).toBeNull()
  })

  it('extracts a VOD only from the row that owns the exact game id', () => {
    const html = `
      <div data-game-id="100"><a href="https://www.twitch.tv/videos/111?t=10s">VOD</a></div>
      <div data-game-id="200"><a href="https://www.twitch.tv/videos/222?t=20s">VOD</a></div>
      <a href="/tools/twitch-video-finder?page=2">2</a>
    `
    expect(twitchVodReferencesFromFinderHtml(html)).toEqual([
      {
        gameId: '100',
        videoId: '111',
        offsetSec: 10,
        url: 'https://www.twitch.tv/videos/111?t=10s',
      },
      {
        gameId: '200',
        videoId: '222',
        offsetSec: 20,
        url: 'https://www.twitch.tv/videos/222?t=20s',
      },
    ])
    expect(twitchFinderLastPage(html)).toBe(2)
  })

  it('parses only valid Twitch offsets', () => {
    expect(twitchOffsetSeconds('5624s')).toBe(5624)
    expect(twitchOffsetSeconds('2m10s')).toBe(130)
    expect(twitchOffsetSeconds('oops')).toBeNull()
  })
})
