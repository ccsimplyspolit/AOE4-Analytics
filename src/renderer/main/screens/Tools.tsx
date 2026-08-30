import { ExternalLink } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHead } from '../components/PageHead'
import { ScreenTabs } from '../components/ScreenTabs'
import { ClubLab } from '../components/ClubLab'
import { COMMUNITY_SITES } from '@data/communitySites'
import { useI18n } from '../../i18n'

const TOOL_TABS = ['club', 'sites'] as const
type ToolTab = (typeof TOOL_TABS)[number]

export function Tools({ embedded = false }: { embedded?: boolean } = {}) {
  const { tt } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: ToolTab = tabParam === 'sites' ? 'sites' : 'club'
  const setTab = (next: ToolTab) =>
    setSearchParams(
      (prev) => {
        const copy = new URLSearchParams(prev)
        copy.set('tab', next)
        if (next !== 'club') copy.delete('lab')
        return copy
      },
      { replace: true },
    )

  return (
    <div className={embedded ? 'space-y-6' : 'animate-fade-in space-y-6'}>
      <PageHead
        embedded={embedded}
        kicker="Workbench"
        title="Club Lab"
        sub="Unit compare, DPS and army cost from bundled game data, plus community sites."
      />

      <ScreenTabs
        items={[
          { id: 'club', label: 'Calculators' },
          { id: 'sites', label: 'Community sites' },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel={tt('Tools sections')}
      />

      {tab === 'club' && <ClubLab />}

      {tab === 'sites' && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {tt(
              'Studied from aoe4world.com, aoe4guides.com, aoe4.club and the r/aoe4 build-order thread. HTML is not scraped; API or bundled data only.',
            )}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {COMMUNITY_SITES.map((site) => (
              <article key={site.id} className="rounded-lg border border-border/70 bg-card/70 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold">{tt(site.name)}</div>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {site.kind}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{tt(site.description)}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {tt('Open site')} <ExternalLink className="h-3 w-3" />
                  </a>
                  {site.localTo && (
                    <Link to={site.localTo} className="text-muted-foreground hover:text-foreground">
                      {tt('Open in app')}
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
