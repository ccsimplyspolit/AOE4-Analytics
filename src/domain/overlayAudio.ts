/**
 * Synthesized audio cue generator using Web Audio API in renderer environments.
 * Safe for node / non-DOM environments where AudioContext is undefined.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let globalAudioCtx: any = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAudioContext(): any {
  if (typeof globalThis === 'undefined') return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = globalThis as any
    if (!globalAudioCtx) {
      const AudioCtxClass = env.AudioContext || env.webkitAudioContext
      if (AudioCtxClass) {
        globalAudioCtx = new AudioCtxClass()
      }
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended' && typeof globalAudioCtx.resume === 'function') {
      void globalAudioCtx.resume()
    }
    return globalAudioCtx
  } catch {
    return null
  }
}

export type CueType = 'checkpoint' | 'urgent' | 'step_change' | 'chime'

/**
 * Plays a synthetic chime/ping audio cue.
 * @param volume Normalized volume [0, 1], default 0.35
 * @param type Sound preset
 */
export function playAudioCue(volume = 0.35, type: CueType = 'checkpoint'): void {
  if (volume <= 0) return

  const ctx = getAudioContext()
  if (!ctx || typeof ctx.createGain !== 'function' || typeof ctx.createOscillator !== 'function') return

  try {
    const now: number = ctx.currentTime
    const gainNode = ctx.createGain()
    gainNode.connect(ctx.destination)

    // Master volume clamp
    const safeVol = Math.max(0.01, Math.min(1, volume))

    if (type === 'checkpoint') {
      // Gentle dual-tone ascending ping (523Hz C5 -> 659Hz E5)
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()

      osc1.type = 'sine'
      osc2.type = 'sine'

      osc1.frequency.setValueAtTime(523.25, now)
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.08)

      osc2.frequency.setValueAtTime(783.99, now + 0.04) // G5

      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(safeVol * 0.4, now + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

      osc1.connect(gainNode)
      osc2.connect(gainNode)

      osc1.start(now)
      osc2.start(now + 0.04)

      osc1.stop(now + 0.36)
      osc2.stop(now + 0.36)
    } else if (type === 'urgent') {
      // High-priority subtle double pulse (784Hz -> 880Hz)
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(783.99, now)
      osc.frequency.setValueAtTime(880, now + 0.1)

      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(safeVol * 0.5, now + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.28)

      osc.connect(gainNode)
      osc.start(now)
      osc.stop(now + 0.3)
    } else if (type === 'step_change') {
      // Very soft woodblock-like tap for worker split update
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, now)
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.06)

      gainNode.gain.setValueAtTime(safeVol * 0.3, now)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

      osc.connect(gainNode)
      osc.start(now)
      osc.stop(now + 0.14)
    } else {
      // Default harmonic chime
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(600, now)
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.15)

      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(safeVol * 0.4, now + 0.03)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

      osc.connect(gainNode)
      osc.start(now)
      osc.stop(now + 0.42)
    }
  } catch {
    // Audio context failed or disallowed by autoplay policy — fail silently
  }
}
