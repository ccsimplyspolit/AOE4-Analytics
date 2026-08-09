import type { BuildOrder } from './buildOrderSchema'
import { buildIndexForCiv, parseNote } from './buildOrderSchema'
import { parseDuration } from './format'
import { gradeBuildFollow, type TrainerReport } from './buildTrainer'
import type { BuildEvent, PlayerSummary } from './statsSummary'

export type BuildAuditStatus = 'ok' | 'late' | 'early' | 'missing' | 'unknown'
export type BuildAuditSeverity = 'major' | 'minor' | 'info'
export type BuildAuditCertainty = 'confirmed' | 'review'

export interface BuildAuditFinding {
  kind: 'timing' | 'villagers' | 'action' | 'coverage'
  message: string
  evidence: string
}

export interface BuildActionAudit {
  stepIndex: number
  targetTimeSec: number
  note: string
  expectedCategory: BuildEvent['category'] | null
  actual: BuildEvent | null
  status: BuildAuditStatus
}

export interface BuildAuditIssue {
  severity: BuildAuditSeverity
  kind: 'villager-gap' | 'age-up' | 'missing-action' | 'action-timing' | 'coverage'
  message: string
  evidence: string
  /** Missing action matches are review items; they are not proof of a mistake. */
  certainty?: BuildAuditCertainty
}

export interface BuildAuditCoverage {
  eventCount: number
  timedCheckpoints: number
  gradeableCheckpoints: number
  matchedActions: number
  expectedActions: number
  confidence: 'high' | 'medium' | 'low' | 'none'
}

export interface BuildReferenceSelection {
  reference: BuildOrder | null
  candidates: number
  reason: 'pinned' | 'video' | 'observed' | 'matchup' | 'map' | 'patch' | 'best-match' | 'none'
  /** How closely the observed event timeline fits the selected reference. */
  observedFitScore: number | null
  observedMatchedActions: number
  observedExpectedActions: number
  observedConfidence: 'high' | 'medium' | 'low' | 'none'
}

