import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  FileText,
  Plus,
  Save,
  Search,
  Trash2,
  FileUp,
  WandSparkles,
  Monitor,
} from 'lucide-react'
import { BUNDLED_BUILD_ORDERS } from '@data/buildOrders'
import { CIV_SLUGS } from '@data/civs'
import { EXPLORER_RECORDS, type ExplorerRecord } from '@data/explorerData'
import { unitsForCiv, type VendoredUnit } from '@data/gameData'
import { civDisplayName } from '@domain/civ'
import {
  estimateBuildOrderTimes,
  evaluateBuildTiming,
  shiftBuildOrderTimes,
} from '@domain/buildOrderTiming'
import {
  parseBuildOrderDisplayNote,
  type BuildOrderDisplayNotePart,
} from '@domain/buildOrderNotes'
import {
  parseOverlayBuild,
  parseSimpleBuildOrder,
  serializeOverlayBuild,
  serializeSimpleBuildOrder,
} from '@domain/overlayBuild'
import type { BuildOrder, BuildStep } from '@domain/buildOrderSchema'
import { validateBuildOrderFeasibility } from '@domain/buildOrderValidation'
import { fuzzyMatches } from '@domain/fuzzySearch'
import { resolveAoE4Icon } from '@data/vendor/aoe4-icons/manifest'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { cn } from '@shared/lib/utils'
import { ipc } from '@shared/ipc'
import { useI18n } from '../../i18n'

const DRAFT_KEY = 'rtslytics.tincture.build-editor.v1'
const QUICK_TOKENS = [
  ['@resource/resource_food.webp@', 'Food'],
  ['@resource/resource_wood.webp@', 'Wood'],
  ['@resource/resource_gold.webp@', 'Gold'],
  ['@resource/resource_stone.webp@', 'Stone'],
  ['@buildings/house@', 'House'],
  ['@buildings/town-center@', 'Town Center'],
  ['@technologies/wheelbarrow@', 'Wheelbarrow'],
] as const

type ResourceKey = 'food' | 'wood' | 'gold' | 'stone' | 'builder'

const EDITOR_INPUT =
  'h-9 w-full rounded-md border border-border/80 bg-background/80 px-3 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/70 focus:ring-2 focus:ring-primary/15'
const EDITOR_BUTTON =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border/80 bg-background/70 px-3 text-xs font-medium text-foreground shadow-sm transition-colors hover:border-primary/60 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-35'
const ICON_BUTTON =
  'inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-background/60 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-30'

function blankStep(index = 0): BuildStep {
  return {
    time: index === 0 ? '0:00' : '',
    population_count: index === 0 ? 6 : 0,
    villager_count: index === 0 ? 6 : 0,
    age: 1,
    resources: { food: index === 0 ? 6 : 0, wood: 0, gold: 0, stone: 0, builder: 0 },
    notes: index === 0 ? ['Start'] : [''],
  }
}

function blankBuild(): BuildOrder {
  return {
    schemaVersion: 1,
    name: 'New build',
    civilization: 'English',
    author: 'RTSLytics',
    origin: 'house',
    updatedAt: new Date().toISOString(),
    build_order: [blankStep()],
  }
}

