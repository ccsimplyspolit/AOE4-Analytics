import { existsSync } from 'node:fs'
import { cpus } from 'node:os'
import { join } from 'node:path'
import { Worker } from 'node:worker_threads'
import { analyzeMatch, type AnalysisInput, type MatchAnalysis } from '@domain/analysis'

const WORKER_COUNT = Math.min(3, Math.max(1, (cpus().length || 2) - 1))

type Pending = {
  resolve: (value: MatchAnalysis) => void
  reject: (error: Error) => void
}

let workers: Worker[] | null = null
let nextId = 1
let cursor = 0
const pending = new Map<number, Pending>()

function workerScript(): string {
  return join(__dirname, 'cpuWorker.js')
}

function shouldUseWorkers(): boolean {
  return !process.env.VITEST && !process.env.VITEST_WORKER_ID
}

function failPending(error: Error): void {
  for (const [id, job] of pending) {
    pending.delete(id)
    job.reject(error)
  }
}

function startPool(): Worker[] | null {
  if (!shouldUseWorkers()) return null
  const script = workerScript()
  if (!existsSync(script)) return null
  const pool: Worker[] = []
  try {
    for (let i = 0; i < WORKER_COUNT; i++) {
      const worker = new Worker(script)
      worker.on('message', (message: { id: number; ok: boolean; value?: MatchAnalysis; error?: string }) => {
        const job = pending.get(message.id)
        if (!job) return
        pending.delete(message.id)
        if (message.ok && message.value) job.resolve(message.value)
        else job.reject(new Error(message.error || 'Worker analysis failed.'))
      })
      worker.on('error', (error) => {
        failPending(error instanceof Error ? error : new Error(String(error)))
      })
      worker.on('exit', (code) => {
        if (code !== 0) failPending(new Error(`Analysis worker exited with code ${code}.`))
      })
      pool.push(worker)
    }
    return pool
  } catch {
    for (const worker of pool) void worker.terminate()
    return null
  }
}

function getPool(): Worker[] | null {
  if (!shouldUseWorkers()) return null
  if (workers && workers.length > 0) return workers
  workers = startPool()
  return workers && workers.length > 0 ? workers : null
}

/**
 * Runs `analyzeMatch` on a worker thread so a long history fold cannot stall
 * overlay paints and IPC. Falls back to the main thread when workers are
 * unavailable (tests, missing bundle).
 */
export function analyzeMatchAsync(input: AnalysisInput): Promise<MatchAnalysis> {
  const pool = getPool()
  if (!pool) return Promise.resolve(analyzeMatch(input))
  const id = nextId++
  return new Promise<MatchAnalysis>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    const worker = pool[cursor % pool.length]
    cursor += 1
    try {
      worker?.postMessage({ id, input })
    } catch (error) {
      pending.delete(id)
      reject(error instanceof Error ? error : new Error(String(error)))
    }
  }).catch(() => analyzeMatch(input))
}
