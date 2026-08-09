import { describe, expect, it } from 'vitest'
import { createIdleAutomationStatus, idleAutomationTasks } from '../automation'

describe('automation status model', () => {
  it('creates a stable idle status for every pipeline stage', () => {
    const status = createIdleAutomationStatus('2026-08-09T10:00:00.000Z')

    expect(status.running).toBe(false)
    expect(status.nextRunAt).toBe('2026-08-09T10:00:00.000Z')
    expect(status.tasks).toEqual(idleAutomationTasks())
    expect(status.tasks.map((task) => task.id)).toEqual([
      'history',
      'archive',
      'cache',
      'videos',
      'catalogs',
      'sources',
    ])
  })

  it('does not share mutable task state between status instances', () => {
    const first = createIdleAutomationStatus()
    const second = createIdleAutomationStatus()
    first.tasks[0]!.state = 'running'

    expect(second.tasks[0]!.state).toBe('idle')
  })
})
