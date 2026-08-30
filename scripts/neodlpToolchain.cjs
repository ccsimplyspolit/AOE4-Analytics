'use strict'

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const POT_PING = 'http://127.0.0.1:4416/ping'

function candidateHomes(env = process.env) {
  return [
    ...new Set(
      [env.NEODLP_HOME, env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'NeoDLP')].filter(Boolean),
    ),
  ]
}

function resolveNeoDlpHome(env = process.env) {
  for (const home of candidateHomes(env)) {
    if (fs.existsSync(path.join(home, 'yt-dlp.exe')) && fs.existsSync(path.join(home, 'ffmpeg.exe'))) {
      return home
    }
  }
  return null
}

function ytdlpArgs(home) {
  const args = ['--ffmpeg-location', home]
  const pluginDir = path.join(home, 'yt-dlp-plugins')
  if (fs.existsSync(pluginDir)) args.push('--plugin-dirs', pluginDir)
  return args
}

async function isPotRunning(timeoutMs = 1500) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(POT_PING, { signal: controller.signal })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

async function ensurePotServer(home = resolveNeoDlpHome()) {
  if (!home) return false
  if (await isPotRunning()) return true
  const pot = path.join(home, 'neodlp-pot.exe')
  if (!fs.existsSync(pot)) return false
  const child = spawn(pot, ['server', '--host', '127.0.0.1', '--port', '4416'], {
    windowsHide: true,
    detached: true,
    stdio: 'ignore',
    cwd: home,
  })
  child.unref()
  const deadline = Date.now() + 8000
  while (Date.now() < deadline) {
    if (await isPotRunning(800)) return true
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  return isPotRunning()
}

module.exports = { resolveNeoDlpHome, ytdlpArgs, ensurePotServer, isPotRunning }
