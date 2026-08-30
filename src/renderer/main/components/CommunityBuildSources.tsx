import { ExternalLink, FileUp, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@shared/components/ui/card'
import { useI18n } from '../../i18n'

type BuildSource = {
  name: string
  url: string
  status: string
  description: string
  synced: boolean
}

const BUILD_SOURCES: BuildSource[] = [
  {
    name: 'AoE4Guides',
    url: 'https://aoe4guides.com/',
    status: 'API + synced catalog',
    description: 'Paste any /builds/<id> link to fetch the live order; the bulk catalog is also refreshed locally.',
    synced: true,
  },
  {
    name: 'AOE4 Builds',
    url: 'https://www.aoeivbuilds.com/',
    status: 'Direct URL import',
    description: 'Paste any /build_orders/<id> link; its text export is normalized into Cellar.',
    synced: true,
  },
  {
    name: 'age4builder',
    url: 'https://age4builder.com/',
    status: 'URL + Overlay JSON',
    description: 'Compressed build.html/view.html links and compatible Overlay JSON exports are accepted.',
    synced: true,
  },
  {
    name: 'AoE4 Club',
    url: 'https://www.aoe4.club/en/tools',
    status: 'Local lab + live site',
    description: 'No public API. Compare, DPS and cost calculators run on bundled aoe4world/data; the live site stays one click away.',
    synced: false,
  },
]

export function CommunityBuildSources() {
  const { tt } = useI18n()

  return (
    <Card className="border-primary/20 bg-card/70">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="rts-section-title">{tt('Community build sources')}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {tt(
                'All three community build sources can be imported into one normalized Cellar schema; provider metadata and patch fields are preserved when available.',
              )}
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <FileUp className="h-3 w-3" /> {tt('Cellar import')}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {BUILD_SOURCES.map((source) => (
            <a
              key={source.name}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="group rounded-md border border-border/80 bg-background/50 p-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-foreground">{source.name}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {source.synced ? (
                  <RefreshCw className="h-3 w-3 text-primary" />
                ) : (
                  <ExternalLink className="h-3 w-3" />
                )}
                {tt(source.status)}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {tt(source.description)}
              </p>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