function normalizedContext(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function supportsCiv(build: BuildOrder, civ: string | null): boolean {
  return civ != null && buildIndexForCiv([build], civ) === 0
}

function contextKeys(value: string | string[] | null | undefined): Set<string> {
  const values = value == null ? [] : Array.isArray(value) ? value : [value]
  return new Set(values.map(normalizedContext).filter(Boolean))
}

function supportsMatchup(build: BuildOrder, opponentCivilizations: string[]): boolean {
  const buildOpponents = contextKeys(build.opponentCivilization)
  if (buildOpponents.size === 0 || opponentCivilizations.length === 0) return false
  return opponentCivilizations.some((civ) => buildOpponents.has(normalizedContext(civ)))
}

/** Picks a civ-compatible reference without silently using an unrelated build. */
export function selectReferenceBuild(
  builds: BuildOrder[],
  input: {
    civ: string | null
    map?: string | null
    patch?: string | null
    pinnedName?: string | null
    /** Exact build extracted from a VOD linked to this game. */
    preferredBuild?: BuildOrder | null
    /** The player's decoded build timeline, used to infer the likely build. */
    player?: PlayerSummary | null
    /** Opposing civs known from the match roster; allies should be filtered by the caller. */
    opponentCivilizations?: string[]
  },
): BuildReferenceSelection {
  const { civ, map, patch, pinnedName, preferredBuild, player, opponentCivilizations = [] } = input
  const compatible = builds.filter((build) => supportsCiv(build, civ))
  const preferred = preferredBuild && supportsCiv(preferredBuild, civ) ? [preferredBuild] : []
  const candidates = [...preferred, ...compatible].filter(
    (build, index, all) =>
      all.findIndex((candidate) => candidate.name === build.name && candidate.source === build.source) === index,
  )
  if (candidates.length === 0) {
    return {
      reference: null,
      candidates: 0,
      reason: 'none',
      observedFitScore: null,
      observedMatchedActions: 0,
      observedExpectedActions: 0,
      observedConfidence: 'none',
    }
  }
  if (pinnedName) {
    const pinned = candidates.find((build) => build.name === pinnedName)
    if (pinned) {
      const fit = player ? observedBuildFit(pinned, player, civ) : null
      return {
        reference: pinned,
        candidates: candidates.length,
        reason: 'pinned',
        observedFitScore: fit?.score ?? null,
        observedMatchedActions: fit?.matchedActions ?? 0,
        observedExpectedActions: fit?.expectedActions ?? 0,
        observedConfidence: fit ? fitConfidence(fit.score, player?.buildOrder.length ?? 0) : 'none',
      }
    }
  }
  if (preferred.length > 0) {
    const fit = player ? observedBuildFit(preferred[0]!, player, civ) : null
    return {
      reference: preferred[0]!,
      candidates: candidates.length,
      reason: 'video',
      observedFitScore: fit?.score ?? null,
      observedMatchedActions: fit?.matchedActions ?? 0,
      observedExpectedActions: fit?.expectedActions ?? 0,
      observedConfidence: fit ? fitConfidence(fit.score, player?.buildOrder.length ?? 0) : 'none',
    }
  }
  const mapKey = normalizedContext(map)
  const patchKey = normalizedContext(patch)
  const scored = candidates.map((build, index) => {
    const buildMap = normalizedContext(build.map)
    const buildPatch = normalizedContext(build.patch)
    const matchupMatch = supportsMatchup(build, opponentCivilizations)
    const mapMatch = Boolean(mapKey && buildMap && (mapKey === buildMap || mapKey.includes(buildMap) || buildMap.includes(mapKey)))
    const patchMatch = Boolean(patchKey && buildPatch && (patchKey === buildPatch || patchKey.includes(buildPatch) || buildPatch.includes(patchKey)))
    const sourceBonus = build.origin === 'curated' ? 8 : build.origin === 'house' ? 5 : build.origin === 'imported' ? 2 : 0
    const metadataScore =
      (matchupMatch ? 140 : 0) +
      (mapMatch ? 100 : 0) +
      (patchMatch ? 40 : 0) +
      sourceBonus +
      Math.min(build.build_order.length, 40) / 100
    const fit = player && player.buildOrder.length > 0 ? observedBuildFit(build, player, civ) : null
    return { build, index, score: metadataScore, matchupMatch, mapMatch, patchMatch, fit }
  })
  scored.sort((a, b) => {
    if (a.fit && b.fit) return b.fit.score - a.fit.score || b.score - a.score || a.index - b.index
    if (a.fit) return -1
    if (b.fit) return 1
    return b.score - a.score || a.index - b.index
  })
  const winner = scored[0]!
  const fit = winner.fit ?? null
  return {
    reference: winner.build,
    candidates: candidates.length,
    reason:
      fit != null
        ? 'observed'
        : winner.matchupMatch
          ? 'matchup'
          : winner.mapMatch
            ? 'map'
            : winner.patchMatch
              ? 'patch'
              : 'best-match',
    observedFitScore: fit?.score ?? null,
    observedMatchedActions: fit?.matchedActions ?? 0,
    observedExpectedActions: fit?.expectedActions ?? 0,
    observedConfidence: fit ? fitConfidence(fit.score, player?.buildOrder.length ?? 0) : 'none',
  }
}

interface ObservedBuildFit {
  score: number
  matchedActions: number
  expectedActions: number
}

function observedBuildFit(
  reference: BuildOrder,
  player: PlayerSummary,
  civ: string | null,
): ObservedBuildFit | null {
  if (!civ || player.buildOrder.length === 0) return null
  const audit = comparePlayerToBuild({ player, civ, reference })
  const expectedActions = audit.actions.length
  const matchedActions = audit.actions.filter((action) => action.actual != null).length
  const actionRate = expectedActions > 0 ? (matchedActions / expectedActions) * 100 : null
  const checkpointScore = audit.report?.score ?? null
  if (actionRate == null && checkpointScore == null) return null
  const score = Math.round(
    actionRate != null && checkpointScore != null
      ? actionRate * 0.55 + checkpointScore * 0.45
      : actionRate ?? checkpointScore ?? 0,
  )
  return { score, matchedActions, expectedActions }
}

function fitConfidence(score: number, eventCount: number): 'high' | 'medium' | 'low' {
  if (eventCount >= 12 && score >= 70) return 'high'
  if (eventCount >= 5 && score >= 45) return 'medium'
  return 'low'
}

export interface PlayerBuildAudit {
  player: PlayerSummary
  civ: string | null
  reference: BuildOrder | null
  report: TrainerReport | null
  actions: BuildActionAudit[]
  issues: BuildAuditIssue[]
  improvements: BuildAuditIssue[]
  strengths: BuildAuditFinding[]
  coverage: BuildAuditCoverage
  /** Number of compatible local builds considered for this player. */
  referenceCandidates: number
  /** Why this reference was selected. */
  referenceReason: 'pinned' | 'video' | 'observed' | 'matchup' | 'map' | 'patch' | 'best-match' | 'none'
  referenceFitScore: number | null
  referenceMatchedActions: number
  referenceExpectedActions: number
  referenceConfidence: 'high' | 'medium' | 'low' | 'none'
  /** True when the summary contained a decoded per-player event timeline. */
  hasTimeline: boolean
}

const TIMING_TOLERANCE_SEC = 60
// Keep a wider evidence window than the ±60s pass/fail tolerance so a real
// action that happened late is reported as late instead of being mislabeled as
// missing. The report still calls out the exact delta and certainty separately.
const ACTION_WINDOW_SEC = 180
const STOP_WORDS = new Set([
  'about',
  'after',
  'all',
  'and',
  'build',
  'click',
  'continue',
  'during',
  'from',
  'keep',
  'make',
  'next',
  'once',
  'point',
  'put',
  'rally',
  'send',
  'start',
  'then',
  'the',
  'this',
  'when',
  'with',
  'your',
])

const norm = (value: string): string =>
  value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

function singular(value: string): string {
  if (value.endsWith('ies')) return `${value.slice(0, -3)}y`
  if (value.endsWith('s') && !value.endsWith('ss')) return value.slice(0, -1)
  return value
}

function noteText(note: string): string {
  return parseNote(note)
    .filter((part): part is Extract<ReturnType<typeof parseNote>[number], { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function actionCategory(note: string): BuildEvent['category'] | null {
  const text = norm(note)
  if (/\b(research|upgrade|technology|tech)\b/.test(text)) return 'upgrade'
  if (/\b(build|construct|landmark|town center|tc|camp|house|stable|barracks|range|mill|dock|tower|wall|blacksmith|workshop)\b/.test(text)) {
    return 'building'
  }
  if (/\b(produce|train|knight|spearman|archer|villager|unit|men at arms|horseman)\b/.test(text)) {
    return 'unit'
  }
  return null
}

function actionTerms(note: string): string[] {
  return norm(note)
    .split(' ')
    .map(singular)
    .filter((term) => term.length >= 4 && !STOP_WORDS.has(term) && !/^\d+$/.test(term))
}

function eventText(event: BuildEvent): string {
  return norm(`${event.name} ${event.blueprint}`)
}

function matchScore(note: string, event: BuildEvent, expectedCategory: BuildEvent['category'] | null): number {
  const terms = actionTerms(note)
  const haystack = eventText(event)
  const overlap = terms.filter((term) => haystack.includes(term)).length
  if (overlap === 0) return 0
  const categoryBonus = expectedCategory == null || event.category === expectedCategory ? 2 : 0
  return overlap * 3 + categoryBonus
}

function expectedActionNotes(reference: BuildOrder, stepIndex: number): string[] {
  const step = reference.build_order[stepIndex]
  if (!step) return []
  return step.notes
    .map(noteText)
    .filter((note) => actionCategory(note) != null)
    .slice(0, 2)
}

function nearestAction(
  note: string,
  targetTimeSec: number,
  events: BuildEvent[],
  expectedCategory: BuildEvent['category'] | null,
): BuildEvent | null {
  let best: BuildEvent | null = null
  let bestScore = 0
  for (const event of events) {
    if (Math.abs(event.timeSec - targetTimeSec) > ACTION_WINDOW_SEC) continue
    const score = matchScore(note, event, expectedCategory)
    if (score > bestScore || (score === bestScore && best && Math.abs(event.timeSec - targetTimeSec) < Math.abs(best.timeSec - targetTimeSec))) {
      best = event
      bestScore = score
    }
  }
  return best
}

function formatDelta(seconds: number): string {
  const sign = seconds > 0 ? '+' : seconds < 0 ? '−' : ''
  const absolute = Math.abs(Math.round(seconds))
  return `${sign}${Math.floor(absolute / 60)}:${String(absolute % 60).padStart(2, '0')}`
}

function issuesForReport(report: TrainerReport): BuildAuditIssue[] {
  const issues: BuildAuditIssue[] = []
  for (const checkpoint of report.checkpoints) {
    if (checkpoint.kind === 'villagers' && checkpoint.villagerDelta != null) {
      if (checkpoint.villagerDelta < -2) {
        issues.push({
          severity: checkpoint.villagerDelta <= -4 ? 'major' : 'minor',
          kind: 'villager-gap',
          message: `Недобор крестьян к ${checkpoint.label}: ${checkpoint.actualVillagers} вместо ${checkpoint.targetVillagers}.`,
          evidence: `Фактически ${checkpoint.villagerDelta} к плану.`,
          certainty: 'confirmed',
        })
      } else if (checkpoint.villagerDelta > 4) {
        issues.push({
          severity: 'info',
          kind: 'villager-gap',
          message: `Темп крестьян опережает план к ${checkpoint.label}.`,
          evidence: `Отклонение ${checkpoint.villagerDelta} к плану.`,
          certainty: 'confirmed',
        })
      }
    }
    if (checkpoint.kind !== 'ageup') continue
    // A missing landmark match is an unavailable measurement, not proof that
    // the player never aged. The summary can contain a shortened/unknown
    // landmark token or a future DLC landmark that this build of the app does
    // not know yet.
    if (checkpoint.actualTimeSec != null && (checkpoint.deltaSec ?? 0) > TIMING_TOLERANCE_SEC) {
      issues.push({
        severity: checkpoint.deltaSec! > 120 ? 'major' : 'minor',
        kind: 'age-up',
        message: `${checkpoint.label} выполнен поздно.`,
        evidence: `План ${formatDelta(checkpoint.targetTimeSec)}, факт ${formatDelta(checkpoint.actualTimeSec)} (${formatDelta(checkpoint.deltaSec!)}).`,
        certainty: 'confirmed',
      })
    }
  }
  return issues
}

function strengthsForReport(report: TrainerReport, actions: BuildActionAudit[]): BuildAuditFinding[] {
  const strengths: BuildAuditFinding[] = []
  for (const checkpoint of report.checkpoints) {
    if (!checkpoint.ok) continue
    if (checkpoint.kind === 'villagers') {
      strengths.push({
        kind: 'villagers',
        message: `${checkpoint.label}: темп крестьян выдержан.`,
        evidence: `${checkpoint.actualVillagers} против цели ${checkpoint.targetVillagers} (допуск ±2).`,
      })
    } else {
      strengths.push({
        kind: 'timing',
        message: `${checkpoint.label}: тайминг в норме.`,
        evidence: `План ${formatDelta(checkpoint.targetTimeSec)}, факт ${formatDelta(checkpoint.actualTimeSec ?? checkpoint.targetTimeSec)}.`,
      })
    }
  }
  for (const action of actions) {
    if (action.status !== 'ok' || !action.actual) continue
    strengths.push({
      kind: 'action',
      message: `Подтверждено: ${action.note}.`,
      evidence: `Событие «${action.actual.name}» выполнено в ${formatDelta(action.actual.timeSec)} при плане ${formatDelta(action.targetTimeSec)}.`,
    })
  }
  return strengths
}

function coverageFor(
  player: PlayerSummary,
  report: TrainerReport | null,
  actions: BuildActionAudit[],
): BuildAuditCoverage {
  const timedCheckpoints = report?.checkpoints.length ?? 0
  const gradeableCheckpoints = report?.checkpoints.filter((checkpoint) => checkpoint.ok != null).length ?? 0
  const matchedActions = actions.filter((action) => action.actual != null).length
  const expectedActions = actions.length
  const eventCount = player.buildOrder.length
  const confidence =
    eventCount === 0
      ? 'none'
      : gradeableCheckpoints > 0 && (expectedActions === 0 || matchedActions > 0)
        ? 'high'
        : gradeableCheckpoints > 0 || matchedActions > 0
          ? 'medium'
          : 'low'
  return { eventCount, timedCheckpoints, gradeableCheckpoints, matchedActions, expectedActions, confidence }
}

/**
 * Compares one decoded player timeline with one normalized reference build.
 * Only actions visible in STLS are called errors; worker allocation, rally
 * points and scouting remain explicitly outside the evidence boundary.
 */
export function comparePlayerToBuild(input: {
  player: PlayerSummary
  civ: string | null
  reference: BuildOrder | null
  referenceCandidates?: number
  referenceReason?: PlayerBuildAudit['referenceReason']
  referenceFitScore?: number | null
  referenceMatchedActions?: number
  referenceExpectedActions?: number
  referenceConfidence?: PlayerBuildAudit['referenceConfidence']
}): PlayerBuildAudit {
  const {
    player,
    civ,
    reference,
    referenceCandidates = reference ? 1 : 0,
    referenceReason = reference ? 'best-match' : 'none',
    referenceFitScore = null,
    referenceMatchedActions = 0,
    referenceExpectedActions = 0,
    referenceConfidence = 'none',
  } = input
  if (!reference || !civ) {
    return {
      player,
      civ,
      reference: null,
      report: null,
      actions: [],
      issues: [{
        severity: 'info',
        kind: 'coverage',
        message: 'Для этой цивилизации нет совместимого локального билд-ордера.',
        evidence: 'Сверка действий не выполнялась, чтобы не сравнивать игрока с чужим билдом.',
      }],
      improvements: [],
      strengths: [],
      coverage: {
        eventCount: player.buildOrder.length,
        timedCheckpoints: 0,
        gradeableCheckpoints: 0,
        matchedActions: 0,
        expectedActions: 0,
        confidence: player.buildOrder.length > 0 ? 'low' : 'none',
      },
      referenceCandidates,
      referenceReason: 'none',
      referenceFitScore,
      referenceMatchedActions,
      referenceExpectedActions,
      referenceConfidence,
      hasTimeline: player.buildOrder.length > 0,
    }
  }

  const report = gradeBuildFollow({ reference, events: player.buildOrder, civ })
  const issues = issuesForReport(report)
  const actions: BuildActionAudit[] = []
  for (let i = 0; i < reference.build_order.length; i++) {
    const step = reference.build_order[i]
    if (!step?.time) continue
    const targetTimeSec = parseDuration(step.time)
    if (targetTimeSec == null) continue
    for (const note of expectedActionNotes(reference, i)) {
      const expectedCategory = actionCategory(note)
      const actual = nearestAction(note, targetTimeSec, player.buildOrder, expectedCategory)
      const status: BuildAuditStatus = actual
        ? Math.abs(actual.timeSec - targetTimeSec) <= TIMING_TOLERANCE_SEC
          ? 'ok'
          : actual.timeSec > targetTimeSec
            ? 'late'
            : 'early'
        : 'missing'
      actions.push({ stepIndex: i, targetTimeSec, note, expectedCategory, actual, status })
      if (status === 'missing') {
        issues.push({
          severity: 'minor',
          kind: 'missing-action',
          message: `Нужно проверить действие около ${step.time}: ${note}.`,
          evidence: 'В расшифрованном STLS-таймлайне нет подходящего события в окне ±3:00; это не доказывает, что действие не было выполнено.',
          certainty: 'review',
        })
      } else if (status === 'late' || status === 'early') {
        issues.push({
          severity: Math.abs(actual!.timeSec - targetTimeSec) > 120 ? 'major' : 'minor',
          kind: 'action-timing',
          message: `${status === 'late' ? 'Позднее' : 'Раннее'} действие около ${step.time}: ${note}.`,
          evidence: `План ${formatDelta(targetTimeSec)}, факт ${formatDelta(actual!.timeSec)} (${formatDelta(actual!.timeSec - targetTimeSec)}).`,
          certainty: 'confirmed',
        })
      }
    }
  }

  return {
    player,
    civ,
    reference,
    report,
    actions,
    issues,
    improvements: issues.filter((issue) => issue.kind !== 'coverage'),
    strengths: strengthsForReport(report, actions),
    coverage: coverageFor(player, report, actions),
    referenceCandidates,
    referenceReason,
    referenceFitScore,
    referenceMatchedActions,
    referenceExpectedActions,
    referenceConfidence,
    hasTimeline: player.buildOrder.length > 0,
  }
}
