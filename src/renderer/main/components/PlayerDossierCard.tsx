import { AlertTriangle, CheckCircle2, Compass, Shield } from 'lucide-react'
import type { DossierFinding, PlayerDossier } from '@domain/playerDossier'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { cn } from '@shared/lib/utils'
import { useI18n } from '../../i18n'

function FindingList({
  title,
  items,
  tone,
}: {
  title: string
  items: DossierFinding[]
  tone: 'win' | 'loss'
}) {
  const { tt } = useI18n()
  if (items.length === 0) return null
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {items.map((item) => (
        <div key={item.id} className="rounded-md border border-border/60 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('text-sm font-medium', tone === 'win' ? 'text-win' : 'text-foreground')}>
              {item.title}
            </span>
            <Badge variant="outline" className="text-[10px]">
              {tt(item.confidence)}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
          <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">{item.evidence}</p>
          <p className="mt-1 text-xs">
            <span className="font-medium">{tt('Do this instead')}: </span>
            {item.action}
          </p>
        </div>
      ))}
    </div>
  )
}

export function PlayerDossierCard({
  dossier,
  playerName,
}: {
  dossier: PlayerDossier
  playerName?: string
}) {
  const { tt } = useI18n()
  if (dossier.gameCount === 0) return null

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Compass className="h-4 w-4 text-primary" />
              {playerName
                ? tt('{name} — coaching dossier').replace('{name}', playerName)
                : tt('Coaching dossier')}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {dossier.styleTag} · {dossier.gameCount} {tt('games')}
              {dossier.winRate != null ? ` · ${dossier.winRate}%` : ''}
            </p>
          </div>
          {dossier.bottleneck && (
            <span className="inline-flex items-center gap-1 rounded bg-loss/15 px-2 py-0.5 text-[11px] text-loss">
              <AlertTriangle className="h-3 w-3" />
              {dossier.bottleneck.title}
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground">{dossier.styleRationale}</p>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {dossier.civPool.map((civ) => (
            <div key={civ.key} className="rounded border border-border/60 px-2.5 py-2 text-xs">
              <div className="font-medium">{civ.label}</div>
              <div className="tabular-nums text-muted-foreground">
                {civ.games}g · {civ.winRate == null ? '—' : `${civ.winRate}%`}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <FindingList title={tt('Strengths')} items={dossier.strengths} tone="win" />
          <FindingList title={tt('Weaknesses')} items={dossier.weaknesses} tone="loss" />
        </div>

        <div className="rounded-md border border-primary/25 bg-primary/[0.04] p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <Shield className="h-3.5 w-3.5" />
            {tt('20-second pre-match block')}
          </h4>
          <dl className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">{tt('Role')}</dt>
              <dd>{dossier.preMatch.role}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tt('First priority')}</dt>
              <dd>{dossier.preMatch.firstPriority}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tt('Scout')}</dt>
              <dd>{dossier.preMatch.scout}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tt('First timing')}</dt>
              <dd>{dossier.preMatch.firstTiming}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">{tt('Match rule')}</dt>
              <dd className="flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                {dossier.preMatch.matchRule}
              </dd>
            </div>
          </dl>
        </div>
      </CardContent>
    </Card>
  )
}
