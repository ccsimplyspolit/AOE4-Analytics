import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { neoDlpCandidateHomes, neoDlpYtdlpArgs, resolveNeoDlpToolchain } from '../neoDlpToolchain'

describe('NeoDLP toolchain', () => {
  it('prefers NEODLP_HOME over LocalAppData', () => {
    const homes = neoDlpCandidateHomes({
      NEODLP_HOME: 'D:\\Tools\\NeoDLP',
      LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local',
    })
    expect(homes[0]).toBe('D:\\Tools\\NeoDLP')
    expect(homes).toContain('C:\\Users\\me\\AppData\\Local\\NeoDLP')
  })

  it('resolves yt-dlp, ffmpeg, and the PO-token server from a NeoDLP folder', () => {
    const home = mkdtempSync(join(tmpdir(), 'neodlp-'))
    writeFileSync(join(home, 'yt-dlp.exe'), '')
    writeFileSync(join(home, 'ffmpeg.exe'), '')
    writeFileSync(join(home, 'neodlp-pot.exe'), '')
    const toolchain = resolveNeoDlpToolchain({
      NEODLP_HOME: home,
      LOCALAPPDATA: join(home, 'missing'),
    })
    expect(toolchain?.home).toBe(home)
    expect(toolchain?.ytdlp).toContain('yt-dlp.exe')
    expect(neoDlpYtdlpArgs(toolchain!)).toEqual(['--ffmpeg-location', home])
  })
})
