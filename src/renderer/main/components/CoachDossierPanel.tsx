import { AlertTriangle, CheckCircle2, ChevronDown, Compass, ExternalLink, Swords, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SelfCoachReport } from '@domain/selfCoachReport'
import { pickLocaleText } from '@domain/selfCoachReport'
import type { OpponentCoachReport } from '@domain/opponentCoachReport'
import type { TeamCoachReport } from '@domain/teamCoachReport'
import type { BiText, ChecklistItem, CoachFinding, CoachSection } from '@domain/coachReportCommon'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { cn } from '@shared/lib/utils'
import { useI18n } from '../../i18n'
import { useSectionFold } from '../hooks/useSectionFold'

function Txt({ item }: { item: BiText }) {
  const { locale } = useI18n()
  return <>{pickLocaleText(item, locale)}</>
}

function ConfidenceBadge({ value }: { value: string }) {
  const { tt } = useI18n()
  return (
    <Badge variant="outline" className="text-[10px]">
      {tt(value)}
    </Badge>
  )
}

function FindingBlock({
  item,
  tone,
}: {
  item: CoachFinding
  tone: 'win' | 'loss'
}) {
  const { tt } = useI18n()
  return (
    <div className="rounded-md border border-border/60 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('text-sm font-medium', tone === 'win' ? 'text-win' : 'text-foreground')}>
          <Txt item={item.title} />
        </span>
        <ConfidenceBadge value={item.confidence} />
        <span className="text-[10px] uppercase text-muted-foreground">{item.severity}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        <Txt item={item.why} />
      </p>
      <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">{item.evidence}</p>
      <p className="mt-1 text-xs">
        <span className="font-medium">{tt('Do this instead')}: </span>
        <Txt item={item.instead} />
      </p>
      {item.citations.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {item.citations.map((c) => (
            <li key={`${c.videoId}-${c.timeSec}-${c.url}-${c.label}`}>
              <a
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {c.label}
                {c.timeSec > 0 ? ` @ ${Math.floor(c.timeSec / 60)}:${String(c.timeSec % 60).padStart(2, '0')}` : ''}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SectionBlock({
  title,
  section,
  children,
}: {
  title: string
  section: CoachSection<unknown>
  children?: ReactNode
}) {
  const { tt } = useI18n()
  if (section.status === 'insufficient_data') {
    return (
      <div className="rounded-md border border-dashed border-border/70 px-3 py-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          {tt('Insufficient data')}: <Txt item={section.reason} />
        </p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
        <ConfidenceBadge value={section.confidence} />
      </div>
      {children}
    </div>
  )
}

function sectionTitle(id: string): string {
  const labels: Record<string, string> = {
    sample: 'Match sample',
    styleFingerprint: 'Playstyle fingerprint',
    strengths: 'Strengths',
    weaknesses: 'Weaknesses',
    buildConsistency: 'Build order consistency',
    typicalTimings: 'Typical timings',
    economy: 'Economy',
    idleProduction: 'Idle production',
    composition: 'Unit composition',
    scouting: 'Scouting',
    raids: 'Raids',
    mapControl: 'Map control',
    relics: 'Relics',
    sacredSites: 'Sacred Sites',
    trade: 'Trade',
    siege: 'Siege',
    fights: 'Fights',
    formatSplits: '1v1 / team format split',
    topErrors: 'TOP-5 errors',
    topStrengths: 'TOP-5 strengths',
    unusedOpportunities: 'Unused opportunities',
    stopDoing: 'Stop doing',
    startDoing: 'Start doing',
    bottleneck: 'Main bottleneck',
    mostImportantChange: 'Most important change',
    trainingPlan: 'Training plan',
    progressMetrics: 'Progress metrics',
    decisionTree: 'Decision tree',
    preMatchChecklist: '20-second pre-match block',
    inGameChecklist: 'In-game checklist',
  }
  return labels[id] ?? id
}

function SectionPayload({ data }: { data: unknown }) {
  if (data == null) return null
  if (typeof data === 'string' || typeof data === 'number') {
    return <p className="text-[11px] text-muted-foreground">{String(data)}</p>
  }
  if (Array.isArray(data)) {
    return (
      <ul className="space-y-1 text-[11px] text-muted-foreground">
        {data.slice(0, 6).map((row, i) => (
          <li key={i}>{summarizePayload(row)}</li>
        ))}
      </ul>
    )
  }
  if (typeof data === 'object') {
    const rec = data as Record<string, unknown>
    if ('text' in rec && 'textRu' in rec) {
      return <p className="text-[11px]"><Txt item={rec as unknown as BiText} /></p>
    }
    if ('title' in rec && rec.title && typeof rec.title === 'object' && 'id' in rec) {
      return <FindingBlock item={rec as unknown as CoachFinding} tone="loss" />
    }
    return (
      <p className="text-[11px] text-muted-foreground">
        {Object.entries(rec)
          .slice(0, 8)
          .map(([k, v]) => `${k}: ${summarizePayload(v)}`)
          .join(' · ')}
      </p>
    )
  }
  return null
}

function summarizePayload(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `${value.length} items`
  if (typeof value === 'object' && value && 'text' in value) return String((value as BiText).text)
  if (typeof value === 'object' && value && 'title' in value) {
    const title = (value as { title?: BiText }).title
    return title?.text ?? 'finding'
  }
  return '…'
}

function Checklist({ items }: { items: ChecklistItem[] }) {
  if (items.length === 0) return null
  return (
    <ul className="space-y-1 text-xs">
      {items.map((item) => (
        <li key={item.id} className="leading-snug">
          • <Txt item={item.label} />
        </li>
      ))}
    </ul>
  )
}

export function CoachDossierPanel({
  self,
  opponents = [],
  team = null,
  compact = false,
  foldable = false,
  foldId = 'match-coach-dossier',
}: {
  self: SelfCoachReport
  opponents?: OpponentCoachReport[]
  team?: TeamCoachReport | null
  compact?: boolean
  foldable?: boolean
  foldId?: string
}) {
  const { tt } = useI18n()
  const { collapsed, toggle } = useSectionFold(foldId, foldable)
  const you = self.voice === 'you'
  const title = you
    ? tt('Coach dossier')
    : tt('{name} — coaching dossier').replace('{name}', self.playerName)
  const style =
    self.styleFingerprint.status === 'ok' ? self.styleFingerprint.data : null

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            {foldable ? (
              <button
                type="button"
                onClick={toggle}
                aria-expanded={!collapsed}
                className="flex items-center gap-1.5 text-left text-sm font-semibold hover:text-primary"
              >
                <Compass className="h-4 w-4 text-primary" />
                {title}
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-muted-foreground transition-transform',
                    collapsed && '-rotate-90',
                  )}
                />
              </button>
            ) : (
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <Compass className="h-4 w-4 text-primary" />
                {title}
              </h3>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {self.gameCount} {tt('games')}
              {self.winRate != null ? ` · ${self.winRate}%` : ''} · {tt(self.overallConfidence)}
            </p>
          </div>
          {self.bottleneck && (
            <span className="inline-flex items-center gap-1 rounded bg-loss/15 px-2 py-0.5 text-[11px] text-loss">
              <AlertTriangle className="h-3 w-3" />
              <Txt item={self.bottleneck.title} />
            </span>
          )}
        </div>

        {!(foldable && collapsed) && (
        <>
        {style && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              <Txt item={style.tag} />
            </span>
            {' — '}
            <Txt item={style.rationale} />
          </p>
        )}

        <div className="rounded-md border border-primary/30 bg-primary/[0.04] p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-primary">
            {tt('Most important change')}
          </h4>
          <p className="mt-1 text-sm">
            <Txt item={self.mostImportantChange} />
          </p>
        </div>

        {self.sections.trainingPlan.status === 'ok' &&
          Array.isArray((self.sections.trainingPlan.data as { nextMatches?: BiText[] }).nextMatches) && (
            <div className="rounded-md border border-border/60 p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {tt('Training plan')}
              </h4>
              <ul className="space-y-1.5 text-xs">
                {(self.sections.trainingPlan.data as { nextMatches: BiText[] }).nextMatches.map((line, i) => (
                  <li key={i}>
                    • <Txt item={line} />
                  </li>
                ))}
              </ul>
            </div>
          )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {you ? tt('What you should do differently') : tt('What they should do differently')}
            </h4>
            <div className="space-y-2">
              {self.topErrors.length === 0 && (
                <p className="text-xs text-muted-foreground">{tt('Insufficient data')}</p>
              )}
              {self.topErrors.map((item) => (
                <FindingBlock key={item.id} item={item} tone="loss" />
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {tt('TOP-5 strengths')}
            </h4>
            <div className="space-y-2">
              {self.topStrengths.length === 0 && (
                <p className="text-xs text-muted-foreground">{tt('Insufficient data')}</p>
              )}
              {self.topStrengths.map((item) => (
                <FindingBlock key={item.id} item={item} tone="win" />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border/60 p-3">
            <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {tt('20-second pre-match block')}
            </h4>
            <Checklist items={self.preMatchChecklist} />
          </div>
          {opponents[0] && (
            <div className="rounded-md border border-border/60 p-3">
              <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-loss">
                <Swords className="h-3.5 w-3.5" />
                {tt('How to play this opponent')}
              </h4>
              <ul className="space-y-1 text-xs">
                {opponents[0].punishPlan.map((line, i) => (
                  <li key={i}>
                    • <Txt item={line} />
                  </li>
                ))}
              </ul>
              <div className="mt-2">
                <Checklist items={opponents[0].preMatchEnemyChecklist} />
              </div>
            </div>
          )}
        </div>

        {!compact && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border/60 p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {tt('Decision tree')}
              </h4>
              <ul className="space-y-2 text-xs">
                {self.decisionTree.map((branch) => (
                  <li key={branch.ifId}>
                    <span className="font-medium">
                      <Txt item={branch.ifLabel} />
                    </span>
                    <span className="text-muted-foreground"> → </span>
                    <Txt item={branch.then} />
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-border/60 p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {tt('In-game checklist')}
              </h4>
              <Checklist items={self.inGameChecklist} />
            </div>
          </div>
        )}

        {!compact && self.formatSplits.status === 'ok' && (
          <SectionBlock title={tt('1v1 / team format split')} section={self.formatSplits}>
            <div className="grid gap-2 sm:grid-cols-4">
              {self.formatSplits.status === 'ok' &&
                self.formatSplits.data.map((row) => (
                <div key={row.lane} className="rounded border border-border/50 px-2 py-1.5 text-xs">
                  <div className="font-medium">{row.lane}</div>
                  <div className="tabular-nums text-muted-foreground">
                    {row.games} · {row.winRate != null ? `${row.winRate}%` : '—'}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    <Txt item={row.note} />
                  </p>
                </div>
              ))}
            </div>
          </SectionBlock>
        )}

        {!compact && (
          <details className="rounded-md border border-border/50">
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {tt('Full section map (70-point)')}
            </summary>
            <div className="grid gap-2 border-t border-border/50 p-3 sm:grid-cols-2">
              {Object.entries(self.sections).map(([id, section]) => (
                <SectionBlock key={id} title={tt(sectionTitle(id))} section={section}>
                  {section.status === 'ok' && <SectionPayload data={section.data} />}
                </SectionBlock>
              ))}
            </div>
          </details>
        )}

        {!compact && opponents.slice(1).map((opp) => (
          <div key={opp.profileId} className="rounded-md border border-border/60 p-3">
            <h4 className="text-xs font-semibold">
              {tt('Opponent')}: {opp.playerName}
            </h4>
            <ul className="mt-1 space-y-1 text-xs">
              {opp.punishPlan.map((line, i) => (
                <li key={i}>
                  • <Txt item={line} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        {!compact && team && team.gameCount > 0 && (
          <div className="space-y-2 rounded-md border border-border/60 p-3">
            <h4 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide">
              <Users className="h-3.5 w-3.5" />
              {tt('Allies & team plan')}
            </h4>
            <p className="text-xs">
              <Txt item={team.synergy} />
            </p>
            <p className="text-xs text-muted-foreground">
              <Txt item={team.focusTarget} />
            </p>
            <p className="text-xs text-muted-foreground">
              <Txt item={team.weakLink} />
            </p>
            {team.teamTopErrors.map((item) => (
              <FindingBlock key={item.id} item={item} tone="loss" />
            ))}
            <Checklist items={team.teamChecklist} />
          </div>
        )}
        </>
        )}
      </CardContent>
    </Card>
  )
}

/** Short live-match checklists extracted from already-built reports. */
export function CoachLiveChecklists({
  self,
  opponent,
}: {
  self: SelfCoachReport | null
  opponent: OpponentCoachReport | null
}) {
  const { tt } = useI18n()
  if (!self && !opponent) return null
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {self && (
        <div className="rounded-md border border-primary/30 bg-primary/[0.04] p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary">{tt('Self checklist')}</div>
          <div className="mt-1">
            <Checklist items={self.preMatchChecklist.slice(0, 6)} />
          </div>
        </div>
      )}
      {opponent && (
        <div className="rounded-md border border-loss/30 bg-loss/[0.04] p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-loss">{tt('Enemy checklist')}</div>
          <div className="mt-1">
            <Checklist items={opponent.preMatchEnemyChecklist.slice(0, 6)} />
          </div>
        </div>
      )}
    </div>
  )
}
