import { parentPort } from 'node:worker_threads'
import { analyzeMatch, type AnalysisInput } from '@domain/analysis'

if (!parentPort) {
  throw new Error('cpuWorker must run as a worker_threads worker')
}

parentPort.on('message', (message: { id: number; input: AnalysisInput }) => {
  try {
    parentPort!.postMessage({ id: message.id, ok: true, value: analyzeMatch(message.input) })
  } catch (error) {
    parentPort!.postMessage({
      id: message.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})
