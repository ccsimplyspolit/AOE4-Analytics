/**
 * Match Recap Share Card (Pure Drawing Engine).
 *
 * Renders a high-resolution 1200x675 infographic summary card on a 2D canvas context,
 * including matchup details, economy metrics, TC idle uptime, combat stats,
 * and coach verdicts.
 */

import { civDisplayName } from './civ'

export interface ShareCardInput {
  matchId: string | number
  result: 'win' | 'loss' | 'unknown' | null
  myCiv: string | null
  oppCiv: string | null
  myPlayerName: string | null
  oppPlayerName: string | null
  myRating?: number | null
  oppRating?: number | null
  mapName: string | null
  durationSec: number | null
  kills?: number | null
  deaths?: number | null
  villagersHigh?: number | null
  tcIdleSec?: number | null
  tcUptimePercent?: number | null
  resourceFloatGrade?: string | null
  apm?: number | null
  feudalTimingSec?: number | null
  castleTimingSec?: number | null
  coachVerdict?: string | null
  secondarySignal?: string | null
}

export interface ShareCardCanvasGradient {
  addColorStop(offset: number, color: string): void
}

export interface ShareCardCanvasContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fillStyle: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  strokeStyle: any
  lineWidth: number
  font: string
  fillRect(x: number, y: number, w: number, h: number): void
  strokeRect(x: number, y: number, w: number, h: number): void
  fillText(text: string, x: number, y: number): void
  measureText(text: string): { width: number }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): any
}

function formatDuration(sec: number | null | undefined): string {
  if (sec == null || sec <= 0) return '--:--'
  const m = Math.floor(sec / 60)
  const s = String(Math.floor(sec % 60)).padStart(2, '0')
  return `${m}:${s}`
}

function roundVal(val: number | null | undefined, fallback = '-'): string {
  return val != null ? String(Math.round(val)) : fallback
}

/**
 * Draws the complete match recap card directly to any 2D canvas-compatible context.
 */