function numberValue(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function encodeDraft(build: BuildOrder): string {
  const bytes = new TextEncoder().encode(JSON.stringify(build))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeDraft(value: string): BuildOrder | null {
  try {
    const padded =
      value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const result = parseOverlayBuild(new TextDecoder().decode(bytes))
    return result.ok ? result.value : null
  } catch {
    return null
  }
}

function downloadBuild(build: BuildOrder): void {
  const blob = new Blob([serializeOverlayBuild(build)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${build.name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-') || 'build'}.overlay.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

function downloadBuildText(build: BuildOrder): void {
  const blob = new Blob([serializeSimpleBuildOrder(build)], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${build.name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-') || 'build'}.txt`
  anchor.click()
  URL.revokeObjectURL(url)
}

function iconForUnit(unit: VendoredUnit): string | null {
  return unit.icon ? resolveAoE4Icon(unit.icon) : resolveAoE4Icon(`units/${unit.id}`)
}

function iconForRecord(record: ExplorerRecord): string | null {
  const category = record.kind === 'building' ? 'buildings' : 'technologies'
  return record.icon
    ? resolveAoE4Icon(record.icon)
    : resolveAoE4Icon(`${category}/${record.id}`)
}

function NotePreview({ note, tt }: { note: string; tt: (value: string) => string }) {
  const parts = parseBuildOrderDisplayNote(note)
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md border border-primary/15 bg-primary/[0.04] px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-primary/80">
        {tt('Preview')}
      </span>
      {parts.map((part: BuildOrderDisplayNotePart, index) => {
        if (part.type === 'text') return <span key={index}>{part.text}</span>
        const icon = resolveAoE4Icon(part.path)
        const label =
          part.type === 'icon'
            ? part.label
            : part.path
                .split('/')
                .pop()
                ?.replace(/\.[^.]+$/, '')
                .replace(/[-_]/g, ' ') ?? 'Icon'
        return icon ? (
          <span key={index} className="inline-flex items-center gap-1 rounded bg-background/55 px-1 py-0.5" title={tt(label)}>
            <img src={icon} alt={tt(label)} className="h-4 w-4 object-contain" />
            <span className="text-[10px] text-foreground/80">{tt(label)}</span>
          </span>
        ) : (
          <span key={index} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-primary" title={tt(label)}>
            {tt(label)}
          </span>
        )
      })}
    </div>
  )
}

export function BuildEditor() {
  const { tt, gameName } = useI18n()
  const [build, setBuild] = useState<BuildOrder>(() => {
    if (typeof window === 'undefined') return blankBuild()
    const fromUrl = new URLSearchParams(window.location.search).get('draft')
    const fromUrlBuild = fromUrl ? decodeDraft(fromUrl) : null
    if (fromUrlBuild) return fromUrlBuild
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY)
      const parsed = saved ? parseOverlayBuild(saved) : null
      if (parsed?.ok) return parsed.value
    } catch {
      // Start with a clean draft when local storage is unavailable or corrupt.
    }
    return blankBuild()
  })
  const [selectedStep, setSelectedStep] = useState(0)
  const [iconQuery, setIconQuery] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [timingOffset, setTimingOffset] = useState('0')
  const importInputRef = useRef<HTMLInputElement>(null)

  const civSlug = useMemo(() => {
    const label = Array.isArray(build.civilization) ? build.civilization[0] : build.civilization
    return (
      CIV_SLUGS.find(
        (slug) => civDisplayName(slug).toLocaleLowerCase() === label?.toLocaleLowerCase(),
      ) ?? 'english'
    )
  }, [build.civilization])
  const availableUnits = useMemo(() => {
    const query = iconQuery.trim().toLocaleLowerCase()
    return unitsForCiv(civSlug)
      .filter((unit) => !query || fuzzyMatches(`${unit.name} ${unit.id}`, query))
      .slice(0, 48)
  }, [civSlug, iconQuery])
  const availableRecords = useMemo(() => {
    const query = iconQuery.trim().toLocaleLowerCase()
    return EXPLORER_RECORDS.filter((record) =>
      query ? fuzzyMatches(`${record.name} ${record.id}`, query) : true,
    ).slice(0, 48)
  }, [iconQuery])
  const validation = useMemo(() => {
    const units = unitsForCiv(civSlug).map((unit) => ({
      id: unit.id,
      name: unit.name,
      minAge: unit.minAge,
      costs: unit.costs
        ? {
            food: unit.costs.food,
            wood: unit.costs.wood,
            gold: unit.costs.gold,
            stone: unit.costs.stone,
          }
        : null,
    }))
    return validateBuildOrderFeasibility(build, { units })
  }, [build, civSlug])
  const timing = useMemo(() => evaluateBuildTiming(build), [build])

  useEffect(() => {
    setSelectedStep((current) => Math.min(current, Math.max(0, build.build_order.length - 1)))
  }, [build.build_order.length])

  const updateBuild = (patch: Partial<BuildOrder>) => {
    setBuild((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }))
    setStatus(null)
  }

  const updateStep = (index: number, patch: Partial<BuildStep>) => {
    setBuild((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      build_order: current.build_order.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...patch } : step,
      ),
    }))
    setStatus(null)
  }

  const updateResource = (index: number, key: ResourceKey, value: string) => {
    const step = build.build_order[index]
    if (!step) return
    updateStep(index, { resources: { ...step.resources, [key]: numberValue(value) } })
  }

  const addStep = (duplicate = false) => {
    const source = build.build_order[selectedStep] ?? blankStep(build.build_order.length)
    const next = duplicate
      ? { ...source, notes: [...source.notes], resources: { ...source.resources } }
      : blankStep(build.build_order.length)
    setBuild((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      build_order: [
        ...current.build_order.slice(0, selectedStep + 1),
        next,
        ...current.build_order.slice(selectedStep + 1),
      ],
    }))
    setSelectedStep(selectedStep + 1)
  }

  const removeStep = (index: number) => {
    if (build.build_order.length <= 1) return
    setBuild((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      build_order: current.build_order.filter((_, stepIndex) => stepIndex !== index),
    }))
    setSelectedStep(Math.max(0, Math.min(selectedStep, build.build_order.length - 2)))
  }

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= build.build_order.length) return
    setBuild((current) => {
      const steps = [...current.build_order]
      const [item] = steps.splice(index, 1)
      if (!item) return current
      steps.splice(target, 0, item)
      return { ...current, updatedAt: new Date().toISOString(), build_order: steps }
    })
    setSelectedStep(target)
  }

  const appendToken = (token: string) => {
    const step = build.build_order[selectedStep]
    if (!step) return
    const notes = [...step.notes]
    const noteIndex = Math.max(0, notes.length - 1)
    notes[noteIndex] = `${notes[noteIndex] ?? ''}${notes[noteIndex] ? ' ' : ''}${token}`
    updateStep(selectedStep, { notes })
  }

  const saveDraft = () => {
    window.localStorage.setItem(DRAFT_KEY, serializeOverlayBuild(build))
    setSavedAt(new Date().toLocaleTimeString())
    setStatus(tt('Draft saved locally'))
  }

  const addToOverlayLibrary = async () => {
    // Read the authoritative main-process settings each time so adding a
    // second build in the same editor session never overwrites the first one
    // while the React query cache is still stale.
    const current = await ipc.getSettings()
    const customBuildOrders = [
      ...current.overlay.customBuildOrders.filter((item) => item.name !== build.name),
      structuredClone(build),
    ]
    await ipc.updateSettings({
      overlay: {
        customBuildOrders,
      },
    })
    await ipc.applyOverlaySettings()
    setStatus(tt('Added to overlay library'))
  }

  const importBuildFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const text = await file.text()
      const jsonResult = parseOverlayBuild(text)
      const result = jsonResult.ok
        ? jsonResult
        : parseSimpleBuildOrder(text, file.name.replace(/\.[^.]+$/, ''))
      if (!result.ok) {
        setStatus(`${tt('Import rejected')}: ${result.errors.join('; ')}`)
        return
      }
      setBuild(result.value)
      setSelectedStep(0)
      setStatus(tt('Build imported'))
    } catch {
      setStatus(tt('Import rejected'))
    }
  }

  const copyShareLink = async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', 'editor')
    url.searchParams.set('draft', encodeDraft(build))
    await navigator.clipboard.writeText(url.toString())
    setStatus(tt('Share link copied'))
  }

  const applyTimingOffset = () => {
    const offset = Number(timingOffset)
    if (!Number.isFinite(offset) || offset === 0) {
      setStatus(tt('Enter a non-zero timing offset first'))
      return
    }
    setBuild((current) => shiftBuildOrderTimes(current, offset))
    setStatus(tt('Timing offset applied'))
  }

  const estimateTiming = () => {
    setBuild((current) => estimateBuildOrderTimes(current))
    setStatus(tt('Timing estimated; validate against a replay'))
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-primary/25 bg-card/95">
        <div className="h-1 bg-gradient-to-r from-primary via-primary/40 to-transparent" />
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                  {tt('AoE4 build workshop')}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px]',
                    validation.ok ? 'border-win/40 text-win' : 'border-amber-500/40 text-amber-200',
                  )}
                >
                  {validation.ok
                    ? tt('Structurally feasible')
                    : `${validation.errors.length} ${tt('errors')}`}
                </Badge>
              </div>
              <div className="rts-section-title text-lg">{tt('Build Builder')}</div>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                {tt(
                  'Create, validate and export an AoE4 build order with the same schema used by the overlay.',
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 xl:max-w-[34rem] xl:justify-end">
              <select
                className="control-select min-w-56 flex-1 text-xs sm:flex-none"
                value=""
                onChange={(event) => {
                  const chosen = BUNDLED_BUILD_ORDERS.find(
                    (item) => item.name === event.target.value,
                  )
                  if (chosen) setBuild(structuredClone(chosen))
                  event.currentTarget.value = ''
                }}
                aria-label={tt('Load from archive')}
              >
                <option value="">{tt('Load from archive')}</option>
                {BUNDLED_BUILD_ORDERS.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
              <input
                ref={importInputRef}
                type="file"
                accept=".json,.overlay.json,.txt,application/json,text/plain"
                className="hidden"
                onChange={(event) => {
                  void importBuildFile(event.target.files?.[0])
                  event.currentTarget.value = ''
                }}
              />
              <button
                type="button"
                className={EDITOR_BUTTON}
                onClick={() => importInputRef.current?.click()}
                title={tt('Import .overlay.json or .txt')}
              >
                <FileUp className="h-3.5 w-3.5" /> {tt('Import')}
              </button>
              <button
                type="button"
                className={EDITOR_BUTTON}
                onClick={() => setBuild(blankBuild())}
              >
                <Plus className="h-3.5 w-3.5" /> {tt('New')}
              </button>
              <button
                type="button"
                className={cn(EDITOR_BUTTON, 'border-primary/35 bg-primary/10 text-primary')}
                onClick={saveDraft}
              >
                <Save className="h-3.5 w-3.5" /> {tt('Save')}
              </button>
              <button type="button" className={EDITOR_BUTTON} onClick={() => downloadBuild(build)}>
                <Download className="h-3.5 w-3.5" /> JSON
              </button>
              <button
                type="button"
                className={EDITOR_BUTTON}
                onClick={() => downloadBuildText(build)}
                title={tt('Export a compact plain-text build for classic RTS overlays')}
              >
                <FileText className="h-3.5 w-3.5" /> TXT
              </button>
              <button type="button" className={EDITOR_BUTTON} onClick={() => void copyShareLink()}>
                <Copy className="h-3.5 w-3.5" /> {tt('Share')}
              </button>
              <button
                type="button"
                className={cn(EDITOR_BUTTON, 'border-primary/35 bg-primary/10 text-primary')}
                onClick={() => void addToOverlayLibrary()}
                title={tt('Use this build in the in-game overlay')}
              >
                <Monitor className="h-3.5 w-3.5" /> {tt('Use in overlay')}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/35 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="rts-ledger-head">{tt('Build details')}</div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {tt('Name, matchup context and the plan behind this build.')}
                </p>
              </div>
              <span className="hidden text-[11px] text-muted-foreground sm:inline">
                {build.build_order.length} {tt('steps')}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1.5 xl:col-span-2">
                <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {tt('Build name')}
                </span>
                <input
                  className={EDITOR_INPUT}
                  value={build.name}
                  onChange={(event) => updateBuild({ name: event.target.value })}
                />
              </label>
              <label className="space-y-1.5">
                <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {tt('Civilization')}
                </span>
                <select
                  className={cn('control-select', 'h-9')}
                  value={civSlug}
                  onChange={(event) =>
                    updateBuild({ civilization: civDisplayName(event.target.value) })
                  }
                >
                  {CIV_SLUGS.map((slug) => (
                    <option key={slug} value={slug}>
                      {gameName(civDisplayName(slug))}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {tt('Author')}
                </span>
                <input
                  className={EDITOR_INPUT}
                  value={build.author ?? ''}
                  onChange={(event) => updateBuild({ author: event.target.value })}
                />
              </label>
              <label className="space-y-1.5">
                <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {tt('Opponent civilization')}
                </span>
                <select
                  className={cn('control-select', 'h-9')}
                  value={
                    Array.isArray(build.opponentCivilization)
                      ? (build.opponentCivilization[0] ?? '')
                      : (build.opponentCivilization ?? '')
                  }
                  onChange={(event) =>
                    updateBuild({ opponentCivilization: event.target.value || null })
                  }
                >
                  <option value="">{tt('Any / unspecified')}</option>
                  {CIV_SLUGS.map((slug) => (
                    <option key={slug} value={civDisplayName(slug)}>
                      {gameName(civDisplayName(slug))}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {tt('Map')}
                </span>
                <input
                  className={EDITOR_INPUT}
                  value={build.map ?? ''}
                  placeholder={tt('Dry Arabia')}
                  onChange={(event) => updateBuild({ map: event.target.value })}
                />
              </label>
              <label className="space-y-1.5 md:col-span-2 xl:col-span-3">
                <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {tt('Strategy / win condition')}
                </span>
                <input
                  className={EDITOR_INPUT}
                  value={build.strategy ?? ''}
                  placeholder={tt('Fast Castle · pressure · trade')}
                  onChange={(event) => updateBuild({ strategy: event.target.value })}
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="text-muted-foreground">
                {build.build_order.length} {tt('steps')}
              </span>
              {savedAt && (
                <span className="text-muted-foreground">
                  · {tt('saved')} {savedAt}
                </span>
              )}
              {status && <span className="text-primary">· {status}</span>}
            </div>
            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/[0.04] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="rts-ledger-head">{tt('Timing evaluation')}</div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {tt('Schedule coverage and cadence only; this is not live game telemetry.')}
                  </p>
                </div>
                <div className="flex flex-wrap items-end justify-end gap-2">
                  <button type="button" className={EDITOR_BUTTON} onClick={estimateTiming}>
                    <WandSparkles className="h-3.5 w-3.5" /> {tt('Estimate time')}
                  </button>
                  <label className="space-y-1">
                    <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                      {tt('Offset seconds')}
                    </span>
                    <input
                      className={cn(EDITOR_INPUT, 'h-8 w-24 text-xs tabular-nums')}
                      type="number"
                      value={timingOffset}
                      onChange={(event) => setTimingOffset(event.target.value)}
                    />
                  </label>
                  <button type="button" className={EDITOR_BUTTON} onClick={applyTimingOffset}>
                    {tt('Apply offset')}
                  </button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <TimingStat
                  label={tt('Timed')}
                  value={`${timing.timedSteps}/${timing.totalSteps}`}
                />
                <TimingStat
                  label={tt('Duration')}
                  value={timing.durationSec == null ? '—' : formatTiming(timing.durationSec)}
                />
                <TimingStat
                  label={tt('Average gap')}
                  value={timing.averageStepSec == null ? '—' : formatTiming(timing.averageStepSec)}
                />
                <TimingStat
                  label={tt('Villager growth')}
                  value={`${timing.villagerGrowth >= 0 ? '+' : ''}${timing.villagerGrowth}`}
                />
              </div>
              {(timing.malformedSteps > 0 || timing.nonMonotonicSteps > 0) && (
                <p className="mt-2 text-[11px] text-amber-200">
                  {timing.malformedSteps > 0 &&
                    `${timing.malformedSteps} ${tt('malformed time values')}. `}
                  {timing.nonMonotonicSteps > 0 &&
                    `${timing.nonMonotonicSteps} ${tt('non-monotonic time transitions')}.`}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(310px,0.75fr)]">
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rts-section-title text-base">{tt('Build steps')}</div>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                    {build.build_order.length}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tt('Select a step, then edit its timing, workers, resources and notes.')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={EDITOR_BUTTON} onClick={() => addStep(false)}>
                  <Plus className="h-3.5 w-3.5" /> {tt('Add step')}
                </button>
                <button type="button" className={EDITOR_BUTTON} onClick={() => addStep(true)}>
                  <WandSparkles className="h-3.5 w-3.5" /> {tt('Duplicate')}
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {build.build_order.map((step, index) => (
                <StepEditor
                  key={`${index}-${step.time}`}
                  step={step}
                  index={index}
                  selected={selectedStep === index}
                  onSelect={() => setSelectedStep(index)}
                  onUpdate={(patch) => updateStep(index, patch)}
                  onResource={(key, value) => updateResource(index, key, value)}
                  onMove={(direction) => moveStep(index, direction)}
                  onRemove={() => removeStep(index)}
                  tt={tt}
                />
              ))}
            </div>
          </CardContent>
        </Card>
        <IconPalette
          civSlug={civSlug}
          gameName={gameName}
          units={availableUnits}
          records={availableRecords}
          query={iconQuery}
          setQuery={setIconQuery}
          onToken={appendToken}
          selectedStep={selectedStep}
          tt={tt}
        />
      </div>
      {validation.issues.length > 0 && (
        <Card className="border-amber-500/25">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="rts-section-title">{tt('Validation feedback')}</div>
              <span className="text-[11px] text-amber-200">
                {validation.issues.length} {tt('issues')}
              </span>
            </div>
            <ul className="grid gap-2 text-xs md:grid-cols-2">
              {validation.issues.slice(0, 8).map((issue) => (
                <li
                  key={`${issue.code}-${issue.stepIndex}-${issue.message}`}
                  className={cn(
                    'rounded-md border border-border/60 bg-background/30 px-3 py-2',
                    issue.severity === 'error' ? 'text-destructive' : 'text-amber-200',
                  )}
                >
                  {tt('Step')} {issue.stepIndex + 1}: {issue.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TimingStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/35 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold tabular-nums text-primary">{value}</div>
    </div>
  )
}

function formatTiming(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

function StepEditor({
  step,
  index,
  selected,
  onSelect,
  onUpdate,
  onResource,
  onMove,
  onRemove,
  tt,
}: {
  step: BuildStep
  index: number
  selected: boolean
  onSelect: () => void
  onUpdate: (patch: Partial<BuildStep>) => void
  onResource: (key: ResourceKey, value: string) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
  tt: (value: string) => string
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border p-4 transition-all',
        selected
          ? 'border-primary/65 bg-primary/[0.07] shadow-[0_0_0_1px_hsl(var(--primary)/0.08)]'
          : 'border-border/70 bg-background/25 hover:border-border',
      )}
      onClick={onSelect}
    >
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-1 transition-colors',
          selected ? 'bg-primary' : 'bg-border/70 group-hover:bg-primary/50',
        )}
      />
      <div className="flex flex-wrap items-start gap-3 pl-2">
        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          <span className="text-[9px] uppercase tracking-wider text-primary/70">{tt('Step')}</span>
          <span className="text-sm font-bold tabular-nums">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
        <label className="min-w-24 flex-1 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {tt('Time')}
          </span>
          <input
            className={cn(EDITOR_INPUT, 'h-10 text-base font-semibold tabular-nums')}
            value={step.time ?? ''}
            placeholder="0:00"
            onChange={(event) => onUpdate({ time: event.target.value })}
            aria-label={tt('Time')}
          />
        </label>
        <div className="flex shrink-0 items-center gap-1.5 pt-5">
          <span className="rounded-full border border-border/70 bg-secondary/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            Age {step.age}
          </span>
          <IconButton title={tt('Move up')} onClick={() => onMove(-1)} disabled={index === 0}>
            <ArrowUp className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton title={tt('Move down')} onClick={() => onMove(1)} disabled={false}>
            <ArrowDown className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton title={tt('Delete step')} onClick={onRemove} disabled={false}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 pl-2 sm:grid-cols-3">
        <NumberInput
          label={tt('Pop')}
          value={step.population_count}
          onChange={(value) => onUpdate({ population_count: value })}
        />
        <NumberInput
          label={tt('Villagers')}
          value={step.villager_count}
          onChange={(value) => onUpdate({ villager_count: value })}
        />
        <label className="space-y-1 text-xs text-muted-foreground">
          <span className="text-[10px] uppercase tracking-wider">{tt('Age')}</span>
          <select
            className="control-select h-9"
            value={step.age}
            onChange={(event) => onUpdate({ age: numberValue(event.target.value) })}
          >
            {[1, 2, 3, 4].map((age) => (
              <option key={age} value={age}>
                {age}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 pl-2 sm:grid-cols-5">
        {(['food', 'wood', 'gold', 'stone', 'builder'] as ResourceKey[]).map((key) => (
          <label
            key={key}
            className="space-y-1.5 rounded-lg border border-border/60 bg-background/30 p-2"
          >
            <span className="block truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {resourceLabel(key, tt)}
            </span>
            <input
              className={cn(EDITOR_INPUT, 'h-8 px-2 text-center tabular-nums')}
              type="number"
              min="0"
              value={step.resources[key] ?? 0}
              onChange={(event) => onResource(key, event.target.value)}
            />
          </label>
        ))}
      </div>
      <label className="mt-4 block space-y-1.5 pl-2">
        <span className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{tt('Notes')}</span>
          <span className="normal-case tracking-normal text-muted-foreground/60">
            {tt('one action per line')}
          </span>
        </span>
        <textarea
          className={cn(EDITOR_INPUT, 'min-h-16 resize-y py-2 text-xs leading-relaxed')}
          value={step.notes.join('\n')}
          onChange={(event) => onUpdate({ notes: event.target.value.split('\n') })}
          placeholder={tt('Notes, one action per line')}
        />
        {step.notes.filter((note) => note.trim()).map((note, noteIndex) => (
          <NotePreview key={`${noteIndex}-${note}`} note={note} tt={tt} />
        ))}
      </label>
    </div>
  )
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="space-y-1 text-xs text-muted-foreground">
      <span className="block text-[10px] uppercase tracking-wider">{label}</span>
      <input
        className={cn(EDITOR_INPUT, 'h-9 tabular-nums')}
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(numberValue(event.target.value))}
      />
    </label>
  )
}

function IconButton({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string
  onClick: () => void
  disabled: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={ICON_BUTTON}
    >
      {children}
    </button>
  )
}

function IconPalette({
  civSlug,
  gameName,
  units,
  records,
  query,
  setQuery,
  onToken,
  selectedStep,
  tt,
}: {
  civSlug: string
  gameName: (value: string) => string
  units: VendoredUnit[]
  records: ExplorerRecord[]
  query: string
  setQuery: (value: string) => void
  onToken: (token: string) => void
  selectedStep: number
  tt: (value: string) => string
}) {
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  return (
    <Card className="h-fit min-w-0 overflow-hidden xl:sticky xl:top-4">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="rts-section-title text-base">{tt('Icon palette')}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {tt('Click an icon to append its token to the selected step.')}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold tabular-nums text-primary">
            #{selectedStep + 1}
          </span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchInputRef}
            className={cn(EDITOR_INPUT, 'pl-9')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tt('Search units, buildings and technologies')}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_TOKENS.map(([token, label]) => (
            <button
              key={token}
              type="button"
              title={token}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border/70 bg-background/45 px-2.5 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/10 hover:text-foreground"
              onClick={() => onToken(token)}
            >
              {resolveAoE4Icon(token) && (
                <img
                  src={resolveAoE4Icon(token) ?? undefined}
                  alt=""
                  className="h-5 w-5 object-contain"
                />
              )}
              <span className="truncate">{tt(label)}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {gameName(civDisplayName(civSlug))}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {units.length + records.length} {tt('icons shown')}
          </span>
        </div>
        <div className="grid max-h-[38rem] grid-cols-3 gap-2 overflow-y-auto pr-1">
          {units.map((unit) => {
            const icon = iconForUnit(unit)
            const token = `@${unit.icon ?? `units/${unit.id}`}@`
            return (
              <button
                key={unit.id}
                type="button"
                title={`${unit.name} · ${token}`}
                className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-border/60 bg-background/25 p-2 text-center text-[10px] text-muted-foreground transition-colors hover:border-primary/70 hover:bg-primary/10 hover:text-foreground"
                onClick={() => onToken(token)}
              >
                {icon ? (
                  <img src={icon} alt="" className="h-10 w-10 object-contain" />
                ) : (
                  <span className="h-10 w-10 rounded bg-secondary" />
                )}
                <span className="line-clamp-2 leading-tight">{unit.name}</span>
              </button>
            )
          })}
          {records.map((record) => {
            const icon = iconForRecord(record)
            const category = record.kind === 'building' ? 'buildings' : 'technologies'
            const token = `@${record.icon ?? `${category}/${record.id}`}@`
            return (
              <button
                key={`${record.kind}-${record.id}`}
                type="button"
                title={`${record.name} · ${token}`}
                className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-border/60 bg-background/25 p-2 text-center text-[10px] text-muted-foreground transition-colors hover:border-primary/70 hover:bg-primary/10 hover:text-foreground"
                onClick={() => onToken(token)}
              >
                {icon ? (
                  <img src={icon} alt="" className="h-10 w-10 object-contain" />
                ) : (
                  <span className="h-10 w-10 rounded bg-secondary" />
                )}
                <span className="line-clamp-2 leading-tight">{record.name}</span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function resourceLabel(key: ResourceKey, tt: (value: string) => string): string {
  if (key === 'builder') return tt('Builder')
  return tt(key.charAt(0).toUpperCase() + key.slice(1))
}
