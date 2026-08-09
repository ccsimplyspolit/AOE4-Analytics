import { useState, type KeyboardEvent } from 'react'
import { ExternalLink, Loader2, Network, Search } from 'lucide-react'
import type { BeastyNumberData, PlayerSearchHit } from '@ipc/contract'
import { ipc } from '@shared/ipc'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { useDebounce } from '@shared/hooks/useDebounce'
import { countryFlag, formatRankLevel, formatRating, rankColor } from '@shared/format'
import { usePlayerSearch } from '../../queries/useProfile'
import { useI18n } from '../../../i18n'

export function BeastyNumber() {
  const { tt } = useI18n()
  const [query, setQuery] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchHit | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [data, setData] = useState<BeastyNumberData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debouncedQuery = useDebounce(query, 300)
  const numericQuery = /^\d+$/.test(debouncedQuery.trim())
  const search = usePlayerSearch(numericQuery ? '' : debouncedQuery)
  const hits = search.data?.ok ? search.data.data : []
  const searchError = search.data && !search.data.ok ? search.data.error.message : null
  const showResults = !selectedPlayer && !numericQuery && debouncedQuery.trim().length >= 3

  const selectPlayer = (hit: PlayerSearchHit) => {
    setSelectedPlayer(hit)
    setQuery(hit.name)
    setActiveIndex(-1)
    setError(null)
  }

  const lookup = async () => {
    const raw = query.trim()
    if (!raw) {
      setError(tt('Enter a player nickname or AoE4World profile id.'))
      return
    }

    let id = Number(raw)
    if (!Number.isSafeInteger(id) || id <= 0) {
      if (selectedPlayer && selectedPlayer.name.trim().toLocaleLowerCase() === raw.toLocaleLowerCase()) {
        id = selectedPlayer.profileId
      } else {
        setLoading(true)
        setError(null)
        try {
          const response = await ipc.searchPlayers(raw)
          if (!response.ok) {
            setError(response.error.message)
            return
          }
          const exact = response.data.find(
            (hit) => hit.name.trim().toLocaleLowerCase() === raw.toLocaleLowerCase(),
          )
          const hit = exact ?? (response.data.length === 1 ? response.data[0] : null)
          if (!hit) {
            setError(
              response.data.length > 1
                ? tt('Choose a player from the search results.')
                : tt('No players found.'),
            )
            return
          }
          selectPlayer(hit)
          id = hit.profileId
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : String(reason))
          return
        } finally {
          setLoading(false)
        }
      }
    }

    if (!Number.isSafeInteger(id) || id <= 0) {
      setError(tt('Enter a player nickname or AoE4World profile id.'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await ipc.getBeastyNumber(id)
      if (result.ok) setData(result.data)
      else setError(result.error.message)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setQuery('')
      setSelectedPlayer(null)
      setActiveIndex(-1)
      return
    }
    if (showResults && hits.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((index) => Math.min(index + 1, hits.length - 1))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((index) => Math.max(index - 1, -1))
        return
      }
      if (event.key === 'Enter' && activeIndex >= 0 && hits[activeIndex]) {
        event.preventDefault()
        selectPlayer(hits[activeIndex]!)
        return
      }
    }
    if (event.key === 'Enter') void lookup()
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/25 bg-primary/5">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold"><Network className="h-4 w-4 text-primary" /> {tt('Beasty Number')}</div>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                {tt('The number of victories separating this player from Beasty, using the official published victory graph.')}
              </p>
            </div>
            <a href="https://beastynumber.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">{tt('Official tool')} <ExternalLink className="h-3.5 w-3.5" /></a>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-64 flex-1">
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setSelectedPlayer(null)
                  setActiveIndex(-1)
                  setData(null)
                  setError(null)
                }}
                onKeyDown={onKeyDown}
                className="h-9 w-full rounded-md border border-border bg-background px-3 pr-9 text-sm"
                placeholder={tt('Enter a player nickname or AoE4World profile id.')}
                spellCheck={false}
              />
              {search.isFetching && showResults && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
              {showResults && (
                <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-md border border-border bg-card shadow-xl">
                  {searchError && <div className="px-3 py-2 text-xs text-destructive">{searchError}</div>}
                  {!searchError && hits.length === 0 && !search.isFetching && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">{tt('No players found.')}</div>
                  )}
                  {hits.slice(0, 8).map((hit, index) => (
                    <button
                      key={hit.profileId}
                      type="button"
                      onClick={() => selectPlayer(hit)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-secondary ${index === activeIndex ? 'bg-secondary' : ''}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span aria-hidden>{countryFlag(hit.country)}</span>
                        <span className="truncate font-medium">{hit.name}</span>
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        <span style={{ color: rankColor(hit.rankLevel) }}>{tt(formatRankLevel(hit.rankLevel))}</span>
                        {' · '}{formatRating(hit.rating)} · #{hit.profileId}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={() => void lookup()} disabled={loading} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"><Search className="h-3.5 w-3.5" /> {loading ? tt('Loading…') : tt('Calculate')}</button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>
      {data && <Card><CardContent className="space-y-4 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="rts-ledger-head">{tt('Result')}</div><div className="mt-1 text-4xl font-bold tabular-nums text-primary">{data.number}</div></div><Badge variant="outline">{tt('Profile')} #{data.profileId}</Badge></div><div className="border-t border-border pt-3"><div className="rts-section-title">{tt('Victory path to Beasty')}</div><div className="mt-3 flex flex-wrap items-center gap-2">{data.path.map((player, index) => <span key={`${player.profileId}-${index}`} className="inline-flex items-center gap-2"><a href={`https://aoe4world.com/players/${player.profileId}`} target="_blank" rel="noreferrer" className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:border-primary/60 hover:bg-primary/10">{player.name ?? `#${player.profileId}`}</a>{index < data.path.length - 1 && <span className="text-primary">→</span>}</span>)}</div></div><p className="text-[11px] text-muted-foreground">{tt('The graph is refreshed by the source site; this result is a snapshot from the current public dataset.')}</p></CardContent></Card>}
    </div>
  )
}
