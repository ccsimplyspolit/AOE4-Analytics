import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Keyboard, RotateCcw, Shuffle, X } from 'lucide-react'
import { CIV_CODE_TO_SLUG } from '@data/civs'
import { EXPLORER_RECORDS_BY_KIND } from '@data/explorerData'
import { civDisplayName } from '@domain/civ'
import {
  DEFAULT_KEYBOARD_LAYOUT,
  keyboardLayoutFor,
  shortcutKeysForPositions,
  shortcutFromKeyInput,
  trainerBuildingActions,
  trainerKeyFromInput,
  type KeyboardLayout,
  type ShortcutDisplayStyle,
  type ShortcutLayoutId,
  type TrainerBuildingAction,
  type TrainerBuildingType,
} from '@domain/shortcutTrainer'
import { Badge } from '@shared/components/ui/badge'
import { Card, CardContent } from '@shared/components/ui/card'
import { useI18n } from '../../../i18n'

const STORAGE_KEY = 'rtslytics.shortcut-trainer.v2'
const ROUND_SIZES = [25, 50, 100] as const
const AGES = [1, 2, 3, 4] as const
const BUILDING_TYPES: readonly { value: TrainerBuildingType; label: string }[] = [
  { value: 'economic', label: 'Economy' },
  { value: 'military', label: 'Military' },
  { value: 'fortified', label: 'Fortifications' },
  { value: 'research', label: 'Research' },
]

type TrainerStore = {
  correct: number
  attempts: number
  streak: number
  bestStreak: number
  roundSize: (typeof ROUND_SIZES)[number]
  civilization: string
  ages: number[]
  types: TrainerBuildingType[]
  layout: ShortcutLayoutId
  customLayout: KeyboardLayout
  displayStyle: ShortcutDisplayStyle
  showKeyLabels: boolean
}

type Feedback = { kind: 'correct' | 'wrong' | 'complete'; message: string } | null

const EMPTY_STORE: TrainerStore = {
  correct: 0,
  attempts: 0,
  streak: 0,
  bestStreak: 0,
  roundSize: 25,
  civilization: 'ALL',
  ages: [...AGES],
  types: BUILDING_TYPES.map((type) => type.value),
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
    const layout: ShortcutLayoutId =
      parsed.layout === 'QWERTY' ||
      parsed.layout === 'QWERTZ' ||
      parsed.layout === 'AZERTY' ||
      parsed.layout === 'DVORAK' ||
      parsed.layout === 'CUSTOM'
        ? parsed.layout
        : EMPTY_STORE.layout
    const displayStyle: ShortcutDisplayStyle =
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
    const ages = (parsed.ages ?? EMPTY_STORE.ages).filter((age): age is number =>
      AGES.includes(age as 1 | 2 | 3 | 4),
    )
    const types = (parsed.types ?? EMPTY_STORE.types).filter((type): type is TrainerBuildingType =>
      BUILDING_TYPES.some((item) => item.value === type),
    )
    return {
      ...EMPTY_STORE,
      ...parsed,
      layout,
      displayStyle,
      customLayout,
      roundSize: ROUND_SIZES.includes(parsed.roundSize as (typeof ROUND_SIZES)[number])
        ? (parsed.roundSize as (typeof ROUND_SIZES)[number])
        : EMPTY_STORE.roundSize,
      civilization:
        typeof parsed.civilization === 'string' ? parsed.civilization : EMPTY_STORE.civilization,
      ages: ages.length > 0 ? ages : EMPTY_STORE.ages,
      types: types.length > 0 ? types : EMPTY_STORE.types,
      showKeyLabels: parsed.showKeyLabels !== false,
      correct: numberOrZero(parsed.correct),
      attempts: numberOrZero(parsed.attempts),
      streak: numberOrZero(parsed.streak),
      bestStreak: numberOrZero(parsed.bestStreak),
    }
  } catch {
    return EMPTY_STORE
  }
}

function numberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

