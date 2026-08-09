import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ExternalLink, RefreshCw, Sparkles, Trophy, XCircle } from 'lucide-react'
import { createExplorerQuiz } from '@domain/explorerQuiz'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { cn } from '@shared/lib/utils'
import { useI18n } from '../../../i18n'

export function ExplorerQuiz() {
  const { tt } = useI18n()
  const [seed, setSeed] = useState(() => Date.now())
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [excludeEasy, setExcludeEasy] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const questions = useMemo(
    () => createExplorerQuiz(seed, 10, { excludeEasy }),
    [excludeEasy, seed],
  )
  const question = questions[index]
  const finished = index >= questions.length

  const answer = useCallback((option: string) => {
    if (selected || !question) return
    setSelected(option)
    if (option === question.answer) {
      setScore((value) => value + 1)
      setStreak((value) => {
        const next = value + 1
        setBestStreak((best) => Math.max(best, next))
        return next
      })
    } else {
      setStreak(0)
    }
  }, [question, selected])

  // AoE4World's quiz accepts A/B/C (and 1/2/3) directly from the keyboard.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (selected || !question) return
      const key = event.key.toLowerCase()
      const optionIndex = ({ a: 0, b: 1, c: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3 } as Record<string, number>)[key]
      if (optionIndex == null || !question.options[optionIndex]) return
      event.preventDefault()
      answer(question.options[optionIndex])
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [answer, question, selected])

  const next = () => {
    setSelected(null)
    setIndex((value) => value + 1)
  }

  const restart = () => {
    setSeed(Date.now())
    setIndex(0)
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setSelected(null)
  }

  if (finished) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <Trophy className="h-10 w-10 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">{tt('Explorer Quiz complete')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {score}/{questions.length} {tt('correct answers')} · {tt('Best streak')}: {bestStreak}
            </p>
          </div>
          <button
            type="button"
            onClick={restart}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            {tt('New quiz')}
          </button>
        </CardContent>
      </Card>
    )
  }

  if (!question) return null
  const answered = selected !== null
  const correct = selected === question.answer

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <Card>
        <CardContent className="space-y-5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
                <Sparkles className="h-4 w-4" /> {tt('Data-driven quiz')}
              </div>
              <h2 className="mt-2 text-xl font-semibold">{question.prompt}</h2>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              <Badge variant="secondary">{index + 1}/{questions.length}</Badge>
              <Badge variant="outline">{tt('Streak')}: {streak}</Badge>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {question.options.map((option) => {
              const isAnswer = option === question.answer
              const isSelected = option === selected
              return (
                <button
                  key={option}
                  type="button"
                  disabled={answered}
                  onClick={() => answer(option)}
                  className={cn(
                    'rounded-md border px-4 py-3 text-left text-sm transition-colors',
                    !answered && 'border-border hover:border-primary/50 hover:bg-secondary/60',
                    answered && isAnswer && 'border-win bg-win/10 text-win',
                    answered && isSelected && !isAnswer && 'border-loss bg-loss/10 text-loss',
                    answered && !isSelected && !isAnswer && 'border-border opacity-60',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-background/60 text-[10px] font-bold text-muted-foreground">
                      {String.fromCharCode(65 + question.options.indexOf(option))}
                    </span>
                    {option}
                  </span>
                </button>
              )
            })}
          </div>
          {answered && (
            <div className={cn('rounded-md border p-3 text-sm', correct ? 'border-win/30 bg-win/5' : 'border-loss/30 bg-loss/5')}>
              <div className="flex items-center gap-2 font-medium">
                {correct ? <CheckCircle2 className="h-4 w-4 text-win" /> : <XCircle className="h-4 w-4 text-loss" />}
                {correct ? tt('Correct') : `${tt('Correct answer')}: ${question.answer}`}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{question.explanation}</p>
            </div>
          )}
          {answered && (
            <button
              type="button"
              onClick={next}
              className="rounded-md bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80"
            >
              {index + 1 === questions.length ? tt('Show result') : tt('Next question')}
            </button>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{tt('Session')}</div>
          <div className="text-3xl font-bold tabular-nums">{score}/{index + (answered ? 1 : 0)}</div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={excludeEasy}
              onChange={(event) => {
                setExcludeEasy(event.target.checked)
                restart()
              }}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            {tt('Start without easy questions')}
          </label>
          <a
            href="https://aoe4world.com/explorer/quiz"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {tt('Play with Twitch viewers')} <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <p className="text-sm text-muted-foreground">
            {tt('Questions are generated from the versioned AoE4World unit, building, technology, and upgrade snapshot. Use A/B/C or 1/2/3 to answer.')}
          </p>
          <Badge variant="outline">{question.difficulty}</Badge>
        </CardContent>
      </Card>
    </div>
  )
}
