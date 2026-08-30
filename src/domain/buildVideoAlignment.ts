import type { BuildOrder, BuildStep } from './buildOrderSchema'
import type { VideoEvidenceSource } from './videoEvidence'
import { embeddedVideoFromUrl } from './videoEmbed'

export interface BuildVideoCheckpoint {
  stepIndex: number
  buildTime: string
  timeSec: number
  note: string
  watchUrl: string
  quote: string | null
}

export function parseBuildClock(value: string | undefined): number | null {
  if (!value) return null
  const match = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = match[1] ? Number(match[1]) : 0
  return hours * 3600 + Number(match[2]) * 60 + Number(match[3])
}

function stepNote(step: BuildStep): string {
  return step.notes.join(' · ').replace(/\s+/g, ' ').trim()
}

function nearestQuote(source: VideoEvidenceSource | undefined, timeSec: number): string | null {
  if (!source?.frameCheckpoints?.length) return null
  let best: { distance: number; quote: string } | null = null
  for (const checkpoint of source.frameCheckpoints) {
    const distance = Math.abs(checkpoint.timeSec - timeSec)
    if (distance > 45) continue
    if (!best || distance < best.distance) best = { distance, quote: checkpoint.quote }
  }
  return best?.quote ?? null
}

/** Pair timed build steps with the attached guide so the viewer can jump to the matching second. */
export function alignBuildWithVideo(build: BuildOrder): BuildVideoCheckpoint[] {
  const video = embeddedVideoFromUrl(build.video ?? '')
  if (!video) return []
  const source = build.video_evidence?.sources.find((item) => item.id === video.videoId)
  const watchBase = `https://www.youtube.com/watch?v=${video.videoId}`
  return build.build_order.flatMap((step, stepIndex) => {
    const timeSec = parseBuildClock(step.time)
    if (timeSec == null) return []
    return [
      {
        stepIndex,
        buildTime: step.time!,
        timeSec,
        note: stepNote(step),
        watchUrl: `${watchBase}&t=${timeSec}s`,
        quote: nearestQuote(source, timeSec),
      },
    ]
  })
}

export function demoSourcesForBuild(build: BuildOrder): VideoEvidenceSource[] {
  return (build.video_evidence?.sources ?? []).filter((source) => source.sourceKind === 'demo')
}