function randomAction(actions: readonly TrainerBuildingAction[], excluded: readonly string[] = []) {
  const excludedIds = new Set(excluded)
  const candidates = actions.filter((action) => !excludedIds.has(action.id))
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null
}

export function ShortcutTrainer() {
  const { gameName, tt } = useI18n()
  const actions = useMemo(() => trainerBuildingActions(EXPLORER_RECORDS_BY_KIND.building), [])
  const [store, setStore] = useState<TrainerStore>(loadStore)
  const [currentId, setCurrentId] = useState('')
  const [roundSolved, setRoundSolved] = useState<string[]>([])
  const [entered, setEntered] = useState<string[]>([])
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [editingCell, setEditingCell] = useState<[number, number] | null>(null)
  const [previewAge, setPreviewAge] = useState(1)
  const transitionTimer = useRef<number | null>(null)

  const keyboardLayout = useMemo(
    () => keyboardLayoutFor(store.layout, store.customLayout),
    [store.customLayout, store.layout],
  )
  const availableActions = useMemo(
    () =>
      actions.filter(
        (action) =>
          (store.civilization === 'ALL' || action.civilizations.includes(store.civilization)) &&
          store.ages.includes(action.age) &&
          store.types.includes(action.type),
      ),
    [actions, store.ages, store.civilization, store.types],
  )
  const roundTarget = Math.min(store.roundSize, availableActions.length)
  const current = availableActions.find((action) => action.id === currentId) ?? null
  const expectedKeys = useMemo(
    () => (current ? shortcutKeysForPositions(current.shortcut, keyboardLayout) : []),
    [current, keyboardLayout],
  )
  const filterKey = `${store.civilization}:${store.ages.join(',')}:${store.types.join(',')}`
  const civilizationOptions = useMemo(
    () =>
      [...new Set(actions.flatMap((action) => action.civilizations))]
        .sort()
        .map((code) => ({ code, label: gameName(civDisplayName(CIV_CODE_TO_SLUG[code] ?? code)) })),
    [actions, gameName],
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  }, [store])

  useEffect(() => {
    return () => {
      if (transitionTimer.current != null) window.clearTimeout(transitionTimer.current)
    }
  }, [])

  // Changing the exercise scope starts a fresh, coherent series immediately.
  useEffect(() => {
    if (transitionTimer.current != null) window.clearTimeout(transitionTimer.current)
    setRoundSolved([])
    setEntered([])
    setFeedback(null)
    setCurrentId(randomAction(availableActions)?.id ?? '')
  }, [filterKey, availableActions])

  useEffect(() => {
    if (current) setPreviewAge(current.age)
  }, [current])

  useEffect(() => {
    if (!editingCell) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setEditingCell(null)
        return
      }
      // A custom cell must store the character the player actually pressed,
      // not the label that happened to occupy this physical cell beforehand.
      const value = shortcutFromKeyInput(event)
      if (!value || value.length > 1) return
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
  }, [editingCell, keyboardLayout])

  useEffect(() => {
    if (editingCell || !current || expectedKeys.length === 0 || roundTarget === 0) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return
      if (event.key === 'Escape') {
        event.preventDefault()
        setEntered([])
        setFeedback(null)
        return
      }
      const pressed = trainerKeyFromInput(event, keyboardLayout)
      if (!pressed || pressed.length > 1) return
      // Do not consume normal typing outside the compact construction grid.
      if (!keyboardLayout.flat().includes(pressed)) return
      event.preventDefault()
      const expected = expectedKeys[entered.length]
      if (pressed !== expected) {
        setEntered([])
        setStore((previous) => ({ ...previous, attempts: previous.attempts + 1, streak: 0 }))
        setFeedback({ kind: 'wrong', message: tt('Not quite. Start the command again.') })
        return
      }
      const nextEntered = [...entered, pressed]
      if (nextEntered.length < expectedKeys.length) {
        setEntered(nextEntered)
        setFeedback(null)
        return
      }

      const nextSolved = [...roundSolved, current.id]
      const complete = nextSolved.length >= roundTarget
      setEntered([])
      setRoundSolved(nextSolved)
      setStore((previous) => ({
        ...previous,
        attempts: previous.attempts + 1,
        correct: previous.correct + 1,
        streak: previous.streak + 1,
        bestStreak: Math.max(previous.bestStreak, previous.streak + 1),
      }))
      setFeedback({
        kind: complete ? 'complete' : 'correct',
        message: complete
          ? tt('Series complete. Start a new one when you are ready.')
          : tt('Correct'),
      })
      if (!complete) {
        transitionTimer.current = window.setTimeout(() => {
          setCurrentId(randomAction(availableActions, nextSolved)?.id ?? '')
          setFeedback(null)
        }, 420)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    availableActions,
    current,
    editingCell,
    entered,
    expectedKeys,
    keyboardLayout,
    roundSolved,
    roundTarget,
    tt,
  ])

  const toggleAge = (age: number) => {
    setStore((previous) => {
      const ages = previous.ages.includes(age)
        ? previous.ages.filter((candidate) => candidate !== age)
        : [...previous.ages, age].sort()
      return { ...previous, ages: ages.length > 0 ? ages : previous.ages }
    })
  }
  const toggleType = (type: TrainerBuildingType) => {
    setStore((previous) => {
      const types = previous.types.includes(type)
        ? previous.types.filter((candidate) => candidate !== type)
        : [...previous.types, type]
      return { ...previous, types: types.length > 0 ? types : previous.types }
    })
  }
  const changeLayout = (layout: ShortcutLayoutId) => {
    setEditingCell(null)
    setEntered([])
    setStore((previous) => ({ ...previous, layout }))
  }
  const resetSeries = () => {
    if (transitionTimer.current != null) window.clearTimeout(transitionTimer.current)
    setRoundSolved([])
    setEntered([])
    setFeedback(null)
    setCurrentId(randomAction(availableActions)?.id ?? '')
  }
  const resetTrainer = () => {
    if (transitionTimer.current != null) window.clearTimeout(transitionTimer.current)
    setStore(EMPTY_STORE)
    setRoundSolved([])
    setEntered([])
    setFeedback(null)
    setEditingCell(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{tt('Aegis-style shortcut practice')}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {tt(
              'Construction commands are defined for the standard AoE4 profile. The trainer shows a building and checks the two key presses in order.',
            )}
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Keyboard className="h-3.5 w-3.5" /> {availableActions.length} {tt('verified commands')}
        </Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div>
              <h3 className="text-sm font-semibold">{tt('Series settings')}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {tt('Choose a set. Unknown or new commands are never presented as real bindings.')}
              </p>
            </div>
            <OptionGroup label={tt('Tasks per series')}>
              {ROUND_SIZES.map((size) => (
                <OptionButton
                  key={size}
                  active={store.roundSize === size}
                  onClick={() => setStore((previous) => ({ ...previous, roundSize: size }))}
                >
                  {size}
                </OptionButton>
              ))}
            </OptionGroup>
            <label className="grid gap-1 text-xs text-muted-foreground">
              <span>{tt('Civilization')}</span>
              <select
                value={store.civilization}
                onChange={(event) =>
                  setStore((previous) => ({ ...previous, civilization: event.target.value }))
                }
                className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="ALL">{tt('All civilizations')}</option>
                {civilizationOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <OptionGroup label={tt('Ages')}>
              {AGES.map((age) => (
                <OptionButton
                  key={age}
                  active={store.ages.includes(age)}
                  onClick={() => toggleAge(age)}
                >
                  {tt('Age')} {age}
                </OptionButton>
              ))}
            </OptionGroup>
            <OptionGroup label={tt('Building types')}>
              {BUILDING_TYPES.map((type) => (
                <OptionButton
                  key={type.value}
                  active={store.types.includes(type.value)}
                  onClick={() => toggleType(type.value)}
                >
                  {tt(type.label)}
                </OptionButton>
              ))}
            </OptionGroup>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{tt('Keyboard profile')}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tt('Choose a keyboard layout. Rebinding is available only for the custom grid.')}
                </p>
              </div>
              {editingCell && (
                <span className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">
                  {tt('Press one key to rebind the selected cell. Escape cancels.')}
                </span>
              )}
            </div>
            <OptionGroup label={tt('Current layout')}>
              {(
                [
                  ['QWERTY', 'QWERTY'],
                  ['QWERTZ', 'QWERTZ'],
                  ['AZERTY', 'AZERTY'],
                  ['DVORAK', 'Dvorak'],
                  ['CUSTOM', tt('Custom')],
                ] as const
              ).map(([value, label]) => (
                <OptionButton
                  key={value}
                  active={store.layout === value}
                  onClick={() => changeLayout(value)}
                >
                  {label}
                </OptionButton>
              ))}
            </OptionGroup>
            <OptionGroup label={tt('Display options')}>
              {(
                [
                  ['SINGLE', tt('Icon + name')],
                  ['GRID', tt('Icon in grid')],
                  ['NAME', tt('Name only')],
                ] as const
              ).map(([value, label]) => (
                <OptionButton
                  key={value}
                  active={store.displayStyle === value}
                  onClick={() => setStore((previous) => ({ ...previous, displayStyle: value }))}
                >
                  {label}
                </OptionButton>
              ))}
            </OptionGroup>
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
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
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card>
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {tt('Prompt')}
              </div>
              <button
                type="button"
                onClick={resetSeries}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary"
              >
                <Shuffle className="h-3.5 w-3.5" /> {tt('New series')}
              </button>
            </div>
            {current ? (
              <>
                <div className="rounded-lg border border-primary/30 bg-primary/5 px-5 py-8 text-center">
                  <div className="text-2xl font-semibold">{gameName(current.name)}</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {tt(typeLabel(current.type))} · {tt('Age')} {current.age}
                  </div>
                  {current.description && (
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                      {gameName(current.description)}
                    </p>
                  )}
                </div>
                {store.displayStyle === 'SINGLE' && current.icon && (
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
                  current={current}
                  entered={entered}
                  actions={availableActions}
                  previewAge={previewAge}
                  onPreviewAge={setPreviewAge}
                  onCellClick={(row, column) => {
                    if (store.layout === 'CUSTOM') setEditingCell([row, column])
                  }}
                />
                <div className="rounded-md border border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                  {entered.length === 0
                    ? tt('Press keys directly. Waiting for the first press.')
                    : tt('First key accepted: {key}.').replace('{key}', entered[0] ?? '')}{' '}
                  {tt('Escape starts the command again.')}
                </div>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                {tt('This set has no verified standard construction commands yet.')}
              </div>
            )}
            {feedback && <FeedbackBanner feedback={feedback} />}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {tt('Progress')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label={tt('Accuracy')} value={formatAccuracy(store.correct, store.attempts)} />
              <Stat label={tt('Series')} value={`${roundSolved.length}/${roundTarget}`} />
              <Stat label={tt('Streak')} value={String(store.streak)} />
              <Stat label={tt('Best')} value={String(store.bestStreak)} />
            </div>
            <button
              type="button"
              onClick={resetSeries}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Shuffle className="h-3.5 w-3.5" /> {tt('Reset current series')}
            </button>
            <button
              type="button"
              onClick={resetTrainer}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" /> {tt('Reset trainer')}
            </button>
          </CardContent>
        </Card>
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
  current,
  entered,
  actions,
  previewAge,
  onPreviewAge,
  onCellClick,
}: {
  layout: KeyboardLayout
  layoutId: ShortcutLayoutId
  displayStyle: ShortcutDisplayStyle
  showKeyLabels: boolean
  editingCell: [number, number] | null
  current: TrainerBuildingAction
  entered: string[]
  actions: readonly TrainerBuildingAction[]
  previewAge: number
  onPreviewAge: (age: number) => void
  onCellClick: (row: number, column: number) => void
}) {
  const { tt } = useI18n()
  const menuActions = useMemo(() => {
    const map = new Map<string, TrainerBuildingAction>()
    for (const action of actions.filter(
      (candidate) => candidate.shortcut[0] === `0:${previewAge - 1}`,
    )) {
      if (!map.has(action.shortcut[1])) map.set(action.shortcut[1], action)
    }
    return map
  }, [actions, previewAge])
  const expectedIndex = entered.length
  return (
    <div className="rounded-md border border-border/70 bg-background/40 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {tt('Construction grid')}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {layoutId === 'CUSTOM'
            ? tt('Click a cell, then press a key to rebind it.')
            : tt('This profile uses the standard AoE4 commands.')}
        </span>
      </div>
      <div className="mb-3 grid grid-cols-4 gap-1 rounded-md border border-border p-1">
        {AGES.map((age) => (
          <button
            key={age}
            type="button"
            onClick={() => onPreviewAge(age)}
            className={`rounded px-2 py-1.5 text-xs ${previewAge === age ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            {tt('Age')} {age}
          </button>
        ))}
      </div>
      <div className="mx-auto grid max-w-xl gap-1.5">
        {layout.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-4 gap-1.5">
            {row.map((key, columnIndex) => {
              const position =
                `${rowIndex}:${columnIndex}` as TrainerBuildingAction['shortcut'][number]
              const menuAction = menuActions.get(position)
              const editing = editingCell?.[0] === rowIndex && editingCell?.[1] === columnIndex
              const completed = current.shortcut.slice(0, expectedIndex).includes(position)
              return (
                <button
                  key={position}
                  type="button"
                  onClick={() => onCellClick(rowIndex, columnIndex)}
                  title={menuAction ? gameNameForTitle(menuAction.name) : key}
                  className={`flex min-h-16 min-w-0 flex-col items-center justify-center rounded-md border px-2 py-1 text-center transition-colors ${
                    editing
                      ? 'border-primary bg-primary/15 text-primary ring-1 ring-primary'
                      : completed
                        ? 'border-win/60 bg-win/10 text-win'
                        : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {displayStyle !== 'NAME' && menuAction?.icon && (
                    <img
                      src={menuAction.icon}
                      alt=""
                      className="h-6 w-6 object-contain"
                      loading="lazy"
                    />
                  )}
                  {showKeyLabels && (
                    <kbd className="mt-1 font-mono text-sm font-semibold">
                      {editing ? '…' : key}
                    </kbd>
                  )}
                  {displayStyle !== 'GRID' && menuAction && (
                    <span className="mt-1 max-w-full truncate text-[10px] leading-tight">
                      {menuAction.name}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function gameNameForTitle(value: string): string {
  return value
}

function OptionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <div className="flex flex-wrap gap-1 rounded-md border border-border p-1">{children}</div>
    </div>
  )
}

function OptionButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1.5 text-xs transition-colors ${active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
    >
      {children}
    </button>
  )
}

function FeedbackBanner({ feedback }: { feedback: Exclude<Feedback, null> }) {
  const Icon = feedback.kind === 'wrong' ? X : Check
  const tone =
    feedback.kind === 'wrong'
      ? 'border-loss/30 bg-loss/10 text-loss'
      : 'border-win/30 bg-win/10 text-win'
  return (
    <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${tone}`}>
      <Icon className="h-4 w-4" />
      {feedback.message}
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

function typeLabel(type: TrainerBuildingType): string {
  return BUILDING_TYPES.find((item) => item.value === type)?.label ?? type
}

function formatAccuracy(correct: number, attempts: number): string {
  return attempts > 0 ? `${Math.round((correct / attempts) * 100)}%` : '—'
}
