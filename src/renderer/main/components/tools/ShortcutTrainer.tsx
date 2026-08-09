import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Check, Keyboard, RotateCcw, Shuffle, X } from 'lucide-react'
import { EXPLORER_RECORDS_BY_KIND } from '@data/explorerData'
import {
  DEFAULT_KEYBOARD_LAYOUT,
  keyboardLayoutFor,
  normalizeShortcut,
  shortcutFromKeyInput,
  shortcutKey,
  type KeyboardLayout,
  type ShortcutDisplayStyle,
  type ShortcutLayoutId,
} from '@domain/shortcutTrainer'
import { Badge } from '@shared/components/ui/badge'
import { Card, CardContent } from '@shared/components/ui/card'
import { useI18n } from '../../../i18n'

const STORAGE_KEY = 'rtslytics.shortcut-trainer.v1'

type TrainerStore = {
  shortcuts: Record<string, string>
  correct: number
  attempts: number
  streak: number
  bestStreak: number
  layout: ShortcutLayoutId
  customLayout: KeyboardLayout
  displayStyle: ShortcutDisplayStyle
  showKeyLabels: boolean
}

type Feedback = { kind: 'correct' | 'wrong' | 'missing'; message: string } | null

const EMPTY_STORE: TrainerStore = {
  shortcuts: {},
  correct: 0,
  attempts: 0,
  streak: 0,
  bestStreak: 0,
  layout: 'QWERTY',
  customLayout: DEFAULT_KEYBOARD_LAYOUT,
  displayStyle: 'SINGLE',
  showKeyLabels: true,
}

function loadStore(): TrainerStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_STORE
    const parsed = JSON.parse(raw) as Partial<TrainerStore>
    const layout =
      parsed.layout === 'QWERTY' ||
      parsed.layout === 'QWERTZ' ||
      parsed.layout === 'AZERTY' ||
      parsed.layout === 'DVORAK' ||
      parsed.layout === 'CUSTOM'
        ? parsed.layout
        : EMPTY_STORE.layout
    const displayStyle =
      parsed.displayStyle === 'SINGLE' ||
      parsed.displayStyle === 'GRID' ||
      parsed.displayStyle === 'NAME'
        ? parsed.displayStyle
        : EMPTY_STORE.displayStyle
    const customLayout = Array.from({ length: 3 }, (_, rowIndex) =>
      Array.from({ length: 4 }, (_, columnIndex) => {
        const value = Array.isArray(parsed.customLayout?.[rowIndex])
          ? parsed.customLayout[rowIndex]?.[columnIndex]
          : null
        return typeof value === 'string' && value.trim()
          ? value.trim().toUpperCase()
          : DEFAULT_KEYBOARD_LAYOUT[rowIndex]![columnIndex]!
      }),
    )
    const shortcuts =
      parsed.shortcuts && typeof parsed.shortcuts === 'object'
        ? Object.fromEntries(
            Object.entries(parsed.shortcuts)
              .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
              .map(([id, value]) => [id, normalizeShortcut(value)]),
          )
        : {}
    return {
      ...EMPTY_STORE,
      ...parsed,
      layout,
      customLayout,
      displayStyle,
      showKeyLabels: parsed.showKeyLabels !== false,
      shortcuts,
      correct: Number.isFinite(parsed.correct) ? Math.max(0, Math.floor(parsed.correct!)) : 0,
      attempts: Number.isFinite(parsed.attempts) ? Math.max(0, Math.floor(parsed.attempts!)) : 0,
      streak: Number.isFinite(parsed.streak) ? Math.max(0, Math.floor(parsed.streak!)) : 0,
      bestStreak: Number.isFinite(parsed.bestStreak)
        ? Math.max(0, Math.floor(parsed.bestStreak!))
        : 0,
    }
  } catch {
    return EMPTY_STORE
  }
}

