import { describe, expect, it, vi } from 'vitest'
import { drawShareCard, type ShareCardCanvasContext, type ShareCardInput } from '../matchShareCard'

describe('Match Share Card Canvas Engine', () => {
  it('draws all sections without throwing errors on standard context', () => {
    const mockCtx: ShareCardCanvasContext = {
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 120 })),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
    }

    const sampleInput: ShareCardInput = {
      matchId: '12345678',
      result: 'win',
      myCiv: 'english',
      oppCiv: 'french',
      myPlayerName: 'VortiX',
      oppPlayerName: 'LucifroN',
      myRating: 1540,
      oppRating: 1510,
      mapName: 'Dry Arabia',
      durationSec: 1350,
      kills: 42,
      deaths: 18,
      villagersHigh: 78,
      tcIdleSec: 32,
      tcUptimePercent: 96,
      resourceFloatGrade: 'S',
      apm: 240,
      feudalTimingSec: 260,
      castleTimingSec: 680,
      coachVerdict: 'Decisive feudal aggression forced high villager idle on opponent.',
      secondarySignal: 'No major TC idle windows observed in the first 15 minutes.',
    }

    expect(() => drawShareCard(mockCtx, sampleInput, 1200, 675)).not.toThrow()
    expect(mockCtx.fillRect).toHaveBeenCalled()
    expect(mockCtx.fillText).toHaveBeenCalled()
  })
})
