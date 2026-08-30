/**
 * Match diagnostics engine — evaluates a LastMatchCoachContext and returns
 * a ranked list of fired ProTips based on trigger conditions.
 *
 * All logic is pure/deterministic — no side effects, no API calls.
 */

import type { LastMatchCoachContext } from './coachContext'
import {
  PRO_TIPS,
  type ProTip,
  type TipSeverity,
  buildTipVideoUrl,
} from './proTips'

export interface MatchDiagnostic {
  tip: ProTip
  /** Deep-link to the exact video timestamp. */
  videoUrl: string
  /** Computed severity (may be elevated based on result). */
  severity: TipSeverity
  /** Human-readable reason this tip was triggered. */
  reason: string
  reasonRu: string
}

export interface MatchDiagnosticsResult {
  /** All fired diagnostics, sorted: critical first, then important, then optional. */
  diagnostics: MatchDiagnostic[]
  /** Top 3 critical tips for quick-card display. */
  topThree: MatchDiagnostic[]
  /** Macro score label based on game context. */
  macroScoreLabel: string
  macroScoreLabelRu: string
}

const SEVERITY_ORDER: Record<TipSeverity, number> = {
  critical: 0,
  important: 1,
  optional: 2,
}

/**
 * Evaluates which ProTips apply to the given match context.
 * Returns tips sorted by severity descending.
 */
export function evaluateMatchDiagnostics(
  context: LastMatchCoachContext,
): MatchDiagnosticsResult {
  const { player, game, opponents } = context
  const durationSec = game.durationSec ?? 0
  const isLoss = player.result === 'loss'
  const isWin = player.result === 'win'
  const civSlug = player.civilization?.toLowerCase() ?? ''
  const mapName = (game.map ?? '').toLowerCase()
  const opponentCivs = opponents.map((o) => o.civilization?.toLowerCase() ?? '')

  const diagnostics: MatchDiagnostic[] = []

  for (const tip of PRO_TIPS) {
    const cond = tip.trigger

    // Check trigger conditions
    let fires = false
    let reason = ''
    let reasonRu = ''

    if (cond.always) {
      fires = true
      reason = 'Universal best practice from Beastyqt'
      reasonRu = 'Универсальный принцип от Beastyqt'
    } else {
      // Duration minimum
      if (cond.durationSecMin != null && durationSec < cond.durationSecMin) continue
      // Duration maximum
      if (cond.durationSecMax != null && durationSec > cond.durationSecMax) continue
      // Win/loss filter
      if (cond.onLoss && !isLoss) continue
      if (cond.onWin && !isWin) continue
      // Civ filter
      if (cond.civs != null && !cond.civs.includes(civSlug)) continue
      // Opponent civ filter
      if (
        cond.opponentCivs != null &&
        !cond.opponentCivs.some((c) => opponentCivs.includes(c))
      ) {
        continue
      }
      // Map filter
      if (cond.maps != null && !cond.maps.some((m) => mapName.includes(m))) continue

      fires = true

      // Build reason string
      if (cond.onLoss) {
        reason = `Triggered by match loss — ${tip.shortText.slice(0, 60)}`
        reasonRu = `Сработало из-за поражения — ${tip.shortTextRu.slice(0, 60)}`
      } else if (cond.durationSecMin != null) {
        const minStr = formatSec(cond.durationSecMin)
        reason = `Triggered for games longer than ${minStr}`
        reasonRu = `Срабатывает для игр дольше ${minStr}`
      } else {
        reason = 'Applies to this game context'
        reasonRu = 'Применимо к этому игровому контексту'
      }
    }

    if (!fires) continue

    // Elevate critical tips on losses
    let severity = tip.severity
    if (isLoss && tip.severity === 'important') severity = 'important'
    if (isLoss && tip.severity === 'optional') severity = 'optional'

    diagnostics.push({
      tip,
      videoUrl: buildTipVideoUrl(tip),
      severity,
      reason,
      reasonRu,
    })
  }

  // Sort: critical → important → optional
  diagnostics.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  )

  const topThree = diagnostics.filter((d) => d.severity === 'critical').slice(0, 3)

  const macroScoreLabel = computeMacroScoreLabel(durationSec, isLoss)
  const macroScoreLabelRu = computeMacroScoreLabelRu(durationSec, isLoss)

  return { diagnostics, topThree, macroScoreLabel, macroScoreLabelRu }
}

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s === 0 ? `${m}m` : `${m}m${s}s`
}

/**
 * Rough macro score based on match duration and result.
 * In the absence of in-game timing data, duration is a proxy:
 * quick wins → strong macro, long losses → macro breakdown.
 */
function computeMacroScoreLabel(durationSec: number, isLoss: boolean): string {
  if (!isLoss && durationSec < 480) return 'S — Dominant (sub-8 min win)'
  if (!isLoss && durationSec < 720) return 'A — Strong (sub-12 min win)'
  if (!isLoss && durationSec < 1200) return 'B — Solid (sub-20 min win)'
  if (isLoss && durationSec < 480) return 'C — Early collapse (<8 min loss)'
  if (isLoss && durationSec < 720) return 'C — Short loss — check army micro'
  if (isLoss && durationSec >= 720) return 'D — Extended loss — macro breakdown'
  return 'B — Moderate'
}

function computeMacroScoreLabelRu(durationSec: number, isLoss: boolean): string {
  if (!isLoss && durationSec < 480) return 'S — Доминирование (победа до 8 мин)'
  if (!isLoss && durationSec < 720) return 'A — Сильно (победа до 12 мин)'
  if (!isLoss && durationSec < 1200) return 'B — Уверенно (победа до 20 мин)'
  if (isLoss && durationSec < 480) return 'C — Ранний распад (<8 мин поражение)'
  if (isLoss && durationSec < 720) return 'C — Короткое поражение — проверь микро'
  if (isLoss && durationSec >= 720) return 'D — Затяжное поражение — проблемы с макро'
  return 'B — Умеренно'
}