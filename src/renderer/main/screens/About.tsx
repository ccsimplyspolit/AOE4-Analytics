import type { LucideIcon } from 'lucide-react'
import { BookOpen, Bug, Code2, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card'
import { useAppInfo } from '../queries/useAppInfo'
import { PageHead } from '../components/PageHead'
import { useI18n } from '../../i18n'

export function About() {
  const { tt } = useI18n()
  const { data, isError } = useAppInfo()

  return (
    <div className="animate-fade-in space-y-6">
      <PageHead
        kicker="Colophon"
        title="About RTSLytics"
        sub={
          isError ? tt('Version unknown') : `${tt('Version')} ${data?.version ?? '…'} · ${data?.platform ?? '…'}`
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <ProjectLink
          href="https://github.com/ccsimplyspolit/AOE4-Analytics"
          icon={Code2}
          title={tt('Source code')}
          detail={tt('Browse releases and project history')}
        />
        <ProjectLink
          href="https://github.com/ccsimplyspolit/AOE4-Analytics/blob/main/README.md"
          icon={BookOpen}
          title={tt('Documentation')}
          detail={tt('Setup, privacy, and local-data details')}
        />
        <ProjectLink
          href="https://github.com/ccsimplyspolit/AOE4-Analytics/issues/new"
          icon={Bug}
          title={tt('Report an issue')}
          detail={tt('Share a bug or feature request')}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tt('Not affiliated')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>{tt('RTSLytics is an Age of Empires IV companion app. It is not affiliated with, endorsed by, or sponsored by Microsoft or Relic Entertainment.')}</p>
          <p>{tt('Age of Empires IV and all related assets are © Microsoft, used under Microsoft’s Game Content Usage Rules.')}</p>
          <p>
            {tt('RTSLytics reads only public data and your own local game files (entirely on-device, never uploaded — see the README’s local data disclaimer). It')}{' '}
            <strong className="text-foreground">{tt('Never reads game memory')}</strong> {tt('or modifies the game.')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tt('Data sources')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-inside list-disc space-y-1">
            <li>{tt('AoE4World API — profiles, match history, match detection, civ/matchup stats')}</li>
            <li>{tt('aoe4world/data — vendored static game data (units, buildings, tech)')}</li>
            <li>{tt('CraftySalamander RTS_Overlay — build-order JSON format')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function ProjectLink({
  href,
  icon: Icon,
  title,
  detail,
}: {
  href: string
  icon: LucideIcon
  title: string
  detail: string
}) {
  const { tt } = useI18n()
  return (
    <a href={href} target="_blank" rel="noreferrer" className="group block">
      <Card className="h-full transition-colors group-hover:border-primary/45 group-hover:bg-secondary/50">
        <CardContent className="flex items-start gap-3 p-4">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-sm font-semibold">
              {tt(title)}
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {tt(detail)}
            </span>
          </span>
        </CardContent>
      </Card>
    </a>
  )
}
