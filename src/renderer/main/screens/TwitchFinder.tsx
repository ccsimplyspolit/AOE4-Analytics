import { useCallback, useState } from 'react'
import { ExternalLink, Loader2, Search, ShieldCheck, Video } from 'lucide-react'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { PageHead } from '../components/PageHead'
import { ErrorBox } from '../components/feedback'
import { useI18n } from '../../i18n'
import { ipc } from '@shared/ipc'
import type { OnlineSearchResult } from '@ipc/contract'
import {
  twitchVideoFinderUrl,
  type TwitchVodFinderInput,
} from '@domain/twitchVodFinder'
import { formatCount, formatDurationShort } from '@shared/format'

type Provider = 'all' | 'twitch' | 'youtube'
type Sort = 'recent' | 'views'

const DEFAULT_GAME: TwitchVodFinderInput = {
  gameId: '',
  civilization: 'english',
  map: '',
  durationSec: null,
}

export function TwitchFinder() {
  const { tt, locale } = useI18n()
  const [query, setQuery] = useState('aoe4')
  const [provider, setProvider] = useState<Provider>('all')
  const [liveOnly, setLiveOnly] = useState(false)
  const [period, setPeriod] = useState('30')
  const [sort, setSort] = useState<Sort>('recent')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [results, setResults] = useState<OnlineSearchResult[]>([])
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [game, setGame] = useState(DEFAULT_GAME)
  const [gameLoading, setGameLoading] = useState(false)
  const [gameError, setGameError] = useState<string | null>(null)
  const [gameResult, setGameResult] = useState<Awaited<ReturnType<typeof ipc.findTwitchVod>> | null>(null)

  const search = useCallback(async () => {
    const normalized = query.trim()
    if (normalized.length < 2) {
      setSearchError(tt('Enter at least two characters to search.'))
      return
    }
    setSearching(true)
    setSearchError(null)
    try {
      const response = await ipc.searchOnline({
        query: normalized,
        provider,
        liveOnly,
        limit: 100,
        dateRangeDays: Number(period),
        sort,
      })
      if (!response.ok) {
        setSearchError(response.error.message)
        setResults([])
        return
      }
      setResults(response.data.results)
      setFetchedAt(response.data.fetchedAt)
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : String(error))
    } finally {
      setSearching(false)
    }
  }, [liveOnly, period, provider, query, sort, tt])

  const findExactGame = useCallback(async () => {
    const gameId = game.gameId.trim()
    if (!/^\d{1,16}$/.test(gameId)) {
      setGameError(tt('Enter a numeric AoE4World game id.'))
      return
    }
    if (!/^[a-z][a-z0-9_]{1,63}$/.test(game.civilization.trim())) {
      setGameError(tt('Use a civilization slug such as english or french.'))
      return
    }
    setGameLoading(true)
    setGameError(null)
    try {
      const response = await ipc.findTwitchVod({
        gameId,
        civilization: game.civilization.trim(),
        map: game.map?.trim() || null,
        durationSec: game.durationSec,
      })
      setGameResult(response)
      if (!response.ok) setGameError(response.error.message)
    } catch (error) {
      setGameError(error instanceof Error ? error.message : String(error))
    } finally {
      setGameLoading(false)
    }
  }, [game, tt])

  return (
    <div className="animate-fade-in space-y-5">
      <PageHead
        kicker={tt('Live video tools')}
        title={tt('Twitch Finder')}
        sub={tt(
          'Search current Age of Empires IV videos and channels, or verify the exact VOD associated with one AoE4World game.',
        )}
      />

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-56 flex-1 space-y-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{tt('Search')}</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') void search() }}
                placeholder={tt('Player, channel, build or map…')}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>
            <select value={provider} onChange={(event) => setProvider(event.target.value as Provider)} className="h-9 rounded-md border border-border bg-background px-2 text-sm" aria-label={tt('Provider')}>
              <option value="all">{tt('All providers')}</option>
              <option value="twitch">Twitch</option>
              <option value="youtube">YouTube</option>
            </select>
            <select value={period} onChange={(event) => setPeriod(event.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-sm" aria-label={tt('Date range')}>
              <option value="30">{tt('Last 30 days')}</option>
              <option value="90">{tt('Last 90 days')}</option>
              <option value="0">{tt('Any date')}</option>
            </select>
            <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="h-9 rounded-md border border-border bg-background px-2 text-sm" aria-label={tt('Sort')}>
              <option value="recent">{tt('Most recent')}</option>
              <option value="views">{tt('Most viewed')}</option>
            </select>
            <label className="flex h-9 items-center gap-1.5 px-1 text-xs text-muted-foreground">
              <input type="checkbox" checked={liveOnly} onChange={(event) => setLiveOnly(event.target.checked)} /> {tt('Live only')}
            </label>
            <button type="button" onClick={() => void search()} disabled={searching} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50">
              {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              {searching ? tt('Searching…') : tt('Search')}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {tt('AoE4World results work without provider keys. Twitch and YouTube API keys add direct provider search and metadata.')}
          </p>
          {searchError && <ErrorBox message={searchError} onRetry={() => void search()} />}
          {fetchedAt && !searchError && (
            <div className="text-[11px] text-muted-foreground">{results.length} {tt('results')} · {formatDate(fetchedAt, locale)}</div>
          )}
          {results.length > 0 && <div className="grid gap-2 md:grid-cols-2">
            {results.map((result) => <ResultCard key={`${result.provider}:${result.id}`} result={result} />)}
          </div>}
          {!searching && !searchError && fetchedAt && results.length === 0 && <p className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">{tt('No matching public videos or channels found.')}</p>}
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> {tt('Verify an exact game VOD')}</div>
          <p className="text-xs text-muted-foreground">{tt('This checks AoE4World’s exact game association and never guesses a VOD from a similar match.')}</p>
          <div className="grid gap-2 md:grid-cols-4">
            <label className="space-y-1 md:col-span-1"><span className="text-[11px] text-muted-foreground">{tt('Game id')}</span><input value={game.gameId} onChange={(event) => setGame((previous) => ({ ...previous, gameId: event.target.value }))} placeholder="123456789" className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm" /></label>
            <label className="space-y-1"><span className="text-[11px] text-muted-foreground">{tt('Civilization slug')}</span><input value={game.civilization} onChange={(event) => setGame((previous) => ({ ...previous, civilization: event.target.value }))} placeholder="english" className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm" /></label>
            <label className="space-y-1"><span className="text-[11px] text-muted-foreground">{tt('Map (optional)')}</span><input value={game.map ?? ''} onChange={(event) => setGame((previous) => ({ ...previous, map: event.target.value }))} placeholder="Dry Arabia" className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm" /></label>
            <button type="button" onClick={() => void findExactGame()} disabled={gameLoading} className="mt-5 inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-primary/40 px-3 text-xs text-primary hover:bg-primary/10 disabled:opacity-50">{gameLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}{tt('Verify VOD')}</button>
          </div>
          {gameError && <p className="text-xs text-destructive">{gameError}</p>}
          {gameResult?.ok && <div className="rounded-md border border-win/30 bg-win/5 p-3 text-sm">{gameResult.data.vod ? <><div className="font-medium text-win">{tt('Exact VOD found')}</div><a href={gameResult.data.vod.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">{gameResult.data.vod.url} <ExternalLink className="h-3 w-3" /></a></> : <><div className="font-medium">{tt('No exact VOD association')}</div><a href={twitchVideoFinderUrl({ ...game, gameId: game.gameId.trim() })} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">{tt('Open filtered AoE4World Finder')} <ExternalLink className="h-3 w-3" /></a></>}</div>}
        </CardContent>
      </Card>
    </div>
  )
}

function ResultCard({ result }: { result: OnlineSearchResult }) {
  const { tt, locale } = useI18n()
  return <div className="flex gap-2 rounded-md border border-border/70 p-2 hover:border-primary/60">
    <a href={result.url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 gap-2">
      <div className="h-14 w-24 shrink-0 overflow-hidden rounded bg-secondary">{result.thumbnailUrl && <img src={result.thumbnailUrl} alt="" className="h-full w-full object-cover" />}</div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5"><div className="min-w-0 truncate text-xs font-medium">{result.title}</div><Badge variant={result.kind === 'streamer' ? 'success' : 'secondary'} className="text-[9px] uppercase">{result.kind === 'streamer' ? tt('Streamer') : tt('Video')}</Badge>{result.live && <Badge variant="destructive" className="text-[9px] uppercase">{tt('Live')}</Badge>}</div>
        <div className="truncate text-[11px] text-muted-foreground">{result.channel} · {result.provider}</div>
        <div className="text-[10px] text-muted-foreground">{result.publishedAt ? formatDate(result.publishedAt, locale) : null}{result.viewCount != null ? ` · ${formatCount(result.viewCount)} ${tt('views')}` : ''}{result.durationSec != null ? ` · ${formatDurationShort(result.durationSec)}` : ''}</div>
      </div>
    </a>
    {result.kind === 'video' && <Video className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />}
  </div>
}

function formatDate(value: string, locale: string): string {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? '—' : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
}
