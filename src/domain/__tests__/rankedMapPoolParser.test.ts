import { describe, expect, it } from 'vitest'
import { parseOfficialMapPoolPost } from '../rankedMapPoolParser'

const maps = (prefix: string) => Array.from({ length: 9 }, (_, index) => `${prefix} ${index + 1}`)

function post(content: string, overrides: Partial<{ title: string; date: string }> = {}) {
  return {
    id: 77,
    link: 'https://www.ageofempires.com/news/map-pool/',
    title: overrides.title ?? 'Update 16.2.10884',
    date: overrides.date ?? '2026-08-01T12:00:00Z',
    content,
  }
}

function validPost() {
  const solo = maps('Solo')
  const team = maps('Team')
  return {
    post: post(`
      <h2>Ranked Map Pool</h2>
      <h4>1v1:</h4>
      <ul>${solo.map((map) => `<li><strong>${map}</strong></li>`).join('')}</ul>
      <h4>Team Game:</h4>
      <ul>${team.map((map) => `<li>${map}</li>`).join('')}</ul>
    `),
    solo,
    team,
  }
}

describe('parseOfficialMapPoolPost', () => {
  it('parses both queues and extracts the patch from update titles', () => {
    const fixture = validPost()
    const snapshot = parseOfficialMapPoolPost(fixture.post)
    expect(snapshot).toMatchObject({
      snapshotId: 'official-post-77',
      patch: '16.2.10884',
      effectiveFrom: '2026-08-01',
      effectiveUntil: '2026-09-01',
      solo: fixture.solo,
      team: fixture.team,
    })
  })

  it('decodes HTML entities before returning map labels', () => {
    const solo = ['Dry&nbsp;Arabia', ...maps('Solo').slice(1)]
    const team = ['King &amp; Castle', ...maps('Team').slice(1)]
    const snapshot = parseOfficialMapPoolPost(
      post(`
        <h3>Ranked Map Pool</h3><h5>1v1</h5>
        <ul>${solo.map((map) => `<li>${map}</li>`).join('')}</ul>
        <h5>Team Game</h5>
        <ul>${team.map((map) => `<li>${map}</li>`).join('')}</ul>
      `),
    )
    expect(snapshot?.solo[0]).toBe('Dry Arabia')
    expect(snapshot?.team[0]).toBe('King & Castle')
  })

  it('rejects posts without the ranked map pool heading', () => {
    const fixture = validPost()
    expect(
      parseOfficialMapPoolPost({ ...fixture.post, content: '<h2>Patch notes</h2>' }),
    ).toBeNull()
  })

  it('rejects incomplete or duplicate queue lists', () => {
    const fixture = validPost()
    const duplicateSolo = [...fixture.solo.slice(0, 8), fixture.solo[0]]
    expect(
      parseOfficialMapPoolPost(
        post(`
          <h2>Ranked Map Pool</h2><h4>1v1</h4>
          <ul>${duplicateSolo.map((map) => `<li>${map}</li>`).join('')}</ul>
          <h4>Team Game</h4>
          <ul>${fixture.team.map((map) => `<li>${map}</li>`).join('')}</ul>
        `),
      ),
    ).toBeNull()
  })

  it('rejects malformed dates instead of creating misleading effective ranges', () => {
    const fixture = validPost()
    expect(parseOfficialMapPoolPost({ ...fixture.post, date: 'not-a-date' })).toBeNull()
  })

  it('accepts patch wording other than the literal Update prefix', () => {
    const fixture = validPost()
    const snapshot = parseOfficialMapPoolPost({
      ...fixture.post,
      title: 'Balance Patch 17.0.1',
    })
    expect(snapshot?.patch).toBe('17.0.1')
  })
})
