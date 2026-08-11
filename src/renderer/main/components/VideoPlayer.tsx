import { ExternalLink, Play, X } from 'lucide-react'
import { useState } from 'react'
import { autoplayEmbedUrl, embeddedVideoFromUrl } from '@domain/videoEmbed'
import { useI18n } from '../../i18n'

/**
 * Opt-in, lazy YouTube/Twitch player for guide and evidence URLs. The iframe is not
 * mounted (and YouTube receives no request) until the player clicks Watch.
 * URLs without a supported trusted provider remain safe external links.
 */
export function VideoPlayer({
  url,
  title,
  className = '',
  compact = false,
}: {
  url: string
  title: string
  className?: string
  /** Use a one-line trigger inside dense guide/catalog cards. */
  compact?: boolean
}) {
  const { tt } = useI18n()
  const [playing, setPlaying] = useState(false)
  const video = embeddedVideoFromUrl(url)

  if (!video) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center gap-1 text-xs text-primary hover:underline ${className}`}
      >
        {tt('Watch')} <ExternalLink className="h-3.5 w-3.5" />
      </a>
    )
  }

  return (
    <div
      className={`${
        compact
          ? 'flex flex-wrap items-center gap-2'
          : 'overflow-hidden rounded-md border border-border/70 bg-background/40'
      } ${className}`}
    >
      {playing ? (
        <div className={`relative aspect-video bg-black ${compact ? 'basis-full w-full' : ''}`}>
          <iframe
            title={title}
            src={autoplayEmbedUrl(video)}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
          <button
            type="button"
            onClick={() => setPlaying(false)}
            title={tt('Close')}
            aria-label={tt('Close')}
            className="absolute right-2 top-2 rounded-md border border-white/30 bg-black/70 p-1.5 text-white transition-colors hover:bg-black"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className={
            compact
              ? 'inline-flex items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:border-primary/60 hover:bg-primary/15'
              : 'group flex aspect-video w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/20 via-secondary to-background px-5 text-center transition-colors hover:from-primary/30'
          }
        >
          <span
            className={
              compact
                ? 'rounded-full bg-primary/20 p-1 text-primary'
                : 'rounded-full bg-primary p-3 text-primary-foreground shadow-lg transition-transform group-hover:scale-105'
            }
          >
            <Play className={compact ? 'h-3 w-3 fill-current' : 'h-5 w-5 fill-current'} />
          </span>
          {compact ? (
            <span>{tt('Watch')} · {video.provider === 'twitch' ? 'Twitch' : 'YouTube'}</span>
          ) : (
            <>
              <span className="line-clamp-2 max-w-md text-xs font-medium text-foreground">{title}</span>
              <span className="text-[11px] text-muted-foreground">
                {video.provider === 'twitch' ? 'Twitch' : 'YouTube'} · {tt('Watch')}
              </span>
            </>
          )}
        </button>
      )}
      {(!compact || playing) && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-end gap-1 px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-primary"
        >
          {video.provider === 'twitch' ? 'Twitch' : 'YouTube'}{' '}
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  )
}
