/** Runtime status shared by the Electron coordinator and the dashboard. */

export const AUTOMATION_TASK_IDS = [
  'history',
  'archive',
  'cache',
  'videos',
  'catalogs',
  'sources',
] as const

export type AutomationTaskId = (typeof AUTOMATION_TASK_IDS)[number]
export type AutomationTaskState = 'idle' | 'running' | 'success' | 'skipped' | 'error'

export interface AutomationTaskStatus {
  id: AutomationTaskId
  state: AutomationTaskState
  startedAt: string | null
  finishedAt: string | null
  processed: number
  message: string | null
}

export interface AutomationStatus {
  running: boolean
  reason: string | null
  startedAt: string | null
  finishedAt: string | null
  nextRunAt: string | null
  lastError: string | null
  tasks: AutomationTaskStatus[]
}

export function idleAutomationTasks(): AutomationTaskStatus[] {
  return AUTOMATION_TASK_IDS.map((id) => ({
    id,
    state: 'idle',
    startedAt: null,
    finishedAt: null,
    processed: 0,
    message: null,
  }))
}

export function createIdleAutomationStatus(nextRunAt: string | null = null): AutomationStatus {
  return {
    running: false,
    reason: null,
    startedAt: null,
    finishedAt: null,
    nextRunAt,
    lastError: null,
    tasks: idleAutomationTasks(),
  }
}
