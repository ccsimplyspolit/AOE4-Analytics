import { useState } from 'react'
import { ExternalLink, Network, Search } from 'lucide-react'
import type { BeastyNumberData } from '@ipc/contract'
import { ipc } from '@shared/ipc'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { useI18n } from '../../../i18n'

export function BeastyNumber() {
  const { tt } = useI18n()
  const [profileId, setProfileId] = useState('')
  const [data, setData] = useState<BeastyNumberData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lookup = async () => {
    const id = Number(profileId.trim())
    if (!Number.isSafeInteger(id) || id <= 0) {
      setError(tt('Enter a valid AoE4World profile id.'))
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
            <input value={profileId} onChange={(event) => setProfileId(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void lookup() }} className="h-9 min-w-64 flex-1 rounded-md border border-border bg-background px-3 text-sm" placeholder={tt('AoE4World profile id')} inputMode="numeric" />
            <button type="button" onClick={() => void lookup()} disabled={loading} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"><Search className="h-3.5 w-3.5" /> {loading ? tt('Loading…') : tt('Calculate')}</button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>
      {data && <Card><CardContent className="space-y-4 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="rts-ledger-head">{tt('Result')}</div><div className="mt-1 text-4xl font-bold tabular-nums text-primary">{data.number}</div></div><Badge variant="outline">{tt('Profile')} #{data.profileId}</Badge></div><div className="border-t border-border pt-3"><div className="rts-section-title">{tt('Victory path to Beasty')}</div><div className="mt-3 flex flex-wrap items-center gap-2">{data.path.map((player, index) => <span key={`${player.profileId}-${index}`} className="inline-flex items-center gap-2"><a href={`https://aoe4world.com/players/${player.profileId}`} target="_blank" rel="noreferrer" className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:border-primary/60 hover:bg-primary/10">{player.name ?? `#${player.profileId}`}</a>{index < data.path.length - 1 && <span className="text-primary">→</span>}</span>)}</div></div><p className="text-[11px] text-muted-foreground">{tt('The graph is refreshed by the source site; this result is a snapshot from the current public dataset.')}</p></CardContent></Card>}
    </div>
  )
}