export function drawShareCard(ctx: ShareCardCanvasContext, input: ShareCardInput, width = 1200, height = 675): void {
  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height)
  bgGrad.addColorStop(0, '#090d16')
  bgGrad.addColorStop(0.5, '#0f172a')
  bgGrad.addColorStop(1, '#050811')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, width, height)

  // Outer border
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 4
  ctx.strokeRect(10, 10, width - 20, height - 20)

  // Top header bar
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(10, 10, width - 20, 60)

  // Brand title
  ctx.fillStyle = '#f59e0b'
  ctx.font = 'bold 22px "Cinzel", "Segoe UI", sans-serif'
  ctx.fillText('RTSLYTICS', 35, 48)

  ctx.fillStyle = '#94a3b8'
  ctx.font = '16px "Segoe UI", sans-serif'
  ctx.fillText('·  MATCH RECAP & FORENSICS', 170, 47)

  // Map & Duration badge on top right
  const mapStr = `${input.mapName || 'Unknown Map'}  •  ${formatDuration(input.durationSec)}`
  ctx.font = 'bold 16px "Segoe UI", sans-serif'
  ctx.fillStyle = '#cbd5e1'
  const mapWidth = ctx.measureText(mapStr).width
  ctx.fillText(mapStr, width - mapWidth - 35, 47)

  // Matchup Banner (Left vs Right)
  const isWin = input.result === 'win'
  const isLoss = input.result === 'loss'
  const resultColor = isWin ? '#22c55e' : isLoss ? '#ef4444' : '#94a3b8'
  const resultText = isWin ? 'VICTORY' : isLoss ? 'DEFEAT' : 'COMPLETED'

  // Left Player Box (You)
  ctx.fillStyle = isWin ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)'
  ctx.fillRect(40, 95, 460, 110)
  ctx.strokeStyle = isWin ? '#15803d' : isLoss ? '#b91c1c' : '#334155'
  ctx.lineWidth = 1.5
  ctx.strokeRect(40, 95, 460, 110)

  // Result Badge
  ctx.fillStyle = resultColor
  ctx.font = 'bold 15px "Segoe UI", sans-serif'
  ctx.fillText(resultText, 60, 128)

  // Left Name & Civ
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 26px "Segoe UI", sans-serif'
  ctx.fillText(input.myPlayerName || 'You', 60, 162)

  const myCivText = `${civDisplayName(input.myCiv || 'Unknown')}${input.myRating ? `  (${input.myRating} ELO)` : ''}`
  ctx.fillStyle = '#94a3b8'
  ctx.font = '16px "Segoe UI", sans-serif'
  ctx.fillText(myCivText, 60, 188)

  // Center "VS"
  ctx.fillStyle = '#64748b'
  ctx.font = 'bold 28px "Cinzel", "Segoe UI", sans-serif'
  ctx.fillText('VS', 580, 160)

  // Right Player Box (Opponent)
  ctx.fillStyle = 'rgba(30, 41, 59, 0.4)'
  ctx.fillRect(700, 95, 460, 110)
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 1.5
  ctx.strokeRect(700, 95, 460, 110)

  ctx.fillStyle = '#94a3b8'
  ctx.font = 'bold 15px "Segoe UI", sans-serif'
  ctx.fillText('OPPONENT', 720, 128)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 26px "Segoe UI", sans-serif'
  ctx.fillText(input.oppPlayerName || 'Opponent', 720, 162)

  const oppCivText = `${civDisplayName(input.oppCiv || 'Unknown')}${input.oppRating ? `  (${input.oppRating} ELO)` : ''}`
  ctx.fillStyle = '#94a3b8'
  ctx.font = '16px "Segoe UI", sans-serif'
  ctx.fillText(oppCivText, 720, 188)

  // Metrics Grid (4 Cards)
  const cardY = 230
  const cardW = 265
  const cardH = 180
  const gap = 20
  const startX = 40

  const metrics = [
    {
      title: '⚔️ COMBAT & APM',
      val1Label: 'Kills / Deaths',
      val1: `${roundVal(input.kills, '0')} / ${roundVal(input.deaths, '0')}`,
      val2Label: 'Actions / Min',
      val2: input.apm ? `${Math.round(input.apm)} APM` : '--',
    },
    {
      title: '🏰 AGE TIMINGS',
      val1Label: 'Feudal Age (II)',
      val1: formatDuration(input.feudalTimingSec),
      val2Label: 'Castle Age (III)',
      val2: formatDuration(input.castleTimingSec),
    },
    {
      title: '🌾 ECONOMY & TC',
      val1Label: 'Villager Peak',
      val1: roundVal(input.villagersHigh, '--'),
      val2Label: 'TC Uptime (15m)',
      val2: input.tcUptimePercent != null ? `${input.tcUptimePercent}%` : '--',
    },
    {
      title: '🪙 MACRO EFFICIENCY',
      val1Label: 'TC Idle Time',
      val1: input.tcIdleSec != null ? `${Math.round(input.tcIdleSec)}s` : '--',
      val2Label: 'Resource Float',
      val2: input.resourceFloatGrade ? `Grade ${input.resourceFloatGrade}` : 'Grade A',
    },
  ]

  for (let i = 0; i < metrics.length; i++) {
    const m = metrics[i]!
    const cx = startX + i * (cardW + gap)

    ctx.fillStyle = '#131d31'
    ctx.fillRect(cx, cardY, cardW, cardH)
    ctx.strokeStyle = '#223249'
    ctx.lineWidth = 1
    ctx.strokeRect(cx, cardY, cardW, cardH)

    ctx.fillStyle = '#f59e0b'
    ctx.font = 'bold 14px "Segoe UI", sans-serif'
    ctx.fillText(m.title, cx + 18, cardY + 32)

    // Stat 1
    ctx.fillStyle = '#94a3b8'
    ctx.font = '13px "Segoe UI", sans-serif'
    ctx.fillText(m.val1Label, cx + 18, cardY + 70)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 22px "Segoe UI", sans-serif'
    ctx.fillText(m.val1, cx + 18, cardY + 98)

    // Stat 2
    ctx.fillStyle = '#94a3b8'
    ctx.font = '13px "Segoe UI", sans-serif'
    ctx.fillText(m.val2Label, cx + 18, cardY + 130)

    ctx.fillStyle = '#38bdf8'
    ctx.font = 'bold 20px "Segoe UI", sans-serif'
    ctx.fillText(m.val2, cx + 18, cardY + 156)
  }

  // Bottom Coach Section
  const coachY = 435
  const coachW = width - 80
  const coachH = 175

  ctx.fillStyle = '#101a2d'
  ctx.fillRect(40, coachY, coachW, coachH)
  ctx.strokeStyle = '#1e3a8a'
  ctx.lineWidth = 1
  ctx.strokeRect(40, coachY, coachW, coachH)

  ctx.fillStyle = '#38bdf8'
  ctx.font = 'bold 15px "Segoe UI", sans-serif'
  ctx.fillText('🧠 COACH VERDICT & TURNING POINTS', 65, coachY + 36)

  const verdict =
    input.coachVerdict ||
    (isWin
      ? 'Strong overall execution and macro cadence secured dominant board control.'
      : 'Review TC uptime and production building count to sustain military transitions.')
  ctx.fillStyle = '#f8fafc'
  ctx.font = '18px "Segoe UI", sans-serif'
  ctx.fillText(verdict, 65, coachY + 75)

  if (input.secondarySignal) {
    ctx.fillStyle = '#94a3b8'
    ctx.font = '15px "Segoe UI", sans-serif'
    ctx.fillText(`• ${input.secondarySignal}`, 65, coachY + 112)
  }

  // Footer Tag
  ctx.fillStyle = '#64748b'
  ctx.font = '13px "Segoe UI", sans-serif'
  ctx.fillText(`Generated by RTSLytics · Age of Empires IV Analytics · Match #${input.matchId}`, 65, coachY + 150)
}
