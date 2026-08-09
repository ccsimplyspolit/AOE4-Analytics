/**
 * Safe, provider-specific video embedding. URLs in imported build orders and
 * harvested evidence are data, so never render them directly as an iframe.
 * YouTube uses its privacy-enhanced player; Twitch uses its official player
 * with the required parent parameter. Unsupported providers remain regular
 * external links.
 */
export interface EmbeddedVideo {
  provider: 'youtube' | 'twitch'
  videoId: string
  /** Trusted provider player URL without autoplay. */
  embedUrl: string
}

const VIDEO_URL_PATTERN =
  /https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|twitch\.tv)\/[^\s<>"'`]+/gi

function cleanVideoUrl(value: string): string {
  return value.replace(/[.,!?;:]+$/g, '')
}

/**
 * Convert provider-specific player/share URLs into one stable public link.
 * AoE4Guides exports many YouTube URLs as `/embed/<id>`; keeping those raw
 * made the external link open a bare player and caused duplicate catalog
 * values for the same video. The player itself still derives its safe embed
 * URL only when the user presses Watch.
 */
export function canonicalVideoUrl(value: string | null | undefined): string | null {
  const video = embeddedVideoFromUrl(cleanVideoUrl(value ?? ''))
  if (!video) return null
  return video.provider === 'youtube'
    ? `https://www.youtube.com/watch?v=${video.videoId}`
    : `https://www.twitch.tv/videos/${video.videoId}`
}

/** Extracts all supported YouTube/Twitch links from a provider description. */
export function videoUrlsFromText(value: string | null | undefined): string[] {
  if (!value) return []
  return [...value.matchAll(VIDEO_URL_PATTERN)]
    .map((match) => canonicalVideoUrl(match[0]))
    .filter((url): url is string => url != null)
}

/** Returns direct build video metadata plus links embedded in its description. */
export function videoUrlsFromBuild(input: {
  video?: string | null
  description?: string | null
}): string[] {
  const candidates = [
    ...(input.video ? [input.video.trim()] : []),
    ...videoUrlsFromText(input.description),
  ]
  const seen = new Set<string>()
  return candidates
    .map((url) => canonicalVideoUrl(url))
    .filter((url): url is string => {
      if (!url || seen.has(url)) return false
      seen.add(url)
      return true
    })
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

/** Returns a trusted embed description when a URL names a valid YouTube video. */
export function embeddedVideoFromUrl(value: string | null | undefined): EmbeddedVideo | null {
  if (!value) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null

  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  let videoId: string | null = null
  if (host === 'youtu.be') {
    videoId = url.pathname.split('/').filter(Boolean)[0] ?? null
  } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    const parts = url.pathname.split('/').filter(Boolean)
    if (url.pathname === '/watch') videoId = url.searchParams.get('v')
    else if (['embed', 'shorts', 'live'].includes(parts[0] ?? '')) videoId = parts[1] ?? null
  } else if (host === 'youtube-nocookie.com') {
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts[0] === 'embed') videoId = parts[1] ?? null
  } else if (host === 'twitch.tv' || host === 'player.twitch.tv') {
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts[0]?.toLowerCase() === 'videos') videoId = parts[1] ?? null
    if (!videoId) videoId = url.searchParams.get('video')
    if (videoId && !/^\d+$/.test(videoId)) videoId = null
    if (videoId) {
      return {
        provider: 'twitch',
        videoId,
        embedUrl: 'https://player.twitch.tv/',
      }
    }
  }

  if (!videoId || !YOUTUBE_ID.test(videoId)) return null
  return {
    provider: 'youtube',
    videoId,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
  }
}

/** Adds player options only at the moment the user presses Watch. */
export function autoplayEmbedUrl(video: EmbeddedVideo): string {
  const url = new URL(video.embedUrl)
  url.searchParams.set('autoplay', '1')
  if (video.provider === 'youtube') {
    url.searchParams.set('modestbranding', '1')
    url.searchParams.set('playsinline', '1')
    url.searchParams.set('rel', '0')
  } else {
    url.searchParams.set('video', video.videoId)
    // Twitch requires a parent domain for every embedded player. Electron's
    // file:// renderer has no hostname, so localhost is the safe local value.
    const runtime = globalThis as typeof globalThis & {
      location?: { hostname?: string }
    }
    const parent = runtime.location?.hostname || 'localhost'
    url.searchParams.set('parent', parent)
  }
  return url.toString()
}
