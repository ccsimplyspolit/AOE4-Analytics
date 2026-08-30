import { describe, expect, it } from 'vitest'
import { localizeGeneratedRu } from '../localizeGeneratedCopy'

describe('localizeGeneratedRu', () => {
  it('translates turning-point facts from the match page without mixing languages', () => {
    expect(localizeGeneratedRu('You reached Feudal Age at 4:17.')).toBe(
      'Вы достигли Феодальную эпоху в 4:17.',
    )
    expect(
      localizeGeneratedRu(
        'Your recorded military score rose by 890 during this interval.',
      ),
    ).toContain('армии')
    expect(
      localizeGeneratedRu('Your recorded bank peaked at 13431 total resources at 38:20.'),
    ).toBe('Ваш записанный запас достиг пика в 13431 суммарных ресурсов в 38:20.')
    expect(
      localizeGeneratedRu(
        'No villager completion was recorded for 4:23, from 38:23 to 42:47.',
      ),
    ).toMatch(/крестьян/)
    expect(localizeGeneratedRu('Longest villager-production gap')).toMatch(/крестьян/)
    expect(
      localizeGeneratedRu('Spearman was the first recorded non-villager unit, completed at 5:03.'),
    ).not.toMatch(/was the first/)
  })

  it('translates first-cause review copy instead of substituting unit names into English', () => {
    expect(localizeGeneratedRu('Opening health')).toBe('Старт игры')
    expect(localizeGeneratedRu('Trigger')).toBe('Условие')
    expect(localizeGeneratedRu('Action')).toBe('Действие')
    expect(
      localizeGeneratedRu(
        'No villager completion was recorded for 0:40, from 4:23 to 5:03.',
      ),
    ).not.toMatch(/villager/i)
    expect(
      localizeGeneratedRu('At 8:00 the bank held 870 food but only 138 wood.'),
    ).toBe('В 8:00 в запасе было 870 еды и только 138 дерева.')
    expect(
      localizeGeneratedRu(
        'A smaller army arriving together can beat larger staggered armies. Assign pressure, protection, and economy roles, then rally the first useful timing.',
      ),
    ).not.toMatch(/Rally|Точка сбора the/)
  })

  it('translates match briefing templates', () => {
    expect(localizeGeneratedRu('Keep making villagers.')).toMatch(/крестьян/)
    expect(
      localizeGeneratedRu('Play Delhi Sultanate on-role; keep Town Center queued.'),
    ).toMatch(/Ратуш/)
    expect(
      localizeGeneratedRu('Play English on-role. First target is Bob (French).'),
    ).toMatch(/своей роли/)
  })
})
