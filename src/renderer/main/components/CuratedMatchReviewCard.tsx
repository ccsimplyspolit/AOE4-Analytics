import { ExternalLink, FileWarning, MapPinned, Play, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CURATED_MATCH_REVIEWS, type CuratedMatchReview } from '@data/curatedMatchReviews'
import { civDisplayName } from '@domain/civ'
import { formatDurationShort } from '@shared/format'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { useI18n } from '../../i18n'

export function CuratedMatchPack() {
  const { tt } = useI18n()
  return (
    <Card className="border-primary/25 bg-primary/[0.035]">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">{tt('Imported match review pack')}</h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              {tt(
                'Eight exact AoE4World matches were resolved from the supplied map, player and Twitch URLs. Open a public match for the full API-backed breakdown or jump to the exact VOD timestamp.',
              )}
            </p>
          </div>
          <Badge variant="outline">{tt('Snapshot 2026-08-09')}</Badge>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {CURATED_MATCH_REVIEWS.map((review) => (
            <CuratedMatchReviewCard key={review.id} review={review} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function CuratedMatchReviewCard({ review }: { review: CuratedMatchReview }) {
  const { tt, gameName } = useI18n()
  const [first, second] = review.players
  const mapEdge = first.mapWinRate - second.mapWinRate

  return (
    <div className="rounded-lg border border-border/80 bg-background/45 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-semibold">
              {review.map} · Game #{review.gameId}
            </h3>
            <Badge variant="secondary" className="text-[9px]">
              {tt('Patch')} {review.patch}
            </Badge>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {formatDurationShort(review.durationSec)} · {tt('average rating')}{' '}
            {review.averageRating} · MMR {review.averageMmr}
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {tt('VOD offset')} {formatTimestamp(review.video.offsetSec)}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {review.players.map((player) => (
          <div key={player.profileId} className="rounded-md border border-border/70 p-2">
            <div className="flex items-center justify-between gap-2">
              <a
                href={`https://aoe4world.com/players/${player.profileId}`}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 truncate text-xs font-semibold hover:text-primary"
              >
                {player.name}
              </a>
              <span
                className={
                  player.result === 'win' ? 'text-[11px] text-win' : 'text-[11px] text-loss'
                }
              >
                {player.result === 'win' ? tt('Victory') : tt('Defeat')}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {gameName(civDisplayName(player.civilization))} · {tt('rating')} {player.rating}{' '}
              <span className={player.ratingDiff >= 0 ? 'text-win' : 'text-loss'}>
                ({player.ratingDiff >= 0 ? '+' : ''}
                {player.ratingDiff})
              </span>
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {tt('Map civ rate')} {player.mapWinRate.toFixed(2)}% ·{' '}
              {player.mapGames.toLocaleString()} {tt('games')} · {tt('median')}{' '}
              {formatDurationShort(player.mapMedianDurationSec)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 p-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5 text-foreground">
          <MapPinned className="h-3.5 w-3.5 text-primary" />
          {tt('Map context')}
        </div>
        <p className="mt-1">
          {tt('Map leader')}: {gameName(civDisplayName(review.mapLeader.civilization))}{' '}
          {review.mapLeader.winRate.toFixed(2)}% ({review.mapLeader.games.toLocaleString()}{' '}
          {tt('games')}) · {tt('player civ edge')} {mapEdge >= 0 ? '+' : ''}
          {mapEdge.toFixed(2)} {tt('percentage points')}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to={`/public-game/${first.profileId}/${review.gameId}`}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Users className="h-3 w-3" /> {tt('Open in app')}
        </Link>
        <a
          href={review.gameUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-primary/35 px-2 py-1 text-[10px] text-primary hover:bg-primary/10"
        >
          <Users className="h-3 w-3" /> {tt('AoE4World match')} <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href={review.video.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] hover:bg-secondary"
        >
          <Play className="h-3 w-3" /> {tt('Watch VOD')} {formatTimestamp(review.video.offsetSec)}
        </a>
        <a
          href={review.mapStatsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] hover:bg-secondary"
        >
          <MapPinned className="h-3 w-3" /> {tt('Map stats')} <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <p className="mt-2 flex items-start gap-1.5 text-[10px] text-amber-200/80">
        <FileWarning className="mt-0.5 h-3 w-3 shrink-0" />
        {tt(
          'Twitch VOD is linked, but no public caption track was exposed. Build-order and tactic extraction requires a replay summary or a local speech-to-text pass.',
        )}
      </p>
    </div>
  )
}

function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`
}
