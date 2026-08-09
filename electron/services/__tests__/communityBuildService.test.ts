import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  importCommunityBuild,
  listAoe4GuidesBuilds,
  listCommunityBuilds,
  parseAge4BuilderPayload,
  parseAoe4GuidesBuild,
} from '../communityBuildService'

afterEach(() => vi.unstubAllGlobals())

describe('AOE4 Builds importer', () => {
  it('normalizes the provider text export into overlay build steps', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          'English Dark Age Boom\n\n* (2/2/2/0)\t\tQueue Scout from TC\n* (6/3/2/0)\t4:00\tAge up with Council Hall\n\nCreated By: BeastyQT',
          { status: 200 },
        ),
      ),
    )
    const result = await importCommunityBuild('https://aoeivbuilds.com/build_orders/16')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.name).toBe('English Dark Age Boom')
    expect(result.data.provider).toBe('aoeivbuilds')
    expect(result.data.build_order[1]?.time).toBe('4:00')
    expect(result.data.build_order[1]?.age).toBe(2)
    expect(result.data.author).toBe('BeastyQT')
  })

  it('parses the server-rendered catalogue and filters it by search text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          `<div id="build_order_16" class="build-order">
            <div class="build-order__image"><img alt="English" src="/img/eng.png"></div>
            <div class="build-order__title"><a href="/build_orders/16">English Dark Age Farm Boom</a><p>Fast farm economy</p></div>
            <div class="build-order__details"><p>Open</p><p>Economic</p><p>Easy</p></div>
            <div class="build-order__creation-info"><p>Created By: BeastyQT</p><p>Uploaded By: Alice</p><p>Views: 47712</p><p>Likes: <span>98%</span></p></div>
          </div><a href="/?page=2">Next</a>`,
          { status: 200, headers: { 'Content-Type': 'text/html' } },
        ),
      ),
    )
    const result = await listCommunityBuilds({ query: 'farm', page: 1 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.items).toHaveLength(1)
    expect(result.data.items[0]).toMatchObject({
      id: '16',
      name: 'English Dark Age Farm Boom',
      civilization: 'English',
      strategy: 'Economic',
      author: 'BeastyQT',
      views: 47712,
    })
    expect(result.data.hasNext).toBe(true)
  })
})

describe('AoE4Guides importer', () => {
  it('lists a typed online catalogue slice and filters it locally', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify([
            {
              id: 'eng-1',
              title: 'English Longbow Pressure',
              civ: 'ENG',
              creatorName: 'BeastyQT',
              score: 92,
              views: 1000,
              likes: 88,
              steps: [
                {
                  type: 'age',
                  age: 1,
                  steps: [{ time: '0:00', food: 6, description: 'Open with sheep' }],
                },
              ],
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )
    const result = await listAoe4GuidesBuilds({ query: 'longbow', civilization: 'ENG', sort: 'score' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.sort).toBe('score')
    expect(result.data.items[0]).toMatchObject({
      id: 'eng-1',
      civilization: 'English',
      author: 'BeastyQT',
      score: 92,
      stepCount: 1,
    })
    expect(result.data.items[0]?.build.source).toBe('https://aoe4guides.com/builds/eng-1')
  })

  it('rejects unknown typed civilization filters before fetching', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const result = await listAoe4GuidesBuilds({ civilization: 'XXX' })
    expect(result.ok).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('normalizes API groups, timings, metadata, and provider image tokens', () => {
    const result = parseAoe4GuidesBuild(
      {
        id: 'abc',
        title: 'Mongol opener',
        civ: 'MON',
        creatorName: 'Valdemar',
        timeUpdated: { _seconds: 1_700_000_000 },
        steps: [
          {
            type: 'age',
            age: 1,
            steps: [
              {
                time: '0:00',
                food: '5',
                builders: '1',
                description: '<img src="/assets/pictures/unit_mongols/khan-1.webp" /> Rally sheep',
              },
            ],
          },
          {
            type: 'ageUp',
            age: 1,
            steps: [{ time: '2:30', food: '4', wood: '6+', description: 'Build landmark' }],
          },
        ],
      },
      'https://aoe4guides.com/builds/abc',
    )
    expect(result?.provider).toBe('aoe4guides')
    expect(result?.civilization).toBe('Mongols')
    expect(result?.build_order).toHaveLength(2)
    expect(result?.build_order[0]?.resources.builder).toBe(1)
    expect(result?.build_order[0]?.notes[0]).toContain('@units/khan-1@')
    expect(result?.build_order[1]?.age).toBe(2)
  })

  it('fetches a live AoE4Guides API build by URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            title: 'English opener',
            civ: 'ENG',
            steps: [{ type: 'age', age: 1, steps: [{ time: '0:00', food: '6', description: 'Queue villager' }] }],
          }),
        ),
      ),
    )
    const result = await importCommunityBuild('https://aoe4guides.com/builds/abc')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.name).toBe('English opener')
  })
})

describe('age4builder importer', () => {
  it('normalizes the legacy six-column payload', () => {
    const result = parseAge4BuilderPayload(
      '0:00|5|0|0|0|Queue villager|2:30|4|6|0|0|Age up with Council Hall|',
      'English',
      'https://age4builder.com/build.html?c=EN&b=payload',
    )
    expect(result?.provider).toBe('age4builder')
    expect(result?.build_order).toHaveLength(2)
    expect(result?.build_order[1]?.time).toBe('2:30')
    expect(result?.build_order[1]?.age).toBe(2)
  })
})
