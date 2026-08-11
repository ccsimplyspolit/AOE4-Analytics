import {
  BarChart3,
  BookOpen,
  Calculator,
  ExternalLink,
  FileVideo,
  FlaskConical,
  Globe2,
  KeyRound,
  Radio,
  Search,
  Sparkles,
  Trophy,
  Wrench,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@shared/components/ui/card'
import { PageHead } from '../components/PageHead'
import { useI18n } from '../../i18n'

type ToolLink = {
  label: string
  description: string
  icon: typeof Wrench
  to?: string
  href?: string
}

const LOCAL_TOOLS: ToolLink[] = [
  {
    label: 'Leaderboards',
    description: 'Ranked 1v1, team queues and Quick Match ladders with country filters.',
    icon: Trophy,
    to: '/leaderboards',
  },
  {
    label: 'Civ meta & matchups',
    description: 'Tier list, win rates, map slices, matchup matrix and counter calculator.',
    icon: Calculator,
    to: '/civ-meta?tab=matchups&ladder=rm_solo',
  },
  {
    label: 'Explorer & video finder',
    description: 'Units, buildings, technologies, patches, local evidence and online VOD search.',
    icon: Search,
    to: '/explorer?tab=videos',
  },
  {
    label: 'Guides & build orders',
    description: 'The 1,000-video catalogue, cached build orders and difficulty progression.',
    icon: BookOpen,
    to: '/guides',
  },
  {
    label: 'Shortcut trainer',
    description: 'Practice camera, selection and production hotkeys in timed drills.',
    icon: KeyRound,
    to: '/guides?tab=trainer',
  },
  {
    label: 'Civ quiz',
    description: 'Identify civilizations and landmark bonuses from the local Explorer dataset.',
    icon: Sparkles,
    to: '/guides?tab=quiz',
  },
  {
    label: 'Tincture coach',
    description: 'Review games, build timing, first causes and replay-derived benchmarks.',
    icon: FlaskConical,
    to: '/tincture',
  },
  {
    label: 'Replay Lab',
    description: 'Browse local and account replays, cache summaries and inspect command streams.',
    icon: FileVideo,
    to: '/replays',
  },
  {
    label: 'Stream Desk',
    description: 'Run a local tournament browser source, civ draft and series scoreboard.',
    icon: Radio,
    to: '/stream',
  },
]

const OFFICIAL_TOOLS: ToolLink[] = [
  {
    label: 'AoE4World Explorer',
    description: 'Open the live public Explorer and its current patch data.',
    icon: Globe2,
    href: 'https://aoe4world.com/explorer',
  },
  {
    label: 'AoE4World Twitch Finder',
    description: 'Search the live match-to-VOD directory maintained by AoE4World.',
    icon: Radio,
    href: 'https://aoe4world.com/tools/twitch-video-finder',
  },
  {
    label: 'AoE4World esports',
    description: 'Current tournament directory, brackets and event match pages.',
    icon: Trophy,
    href: 'https://aoe4world.com/esports/tournaments',
  },
  {
    label: 'AoE4World API & dumps',
    description: 'Endpoint documentation and public data dumps for reproducible research.',
    icon: BarChart3,
    href: 'https://aoe4world.com/api',
  },
]

export function Tools() {
  const { tt } = useI18n()
  return (
    <div className="animate-fade-in space-y-5">
      <PageHead
        kicker={tt('Workbench')}
        title={tt('Tools')}
        sub={tt(
          'One directory for the local analytics surfaces, practice tools and live AoE4World utilities.',
        )}
      />

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
          <Wrench className="h-3.5 w-3.5" /> {tt('RTSLytics tools')}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {LOCAL_TOOLS.map((tool) => (
            <ToolCard key={tool.label} tool={tool} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
          <ExternalLink className="h-3.5 w-3.5" /> {tt('Live AoE4World surfaces')}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {OFFICIAL_TOOLS.map((tool) => (
            <ToolCard key={tool.label} tool={tool} />
          ))}
        </div>
      </section>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-xs text-muted-foreground">
          <span>
            {tt('Local snapshots remain usable offline; live links and live API results update independently.')}
          </span>
          <Link
            to="/twitch-finder"
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 px-3 py-2 text-primary hover:bg-primary/10"
          >
            {tt('Open dedicated Twitch Finder')} <Radio className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

function ToolCard({ tool }: { tool: ToolLink }) {
  const { tt } = useI18n()
  const Icon = tool.icon
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        {tool.href && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <div className="mt-3 text-sm font-semibold">{tt(tool.label)}</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{tt(tool.description)}</p>
    </>
  )
  const className =
    'block min-h-32 rounded-lg border border-border/70 bg-card/70 p-4 transition-colors hover:border-primary/50 hover:bg-secondary/40'
  if (tool.to) return <Link to={tool.to} className={className}>{content}</Link>
  return <a href={tool.href} target="_blank" rel="noreferrer" className={className}>{content}</a>
}
