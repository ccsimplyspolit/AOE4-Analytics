import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CURRENT_META } from '@data/currentMeta'
import { civDisplayName } from '@domain/civ'
import {
  MAP_KIND_LABEL,
  META_QUEUE_LABEL,
  META_QUEUE_ORDER,
  metaSlicesForQueue,
  type MetaQueueId,
} from '@domain/metaByQueueAndMapKind'
import { CURRENT_RANKED_MAP_POOL } from '@domain/rankedMapPool'
import { useI18n } from '../../i18n'
import { ScreenTabs } from './ScreenTabs'

export function MetaBriefingCard({ compact = false }: { compact?: boolean } = {}) {
  const { tt, gameName } = useI18n()
  const [queue, setQueue] = useState<MetaQueueId>('solo')
  const slices = metaSlicesForQueue(queue)
  return (
    <section className="rts-menu-card space-y-3 border border-primary/25 bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="rts-ledger-head">{tt('Live meta')}</div>
          <h2 className="mt-1 text-base font-semibold">{tt(CURRENT_META.headline)}</h2>
        </div>
        <div className="text-right text-[11px] text-muted-foreground">
          <div>
            {tt('Season')} {CURRENT_META.season}
          </div>
          <div>
            {tt('Patch')} {CURRENT_META.patchLabel}
          </div>
          <div>
            {tt('Map pool until')} {CURRENT_META.mapPoolUntil}
          </div>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{tt(CURRENT_META.summary)}</p>

      <div className="space-y-2">
        <div className="rts-ledger-head">{tt('Meta by season, mode and map type')}</div>
        <ScreenTabs
          size="sm"
          ariaLabel={tt('Ranked season')}
          value={String(CURRENT_META.season)}
          onChange={() => undefined}
          items={[
            {
              id: String(CURRENT_META.season),
              label: `${tt('Season')} ${CURRENT_META.season}`,
              translate: false,
            },
          ]}
        />
        <p className="text-[11px] text-muted-foreground">
          {tt(
            'This briefing is Season {n} only. Older ranked seasons are not in the live snapshot.',
          ).replace('{n}', String(CURRENT_META.season))}
        </p>
        <ScreenTabs
          size="sm"
          ariaLabel={tt('Ranked mode')}
          value={queue}
          onChange={setQueue}
          items={META_QUEUE_ORDER.map((id) => ({ id, label: META_QUEUE_LABEL[id] }))}
        />
        {queue !== 'solo' && (
          <p className="text-[11px] text-muted-foreground">
            {tt('Team queues share this map pool. Civilization win rates use the 2v2 sample.')}
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {slices.map((slice) => (
            <div
              key={slice.kind}
              className="rounded-sm border border-border/70 bg-background/40 px-3 py-2"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                {tt(MAP_KIND_LABEL[slice.kind])}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                {slice.maps.map((map) => (
                  <span key={map}>{gameName(map)}</span>
                ))}
              </div>
              <ul className="mt-2 space-y-1.5">
                {slice.civs.map((row) => (
                  <li key={row.civ}>
                    <Link
                      to={`/civ/${row.civ}`}
                      className="flex items-baseline justify-between gap-2 hover:text-primary"
                    >
                      <span className="text-xs font-medium">
                        {gameName(civDisplayName(row.civ))}
                      </span>
                      <span className="tabular-nums text-[11px] text-win">
                        {row.winRate.toFixed(1)}%
                      </span>
                    </Link>
                    <p className="text-[10px] leading-snug text-muted-foreground">{tt(row.note)}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {!compact && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="rts-ledger-head">{tt('Play this')}</div>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-[12px] text-muted-foreground">
                {CURRENT_META.playThis.map((line) => (
                  <li key={line}>{tt(line)}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="rts-ledger-head">{tt('Do not')}</div>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-[12px] text-muted-foreground">
                {CURRENT_META.avoidTrap.map((line) => (
                  <li key={line}>{tt(line)}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {CURRENT_META.solo.zTier.map((row) => (
              <Link
                key={row.civ}
                to={`/civ/${row.civ}`}
                className="rounded-sm border border-border/70 bg-background/40 px-3 py-2 hover:border-primary/40"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{gameName(civDisplayName(row.civ))}</span>
                  <span className="tabular-nums text-win">{row.winRate.toFixed(1)}%</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{tt(row.note)}</p>
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {CURRENT_RANKED_MAP_POOL.solo.map((map) => (
              <span key={map}>{gameName(map)}</span>
            ))}
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {CURRENT_META.communityBuilds.map((build) => (
              <a
                key={build.url}
                href={build.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-sm border border-border/70 bg-background/40 px-3 py-2 hover:border-primary/40"
              >
                <div className="text-sm font-medium">{gameName(civDisplayName(build.civ))}</div>
                <div className="mt-0.5 text-[12px]">{tt(build.name)}</div>
                <p className="mt-1 text-[11px] text-muted-foreground">{tt(build.note)}</p>
              </a>
            ))}
          </div>
        </>
      )}
      <div className="flex flex-wrap gap-3 text-xs">
        <Link to="/civ-meta" className="text-primary hover:underline">
          {tt('Open civ meta')}
        </Link>
        <Link to="/guides" className="text-primary hover:underline">
          {tt('Open build orders')}
        </Link>
        {CURRENT_META.creatorReads.slice(0, 3).map((read) => (
          <a
            key={read.url}
            href={read.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {read.title.replace('Age of Empires 4 ', '')}
            <ExternalLink className="h-3 w-3" />
          </a>
        ))}
      </div>
    </section>
  )
}