export function ShortcutTrainer() {
  const { tt } = useI18n()
  const records = useMemo(() => {
    const seen = new Set<string>()
    return EXPLORER_RECORDS_BY_KIND.building.filter((record) => {
      const key = record.name.trim().toLocaleLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [])
  const [store, setStore] = useState<TrainerStore>(loadStore)
  const [currentId, setCurrentId] = useState(() => records[0]?.id ?? '')
  const [shortcut, setShortcut] = useState('')
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [editingCell, setEditingCell] = useState<[number, number] | null>(null)

  const current = records.find((record) => record.id === currentId) ?? records[0]
  const keyboardLayout = keyboardLayoutFor(store.layout, store.customLayout)
  const mappedByKey = useMemo(() => {
    const mapped = new Map<string, (typeof records)[number]>()
    for (const [recordId, value] of Object.entries(store.shortcuts)) {
      const key = shortcutKey(value)
      const record = records.find((candidate) => candidate.id === recordId)
      if (key && record && !mapped.has(key)) mapped.set(key, record)
    }
    return mapped
  }, [records, store.shortcuts])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  }, [store])

  useEffect(() => {
    setShortcut(current ? (store.shortcuts[current.id] ?? '') : '')
    setFeedback(null)
  }, [current, store.shortcuts])

  useEffect(() => {
    if (!editingCell) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setEditingCell(null)
        return
      }
      const value = shortcutFromKeyInput(event)
      if (!value || value.includes('+')) return
      event.preventDefault()
      setStore((previous) => {
        const customLayout = previous.customLayout.map((row) => [...row])
        customLayout[editingCell[0]]![editingCell[1]] = value
        return { ...previous, layout: 'CUSTOM', customLayout }
      })
      setEditingCell(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editingCell])

  const nextPrompt = () => {
    if (records.length < 2) return
    const candidates = records.filter((record) => record.id !== current?.id)
    const next = candidates[Math.floor(Math.random() * candidates.length)]
    if (!next) return
    setCurrentId(next.id)
  }

  const saveShortcut = () => {
    if (!current) return
    const value = normalizeShortcut(shortcut)
    setShortcut(value)
    setStore((previous) => ({
      ...previous,
      shortcuts: value
        ? { ...previous.shortcuts, [current.id]: value }
        : Object.fromEntries(
            Object.entries(previous.shortcuts).filter(([id]) => id !== current.id),
          ),
    }))
    setFeedback({ kind: 'missing', message: tt('Shortcut saved. Press Check when you are ready.') })
  }

  const captureShortcut = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setShortcut('')
      setFeedback(null)
      return
    }
    const value = shortcutFromKeyInput(event)
    if (!value) return
    event.preventDefault()
    setShortcut(value)
    setFeedback(null)
  }

  const changeLayout = (layout: ShortcutLayoutId) => {
    setEditingCell(null)
    setStore((previous) => ({ ...previous, layout }))
  }

  const changeDisplayStyle = (displayStyle: ShortcutDisplayStyle) => {
    setStore((previous) => ({ ...previous, displayStyle }))
  }

  const checkAnswer = () => {
    if (!current) return
    const expected = store.shortcuts[current.id]
    const answer = normalizeShortcut(shortcut)
    if (!expected) {
      setFeedback({ kind: 'missing', message: tt('Save a shortcut for this building first.') })
      return
    }
    const correct = answer === expected
    setStore((previous) => ({
      ...previous,
      attempts: previous.attempts + 1,
      correct: previous.correct + (correct ? 1 : 0),
      streak: correct ? previous.streak + 1 : 0,
      bestStreak: correct
        ? Math.max(previous.bestStreak, previous.streak + 1)
        : previous.bestStreak,
    }))
    setFeedback({
      kind: correct ? 'correct' : 'wrong',
      message: correct
        ? tt('Correct. Keep the streak going.')
        : `${tt('Not quite. Expected')} ${expected}.`,
    })
  }

  const reset = () => {
    setStore(EMPTY_STORE)
    setShortcut('')
    setFeedback(null)
    setEditingCell(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{tt('Aegis-style shortcut practice')}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {tt(
              'Map your own building hotkeys, then recall them under pressure. This trainer is local-only and never reads or injects into the game.',
            )}
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Keyboard className="h-3.5 w-3.5" /> {records.length} {tt('buildings')}
        </Badge>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">{tt('Keyboard profile')}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {tt('Choose the keyboard layout used by your AoE4 profile.')}
              </p>
            </div>
            {editingCell && (
              <span className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">
                {tt('Press one key to rebind the selected cell. Escape cancels.')}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1 text-xs text-muted-foreground">
              <span>{tt('Current layout')}</span>
              <div className="flex flex-wrap gap-1 rounded-md border border-border p-1">
                {(
                  [
                    ['QWERTY', 'QWERTY'],
                    ['QWERTZ', 'QWERTZ'],
                    ['AZERTY', 'AZERTY'],
                    ['DVORAK', 'Dvorak'],
                    ['CUSTOM', tt('Custom')],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => changeLayout(value)}
                    className={`rounded px-2 py-1.5 text-xs transition-colors ${
                      store.layout === value
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-1 text-xs text-muted-foreground">
              <span>{tt('Display options')}</span>
              <div className="flex flex-wrap gap-1 rounded-md border border-border p-1">
                {(
                  [
                    ['SINGLE', tt('Icon + name')],
                    ['GRID', tt('Icon in grid')],
                    ['NAME', tt('Name only')],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => changeDisplayStyle(value)}
                    className={`rounded px-2 py-1.5 text-xs transition-colors ${
                      store.displayStyle === value
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="mb-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={store.showKeyLabels}
                onChange={(event) =>
                  setStore((previous) => ({ ...previous, showKeyLabels: event.target.checked }))
                }
                className="h-4 w-4 accent-primary"
              />
              {tt('Show key labels')}
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card>
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {tt('Prompt')}
              </div>
              <button
                type="button"
                onClick={nextPrompt}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary"
              >
                <Shuffle className="h-3.5 w-3.5" /> {tt('Next')}
              </button>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-5 py-8 text-center">
              <div className="text-2xl font-semibold">
                {current?.name ?? tt('No building data')}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">{current?.id ?? '—'}</div>
              {current?.description && (
                <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {current.description}
                </p>
              )}
            </div>
            {store.displayStyle === 'SINGLE' && current?.icon && (
              <img
                src={current.icon}
                alt=""
                className="mx-auto h-16 w-16 object-contain"
                loading="lazy"
              />
            )}
            <KeyboardMap
              layout={keyboardLayout}
              layoutId={store.layout}
              displayStyle={store.displayStyle}
              showKeyLabels={store.showKeyLabels}
              editingCell={editingCell}
              currentId={current?.id ?? null}
              mappedByKey={mappedByKey}
              onCellClick={(row, column, key) => {
                if (store.layout === 'CUSTOM') {
                  setEditingCell([row, column])
                  return
                }
                setShortcut(key)
                setFeedback(null)
              }}
            />
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                value={shortcut}
                readOnly
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    checkAnswer()
                    return
                  }
                  captureShortcut(event)
                }}
                placeholder={tt('Press a shortcut, for example Ctrl+1')}
                className="h-10 cursor-text rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                aria-label={tt('Shortcut')}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveShortcut}
                  className="h-10 rounded-md border border-border px-3 text-xs hover:bg-secondary"
                >
                  {tt('Save')}
                </button>
                <button
                  type="button"
                  onClick={checkAnswer}
                  className="h-10 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {tt('Check')}
                </button>
              </div>
            </div>
            {feedback && (
              <div
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  feedback.kind === 'correct'
                    ? 'border-win/30 bg-win/10 text-win'
                    : feedback.kind === 'wrong'
                      ? 'border-loss/30 bg-loss/10 text-loss'
                      : 'border-border bg-secondary text-muted-foreground'
                }`}
              >
                {feedback.kind === 'correct' ? (
                  <Check className="h-4 w-4" />
                ) : feedback.kind === 'wrong' ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Keyboard className="h-4 w-4" />
                )}
                {feedback.message}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {tt(
                'Focus the field and press the real shortcut. Escape clears it; Enter checks the answer.',
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {tt('Progress')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label={tt('Accuracy')} value={formatAccuracy(store.correct, store.attempts)} />
              <Stat
                label={tt('Mapped')}
                value={`${Object.keys(store.shortcuts).length}/${records.length}`}
              />
              <Stat label={tt('Streak')} value={String(store.streak)} />
              <Stat label={tt('Best')} value={String(store.bestStreak)} />
            </div>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" /> {tt('Reset trainer')}
            </button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {records
          .filter((record) => store.shortcuts[record.id])
          .slice(0, 18)
          .map((record) => (
            <button
              key={record.id}
              type="button"
              onClick={() => setCurrentId(record.id)}
              className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm hover:border-primary/40 ${
                record.id === current?.id ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <span className="min-w-0 truncate">{record.name}</span>
              <code className="shrink-0 text-xs text-primary">{store.shortcuts[record.id]}</code>
            </button>
          ))}
      </div>
    </div>
  )
}

function KeyboardMap({
  layout,
  layoutId,
  displayStyle,
  showKeyLabels,
  editingCell,
  currentId,
  mappedByKey,
  onCellClick,
}: {
  layout: KeyboardLayout
  layoutId: ShortcutLayoutId
  displayStyle: ShortcutDisplayStyle
  showKeyLabels: boolean
  editingCell: [number, number] | null
  currentId: string | null
  mappedByKey: Map<string, (typeof EXPLORER_RECORDS_BY_KIND.building)[number]>
  onCellClick: (row: number, column: number, key: string) => void
}) {
  const { tt } = useI18n()
  return (
    <div className="rounded-md border border-border/70 bg-background/40 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {tt('Keyboard layout')}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {tt(
            layoutId === 'CUSTOM'
              ? 'Click a key, then press a replacement to rebind the custom grid.'
              : 'Click a key to use it; choose Custom to rebind the grid.',
          )}
        </span>
      </div>
      <div className="mx-auto grid max-w-xl gap-1.5">
        {layout.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-4 gap-1.5">
            {row.map((key, columnIndex) => {
              const mapped = mappedByKey.get(key)
              const editing = editingCell?.[0] === rowIndex && editingCell?.[1] === columnIndex
              return (
                <button
                  key={`${rowIndex}-${columnIndex}`}
                  type="button"
                  onClick={() => onCellClick(rowIndex, columnIndex, key)}
                  title={mapped ? `${key}: ${mapped.name}` : key}
                  className={`flex min-h-14 min-w-0 flex-col items-center justify-center rounded-md border px-2 py-1 text-center transition-colors ${
                    editing
                      ? 'border-primary bg-primary/15 text-primary ring-1 ring-primary'
                      : mapped?.id === currentId
                        ? 'border-primary/60 bg-primary/10 text-foreground'
                        : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {showKeyLabels && (
                    <kbd className="font-mono text-sm font-semibold">{editing ? '…' : key}</kbd>
                  )}
                  {displayStyle === 'GRID' && mapped?.icon && (
                    <img
                      src={mapped.icon}
                      alt=""
                      className="mt-1 h-7 w-7 object-contain"
                      loading="lazy"
                    />
                  )}
                  {displayStyle === 'GRID' && mapped ? (
                    <span className="mt-1 max-w-full truncate text-[10px] leading-tight">
                      {mapped.name}
                    </span>
                  ) : displayStyle === 'NAME' && mapped ? (
                    <span className="mt-1 max-w-full truncate text-[10px] leading-tight">
                      {mapped.name}
                    </span>
                  ) : displayStyle === 'SINGLE' && mapped ? (
                    <span className="mt-1 max-w-full truncate text-[10px] leading-tight text-primary">
                      {mapped.name}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function formatAccuracy(correct: number, attempts: number): string {
  return attempts > 0 ? `${Math.round((correct / attempts) * 100)}%` : '—'
}
