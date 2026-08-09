import { useEffect, useMemo, useState } from 'react'
import { Check, Keyboard, RotateCcw, Shuffle, X } from 'lucide-react'
import { EXPLORER_RECORDS_BY_KIND } from '@data/explorerData'
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
}

type Feedback = { kind: 'correct' | 'wrong' | 'missing'; message: string } | null

const EMPTY_STORE: TrainerStore = {
  shortcuts: {},
  correct: 0,
  attempts: 0,
  streak: 0,
  bestStreak: 0,
}

function loadStore(): TrainerStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_STORE
    const parsed = JSON.parse(raw) as Partial<TrainerStore>
    return {
      ...EMPTY_STORE,
      ...parsed,
      shortcuts: parsed.shortcuts && typeof parsed.shortcuts === 'object' ? parsed.shortcuts : {},
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

function normalizeShortcut(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase()
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

  const current = records.find((record) => record.id === currentId) ?? records[0]

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  }, [store])

  useEffect(() => {
    setShortcut(current ? (store.shortcuts[current.id] ?? '') : '')
    setFeedback(null)
  }, [current, store.shortcuts])

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
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                value={shortcut}
                onChange={(event) => setShortcut(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') checkAnswer()
                }}
                placeholder={tt('Example: Q, Ctrl+1, Shift+A')}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
                'Tip: enter the shortcut exactly as you use it. Case and extra spaces are normalized.',
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
