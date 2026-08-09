import { EXPLORER_RECORDS } from '@data/explorerData'
import { UNITS } from '@data/gameData'
import { civDisplayName } from './civ'
import { civSlugFromCode } from '@data/civs'

export interface ExplorerQuizQuestion {
  id: string
  prompt: string
  options: string[]
  answer: string
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface ExplorerQuizOptions {
  /** Mirrors AoE4World's "Start without easy questions" mode. */
  excludeEasy?: boolean
}

const AGE_NAMES: Record<number, string> = {
  1: 'Dark Age',
  2: 'Feudal Age',
  3: 'Castle Age',
  4: 'Imperial Age',
}

function rng(seed: number): () => number {
  let state = (seed >>> 0) || 1
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function shuffled<T>(values: T[], random: () => number): T[] {
  const copy = [...values]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

function choices(correct: string, pool: string[], random: () => number): string[] {
  const unique = [...new Set(pool.filter((value) => value !== correct))]
  return shuffled([correct, ...shuffled(unique, random).slice(0, 3)], random)
}

function civNames(codes: string[]): string[] {
  return codes.map((code) => civSlugFromCode(code) ?? code).map(civDisplayName)
}

/**
 * Generates a fresh Explorer-style quiz from the same versioned data used by
 * the unit/building explorer. No hard-coded trivia bank means new snapshots
 * automatically produce new questions after a data sync.
 */
export function createExplorerQuiz(
  seed = Date.now(),
  count = 10,
  options: ExplorerQuizOptions = {},
): ExplorerQuizQuestion[] {
  const random = rng(seed)
  const ages = Object.values(AGE_NAMES)
  const questions: ExplorerQuizQuestion[] = []

  for (const unit of shuffled(UNITS, random).slice(0, Math.max(12, count * 2))) {
    const age = AGE_NAMES[unit.minAge] ?? `Age ${unit.minAge}`
    questions.push({
      id: `${unit.id}:age`,
      prompt: `In which age is ${unit.name} first available?`,
      options: choices(age, ages, random),
      answer: age,
      explanation: `${unit.name} is available from the ${age}.`,
      difficulty: unit.minAge <= 2 ? 'easy' : 'medium',
    })

    if (unit.costs && unit.costs.food + unit.costs.wood + unit.costs.gold + unit.costs.stone > 0) {
      const resource = shuffled(
        (['food', 'wood', 'gold', 'stone'] as const).filter((key) => unit.costs![key] > 0),
        random,
      )[0]
      if (resource) {
        const answer = String(unit.costs[resource])
        const pool = UNITS.map((candidate) => candidate.costs?.[resource]).filter(
          (value): value is number => value != null,
        ).map(String)
        questions.push({
          id: `${unit.id}:cost:${resource}`,
          prompt: `How much ${resource} does ${unit.name} cost?`,
          options: choices(answer, pool, random),
          answer,
          explanation: `${unit.name} costs ${answer} ${resource}.`,
          difficulty: 'medium',
        })
      }
    }

    const availableCivs = civNames(unit.civs)
    if (availableCivs.length > 1) {
      const answer = availableCivs[Math.floor(random() * availableCivs.length)]!
      const allCivs = Object.values(UNITS)
        .flatMap((candidate) => civNames(candidate.civs))
      questions.push({
        id: `${unit.id}:civ`,
        prompt: `Which civilization can train ${unit.name}?`,
        options: choices(answer, allCivs, random),
        answer,
        explanation: `${unit.name} is available to ${availableCivs.join(', ')}.`,
        difficulty: 'hard',
      })
    }
  }

  for (const record of shuffled(EXPLORER_RECORDS, random).slice(0, Math.max(4, count))) {
    const answer = AGE_NAMES[record.minAge] ?? `Age ${record.minAge}`
    questions.push({
      id: `${record.kind}:${record.id}:age`,
      prompt: `When does ${record.name} become available?`,
      options: choices(answer, ages, random),
      answer,
      explanation: `${record.name} is a ${record.kind} available from the ${answer}.`,
      difficulty: record.kind === 'building' ? 'easy' : 'medium',
    })
  }

  const pool = options.excludeEasy
    ? questions.filter((question) => question.difficulty !== 'easy')
    : questions
  return shuffled(pool.length > 0 ? pool : questions, random).slice(0, Math.max(1, count))
}
