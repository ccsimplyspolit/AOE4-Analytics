import { describe, expect, it } from 'vitest'
import { createExplorerQuiz } from '../explorerQuiz'

describe('explorer quiz', () => {
  it('generates reproducible data-driven questions', () => {
    const first = createExplorerQuiz(42, 12)
    const second = createExplorerQuiz(42, 12)

    expect(first).toEqual(second)
    expect(first).toHaveLength(12)
    for (const question of first) {
      expect(question.options).toContain(question.answer)
      expect(new Set(question.options).size).toBe(question.options.length)
    }
  })

  it('supports the no-easy-questions mode', () => {
    const questions = createExplorerQuiz(42, 30, { excludeEasy: true })
    expect(questions.length).toBeGreaterThan(0)
    expect(questions.every((question) => question.difficulty !== 'easy')).toBe(true)
  })
})
