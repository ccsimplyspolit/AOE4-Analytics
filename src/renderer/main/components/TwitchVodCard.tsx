import { ExternalLink, Radio, Search } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import type { TwitchVodFinderInput } from '@domain/twitchVodFinder'
import { twitchVideoFinderUrl } from '@domain/twitchVodFinder'
import type { StoredMatch } from '@store/historyStore'
import { formatDurationShort } from '@shared/format'
import { Card, CardContent } from '@shared/components/ui/card'
import { ipc } from '@shared/ipc'
import { useI18n } from '../../i18n'
import { useTwitchVod } from '../queries/useTwitchVod'
import { useAutoAction } from '../hooks/useAutoAction'

/**
 * Shows a Twitch link only after AoE4World's exact game API/Finder association
 * returned the same game id.
 * Twitch embeds require a verified web `parent` domain and don't reliably run
 * in a packaged file:// Electron renderer, so the direct VOD opens in the
 * browser where Twitch playback is supported.
 */
export function TwitchVodCard({
  match,
  profileId,
  input: providedInput,
}: {
  match?: StoredMatch
  /** Profile used to read AoE4World's direct per-game Twitch association. */
  profileId?: number | null
  /** Public-game callers can provide the same exact-game Finder input. */
  input?: TwitchVodFinderInput | null
}) {
  const { tt } = useI18n()
  const queryClient = useQueryClient()
  const input: TwitchVodFinderInput | null =
    providedInput ??
    (match
      ? {
          gameId: match.id,
          profileId,
          civilization: match.civ,
          opponentCivilization: match.oppCiv,
          map: match.map,
          durationSec: match.durationSec,
        }
      : null)
  const isPublicGame = Boolean(
    input && (!match || !match.custom) && /^\d{1,16}$/.test(input.gameId),
  )
  const safeInput = input ?? {
    gameId: '0',
    civilization: 'english',
  }
  const lookup = useTwitchVod(safeInput, isPublicGame)
  const finderUrl = twitchVideoFinderUrl(safeInput)

  if (!isPublicGame || !input) return null

  const result = lookup.data?.ok ? lookup.data.data : null
  const found = result?.vod ?? null

  useAutoAction(
    found ? `vod-extract:${input.gameId}:${found.url}` : null,
    () =>
      ipc
        .extractVideoAnalysis({
          url: found!.url,
          civilization: input.civilization,
          gameId: input.gameId,
        })
        .then(() => queryClient.invalidateQueries({ queryKey: ['videoAnalyses'] })),
    { enabled: Boolean(found) },
  )

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold tracking-tight">{tt('Twitch VOD')}</h2>
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 rounded-md bg-violet-500/15 p-1.5 text-violet-300">
                <Radio className="h-4 w-4" />
              </span>
              <div className="space-y-1">
                {lookup.isLoading ? (
                  <p className="text-sm text-muted-foreground">
                    {tt('Looking for the VOD linked to this exact game…')}
                  </p>
                ) : found ? (
                  <>
                    <p className="text-sm font-medium text-win">
                      {tt('Verified VOD found for this exact game.')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tt(
                        'AoE4World matched this public stream to the game ID, so this is not a guessed replay.',
                      )}
                    </p>
                  </>
                ) : lookup.isError || (lookup.data && !lookup.data.ok) ? (
                  <p className="text-sm text-muted-foreground">
                    {tt(
                      'Could not query the Twitch finder right now. You can open the filtered search instead.',
                    )}
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-medium">
                      {tt('No verified Twitch VOD for this game.')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tt(
                        'A VOD appears only when the stream was public, kept as an archive, and AoE4World linked it to this game.',
                      )}
                    </p>
                  </>
                )}
              </div>
            </div>

            {found ? (
              <div className="flex flex-wrap justify-end gap-2">
                <a
                  href={found.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-violet-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-violet-400"
                >
                  {found.offsetSec != null
                    ? tt('Watch VOD from {time}').replace(
                        '{time}',
                        formatDurationShort(found.offsetSec),
                      )
                    : tt('Watch VOD')}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <a
                href={finderUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary/30 px-3 py-2 text-xs text-primary transition-colors hover:bg-primary/10"
              >
                {tt('Open VOD finder')} <Search className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          {found && (
            <p className="text-[11px] text-muted-foreground">
              {tt(
                'Twitch opens in your browser because its embedded player requires a verified web domain.',
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
