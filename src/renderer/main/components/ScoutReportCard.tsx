import type { ScoutReport } from '@domain/types'
import { Link } from 'react-router-dom'
import { Swords, Map as MapIcon, Info, ShieldCheck, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@shared/components/ui/card'
import { countryFlag, formatPercent, formatRating, formatDurationShort, winRateTone } from '@shared/format'
import { counterPlanForCiv } from '@domain/civUnits'
import { RankBadge } from './RankBadge'
import { FormPips } from './FormPips'
import { useI18n } from '../../i18n'

const CIV_BAR_FILL = { win: 'bg-win/80', loss: 'bg-loss/80', even: 'bg-primary/70' } as const

/**
 * Full scouting card: identity, rank, recent form, civ/map tendencies, counter note.
 * `showProfileLink` adds a "View full profile" button (omit it on the profile page
 * itself, which would link to where you already are).
 */
export function ScoutReportCard({
  report,
  showProfileLink = false,
}: {
  report: ScoutReport
  showProfileLink?: boolean
}) {
  const { tt, gameName } = useI18n()
  const topCiv = report.topCivs[0]
  const topGames = topCiv?.games ?? 1
  const counterPlan = counterPlanForCiv(topCiv?.civ)
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden>
                {countryFlag(report.country)}
              </span>
              <h2 className="truncate text-lg font-semibold">{report.name}</h2>
            </div>
            <div className="mt-1.5">
              <RankBadge rank={report.primary} />
            </div>
          </div>
          <div className="shrink-0 text-right text-xs text-muted-foreground">
            {report.primary?.maxRating != null && (
              <div>{tt('Peak')} {formatRating(report.primary.maxRating)}</div>
            )}
            {report.primary && <div>{report.primary.gamesCount} {tt('games')}</div>}
            {showProfileLink && (
              <Link
                to={`/profile/${report.profileId}`}
                className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-primary/30 px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
              >
                {tt('View full profile')} <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

        {!report.hasData && (
          <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            {tt('Limited public data — this player may have a private match history or few rated games.')}
          </div>
        )}

        <section>
          <h3 className="rts-ledger-head mb-1.5">{tt('Recent form')}</h3>
          <FormPips form={report.recentForm} />
          {report.recentForm.avgDurationSec != null && (
            <div className="mt-1 text-xs text-muted-foreground">
              {tt('Average game')} {formatDurationShort(report.recentForm.avgDurationSec)}
            </div>
          )}
        </section>

        {report.topCivs.length > 0 && (
          <section>
            <h3 className="rts-ledger-head mb-2 flex items-center gap-1.5">
              <Swords className="h-3.5 w-3.5" />
              {tt('Most-played civs')}
            </h3>
            <div className="space-y-1.5">
              {report.topCivs.map((c) => (
                <div key={c.civ} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-sm">{gameName(c.civName)}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-sm bg-secondary">
                    <div
                      className={`h-full rounded-sm ${CIV_BAR_FILL[winRateTone(c.winRate)]}`}
                      style={{ width: `${Math.min(100, (c.games / topGames) * 100)}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                    {c.games}g{c.winRate != null ? ` · ${formatPercent(c.winRate)}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {counterPlan && topCiv && counterPlan.counters.length > 0 && (
          <section>
            <h3 className="rts-ledger-head mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              {tt('How to counter their {civ}').replace('{civ}', gameName(topCiv.civName))}
            </h3>
            <p className="rounded-md border border-win/20 bg-win/5 px-3 py-2 text-sm leading-relaxed">
              {tt('Build')}{' '}
              <span className="font-semibold text-win">
                {counterPlan.counters
                  .slice(0, 2)
                  .map((c) => gameName(c.label))
                  .join(' + ')}
              </span>{' '}
              <span className="text-muted-foreground">
                — {tt('Answers their {units}.').replace(
                  '{units}',
                  counterPlan.keyUnits.map((u) => gameName(u.name)).join(' & '),
                )}
              </span>
            </p>
          </section>
        )}

        {report.topMaps.length > 0 && (
          <section>
            <h3 className="rts-ledger-head mb-2 flex items-center gap-1.5">
              <MapIcon className="h-3.5 w-3.5" />
              {tt('Favourite maps')}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {report.topMaps.map((m) => (
                <span key={m.map} className="rounded-md bg-secondary px-2 py-0.5 text-xs">
                  {m.map} <span className="text-muted-foreground">{m.games}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="rts-ledger-head mb-1.5 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" />
            {tt('What to expect')}
          </h3>
          <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm leading-relaxed">
            {localizedScoutNote(report, tt, gameName)}
          </p>
        </section>
      </CardContent>
    </Card>
  )
}

function localizedScoutNote(
  report: ScoutReport,
  tt: (value: string) => string,
  gameName: (value: string) => string,
): string {
  const { topCivs, recentForm } = report
  if (topCivs.length === 0) return tt('No recent public games to scout. Play your standard opening and scout in-game to read their plan.')

  const main = topCivs[0]!
  const win = main.winRate != null
    ? tt(', {rate}% win').replace('{rate}', String(main.winRate))
    : ''
  const parts = [
    tt('Mostly plays {civ} ({games} of last {total}{win}).')
      .replace('{civ}', gameName(main.civName))
      .replace('{games}', String(main.games))
      .replace('{total}', String(recentForm.games))
      .replace('{win}', win),
  ]
  if (topCivs.length > 1) {
    parts.push(
      tt('Also seen on: {civs}.').replace(
        '{civs}',
        topCivs.slice(1).map((civ) => gameName(civ.civName)).join(', '),
      ),
    )
  }
  if (recentForm.streak <= -3) parts.push(tt('On a losing streak — may play it safe or tilt.'))
  else if (recentForm.streak >= 3) parts.push(tt('On a win streak — likely confident and aggressive.'))
  parts.push(tt('Scout early, deny their key economy, and prepare a counter to their main composition. (Civ-specific counters arrive in Phase 2.)'))
  return parts.join(' ')
}
