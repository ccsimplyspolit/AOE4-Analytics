import { useEffect, useState } from 'react'
import { CalendarDays, ExternalLink, Radio, Swords, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@shared/components/ui/card'
import { countryFlag, formatCount, formatPercent, formatRating } from '@shared/format'
import { PageHead } from '../components/PageHead'
import { EmptyBox, ErrorBox } from '../components/feedback'
import { useEsportsLeaderboard } from '../queries/useLeaderboard'
import { useDebounce } from '@shared/hooks/useDebounce'
import { useI18n } from '../../i18n'
import { LEADERBOARD_COUNTRIES } from './Leaderboards'

const DIRECTORIES = [
  {
    title: 'AoE4World tournaments',
    description: 'Live directory with ongoing, upcoming and past events, tiers, dates and regions.',
    href: 'https://aoe4world.com/esports/tournaments',
    icon: Trophy,
  },
  {
    title: 'Tournament Elo',
    description: 'Official tournament-player leaderboard maintained by the AoE4World esports dataset.',
    href: 'https://aoe4world.com/esports/leaderboards/1',
    icon: Swords,
  },
  {
    title: 'Liquipedia Age of Empires',
    description: 'Community event pages, brackets and historical tournament context.',
    href: 'https://liquipedia.net/ageofempires/Age_of_Empires_IV_Tournaments',
    icon: CalendarDays,
  },
] as const

export function Tournaments({ embedded = false }: { embedded?: boolean } = {}) {
  const { tt } = useI18n()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [country, setCountry] = useState<string | undefined>(undefined)
  const search = useDebounce(searchInput.trim(), 400)

  useEffect(() => {
    setPage(1)
  }, [search, showInactive, country])

  const { data, isLoading, refetch } = useEsportsLeaderboard({
    page,
    search: search || undefined,
    showInactive,
    country,
  })
  const result = data?.ok ? data.data : null
  const totalPages =
    result && result.perPage > 0 ? Math.max(1, Math.ceil(result.totalCount / result.perPage)) : 1

  return (
    <div className={embedded ? 'space-y-6' : 'animate-fade-in space-y-6'}>
      <PageHead
        embedded={embedded}
        kicker="Esports desk"
        title="Tournaments"
        sub="Tournament Elo from the public AoE4World esports API, plus live event directories."
      />

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Swords className="h-4 w-4 text-primary" />
                {result?.name ?? tt('Tournament Elo')}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {tt('Public /esports/leaderboards/1 table. Event calendars stay on the live site.')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={tt('Search player on this ladder')}
                className="h-9 w-48 rounded-md border border-border bg-background px-3 text-sm"
              />
              <label className="flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
                {tt('Show inactive')}
              </label>
              <select
                value={country ?? ''}
                onChange={(e) => setCountry(e.target.value || undefined)}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                {LEADERBOARD_COUNTRIES.map((c) => (
                  <option key={c.label} value={c.code ?? ''}>
                    {tt(c.label)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {result?.you && (
            <p className="text-xs text-muted-foreground">
              {tt('Your rank')} #{formatCount(result.you.rank)} · {formatRating(result.you.rating)}
            </p>
          )}

          {isLoading && <p className="text-xs text-muted-foreground">{tt('Loading…')}</p>}
          {data && !data.ok && <ErrorBox message={data.error.message} onRetry={() => void refetch()} />}
          {result && result.rows.length === 0 && (
            <EmptyBox>
              <p>{tt('No players found for this filter.')}</p>
            </EmptyBox>
          )}
          {result && result.rows.length > 0 && (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">{tt('Player')}</th>
                    <th className="px-3 py-2 text-right">{tt('Rating')}</th>
                    <th className="px-3 py-2 text-right">{tt('Win rate')}</th>
                    <th className="px-3 py-2 text-right">{tt('Games')}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.profileId} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{row.rank}</td>
                      <td className="px-3 py-1.5">
                        <Link to={`/profile/${row.profileId}`} className="hover:underline">
                          {countryFlag(row.country)} {row.name}
                        </Link>
                        {!row.active && (
                          <span className="ml-2 text-[11px] text-muted-foreground">{tt('Inactive')}</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{formatRating(row.rating)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                        {formatPercent(row.winRate)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                        {row.wins}W {row.losses}L
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {result && totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
              >
                {tt('Prev')}
              </button>
              <span>
                {tt('Page')} {page}/{totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
              >
                {tt('Next')}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        {DIRECTORIES.map((entry) => {
          const Icon = entry.icon
          return (
            <a
              key={entry.href}
              href={entry.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border/70 bg-card/70 p-4 transition-colors hover:border-primary/50 hover:bg-secondary/40"
            >
              <div className="flex items-start justify-between">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="mt-3 text-sm font-semibold">{tt(entry.title)}</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{tt(entry.description)}</p>
            </a>
          )
        })}
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-primary" /> {tt('Local broadcast tools')}
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            {tt(
              'The app does not duplicate a changing tournament calendar. It does provide a local series board, countdown, best-of score, map rotation and civ draft controls for your own broadcast.',
            )}
          </p>
          <Link
            to="/lab?section=stream"
            className="inline-flex w-fit items-center gap-1.5 rounded-md border border-primary/30 px-3 py-2 text-xs text-primary hover:bg-primary/10"
          >
            {tt('Open Stream Desk')} <Radio className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
