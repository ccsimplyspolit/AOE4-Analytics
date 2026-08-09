import { describe, expect, it } from 'vitest'
import { autoplayEmbedUrl, embeddedVideoFromUrl } from '../videoEmbed'

describe('embeddedVideoFromUrl', () => {
  it.each([
    'https://www.youtube.com/watch?v=d_FEca71_Xo',
    'https://youtu.be/d_FEca71_Xo?t=90',
    'https://www.youtube.com/embed/d_FEca71_Xo',
    'https://www.youtube.com/shorts/d_FEca71_Xo',
  ])('normalizes %s into the privacy-enhanced player', (source) => {
    expect(embeddedVideoFromUrl(source)).toEqual({
      provider: 'youtube',
      videoId: 'd_FEca71_Xo',
      embedUrl: 'https://www.youtube-nocookie.com/embed/d_FEca71_Xo',
    })
  })

  it('rejects non-YouTube, malformed, insecure and invalid-id URLs', () => {
    for (const source of [
      'https://example.com/watch?v=d_FEca71_Xo',
      'http://www.youtube.com/watch?v=d_FEca71_Xo',
      'https://www.youtube.com/watch?v=too-short',
      'https://www.twitch.tv/videos/not-a-number',
      'not a URL',
    ]) {
      expect(embeddedVideoFromUrl(source)).toBeNull()
    }
  })

  it.each([
    'https://www.twitch.tv/videos/123456789',
    'https://player.twitch.tv/?video=123456789',
  ])('normalizes Twitch VOD %s into the Twitch player', (source) => {
    expect(embeddedVideoFromUrl(source)).toEqual({
      provider: 'twitch',
      videoId: '123456789',
      embedUrl: 'https://player.twitch.tv/',
    })
  })

  it('adds the required Twitch parent and video parameters', () => {
    const video = embeddedVideoFromUrl('https://twitch.tv/videos/123456789')!
    expect(autoplayEmbedUrl(video)).toBe(
      'https://player.twitch.tv/?autoplay=1&video=123456789&parent=localhost',
    )
  })

  it('adds player options only when playback is requested', () => {
    const video = embeddedVideoFromUrl('https://youtu.be/d_FEca71_Xo')!
    expect(autoplayEmbedUrl(video)).toBe(
      'https://www.youtube-nocookie.com/embed/d_FEca71_Xo?autoplay=1&modestbranding=1&playsinline=1&rel=0',
    )
  })
})
