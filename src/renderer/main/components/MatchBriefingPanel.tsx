import { Swords, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { MatchBriefing } from '@domain/matchBriefing'
import { civDisplayName } from '@domain/civ'
import { Card, CardContent } from '@shared/components/ui/card'
import { CreatorVideoLessonPanel } from './CreatorVideoLessonPanel'
import { useI18n } from '../../i18n'

export function MatchBriefingPanel({
  briefing,
  hideRoles = false,
}: {
  briefing: MatchBriefing
  hideRoles?: boolean
}) {
  const { tt, gameName } = useI18n()
  const videoPicks = [
    ...briefing.videos.forPlayer,
    ...briefing.videos.forOpponent,
    ...briefing.videos.sharedFundamentals,
  ]

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/[0.03]">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Swords className="h-4 w-4 text-primary" />
              {briefing.phase === 'upcoming' ? tt('Upcoming match briefing') : tt('Match briefing')}
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {briefing.format}
              {briefing.map ? ` · ${gameName(briefing.map)}` : ''}
            </span>
          </div>
          <p className="text-sm font-medium">{tt(briefing.headline)}</p>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">{tt('Focus')}</dt>
              <dd>{tt(briefing.focusPlayer)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tt('Deny')}</dt>
              <dd>{tt(briefing.deny)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tt('Attack window')}</dt>
              <dd>{tt(briefing.attackWindow)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tt('Composition')}</dt>
              <dd>{tt(briefing.compositionHint)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tt('Lose condition')}</dt>
              <dd>{tt(briefing.loseCondition)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tt('If Plan A fails')}</dt>
              <dd>{tt(briefing.planB)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">{tt('Win condition')}</dt>
              <dd className="font-medium">{tt(briefing.winCondition)}</dd>
            </div>
            <div className="sm:col-span-2 rounded border border-primary/20 bg-primary/5 px-2 py-1.5 font-medium">
              {tt('Match rule')}: {tt(briefing.matchRule)}
            </div>
          </dl>

          {briefing.roles.length > 0 && !hideRoles && (
            <div className="grid gap-2 sm:grid-cols-2">
              {briefing.roles.map((role) => (
                <div key={`${role.name}-${role.civ}`} className="rounded border border-border/60 px-2.5 py-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Target className="h-3 w-3 text-primary" />
                    {role.profileId > 0 ? (
                      <Link to={`/profile/${role.profileId}`} className="hover:text-primary hover:underline">
                        {role.name}
                      </Link>
                    ) : (
                      role.name
                    )}
                    <span className="text-muted-foreground">
                      · {role.civ ? gameName(civDisplayName(role.civ)) : tt('Unknown')}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-primary">{tt(role.role)}</div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{tt(role.note)}</p>
                </div>
              ))}
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {tt('If you see…')}
            </h4>
            <ul className="mt-1 space-y-1 text-xs">
              {briefing.decisionTree.map((row) => (
                <li key={row.ifSeen}>
                  <span className="font-medium">{tt(row.ifSeen)}</span>
                  <span className="text-muted-foreground"> → {tt(row.thenDo)}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
      <CreatorVideoLessonPanel picks={videoPicks} title={tt('Valdemar & Beastyqt videos for this match')} />
    </div>
  )
}
