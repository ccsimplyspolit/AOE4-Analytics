import { describe, expect, it } from 'vitest'
import { BUNDLED_BUILD_ORDERS } from '../buildOrders'

function buildIdentity(civilization: string | string[], name: string): string {
  const labels = Array.isArray(civilization) ? civilization : [civilization]
  const compact = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '')
  return `${labels.map(compact).join('|')}::${compact(name)}`
}

describe('bundled build archive', () => {
  it('does not expose duplicate civilization/title entries', () => {
    const identities = BUNDLED_BUILD_ORDERS.map((build) =>
      buildIdentity(build.civilization, build.name),
    )

    expect(new Set(identities).size).toBe(identities.length)
  })
})
