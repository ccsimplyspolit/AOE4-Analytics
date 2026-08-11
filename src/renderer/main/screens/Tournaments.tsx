import { CalendarDays, ExternalLink, Radio, Swords, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@shared/components/ui/card'
import { PageHead } from '../components/PageHead'
import { useI18n } from '../../i18n'

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

export function Tournaments() {
  const { tt } = useI18n()
  return (
    <div className="animate-fade-in space-y-5">
      <PageHead
        kicker={tt('Esports desk')}
        title={tt('Tournaments')}
        sub={tt(
          'Keep the official tournament directory one click away, then use the local Stream Desk for a series overlay and civ draft.',
        )}
      />

      <Card className="border-primary/25 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-sm font-semibold"><Radio className="h-4 w-4 text-primary" /> {tt('Live tournament directory')}</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{tt('Tournament schedules and bracket state are intentionally linked to the live source so dates, results and event pages never become stale local copies.')}</p>
          </div>
          <a href="https://aoe4world.com/esports/tournaments" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">{tt('Open live directory')} <ExternalLink className="h-3.5 w-3.5" /></a>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        {DIRECTORIES.map((entry) => {
          const Icon = entry.icon
          return <a key={entry.href} href={entry.href} target="_blank" rel="noreferrer" className="rounded-lg border border-border/70 bg-card/70 p-4 transition-colors hover:border-primary/50 hover:bg-secondary/40">
            <div className="flex items-start justify-between"><span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /></div>
            <div className="mt-3 text-sm font-semibold">{tt(entry.title)}</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{tt(entry.description)}</p>
          </a>
        })}
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold"><Trophy className="h-4 w-4 text-primary" /> {tt('Local broadcast tools')}</div>
          <p className="text-xs leading-5 text-muted-foreground">{tt('The app does not duplicate a changing tournament calendar. It does provide a local series board, countdown, best-of score, map rotation and civ draft controls for your own broadcast.')}</p>
          <Link to="/stream" className="inline-flex w-fit items-center gap-1.5 rounded-md border border-primary/30 px-3 py-2 text-xs text-primary hover:bg-primary/10">{tt('Open Stream Desk')} <Radio className="h-3.5 w-3.5" /></Link>
        </CardContent>
      </Card>
    </div>
  )
}
