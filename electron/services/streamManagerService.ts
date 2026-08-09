import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  OverlayUpdatePayload,
  StreamLiveOverride,
  StreamManagerState,
  StreamManagerStatus,
  StreamManagerTheme,
} from '@ipc/contract'

const DEFAULT_THEME: StreamManagerTheme = {
  accentColor: '#c7ab6a',
  backgroundStart: '#12151b',
  backgroundEnd: '#1f1b16',
  fontScale: 1,
  compact: false,
  customCss: '',
}

const DEFAULT_STATE: StreamManagerState = {
  visible: true,
  leftName: 'Home team',
  rightName: 'Away team',
  leftCiv: 'English',
  rightCiv: 'French',
  leftScore: 0,
  rightScore: 0,
  bestOf: 3,
  map: '—',
  maps: ['—'],
  mapIndex: 0,
  civDraft: { leftBans: [], rightBans: [], leftPicks: [], rightPicks: [] },
  caster: '',
  spoiler: false,
  countdownEndsAt: null,
  theme: DEFAULT_THEME,
  liveOverride: {
    left: { name: '', civ: '', rank: '' },
    right: { name: '', civ: '', rank: '' },
  },
  updatedAt: 0,
}

let server: Server | null = null
let port = 4174
let state: StreamManagerState = { ...DEFAULT_STATE }
/** Last live-game payload shared with the local OBS browser source. */
let livePayload: OverlayUpdatePayload | null = null

const CIV_FLAG_FILES: Record<string, string> = {
  abbasid_dynasty: 'abbasid.png',
  ayyubids: 'ayyubids.png',
  byzantines: 'byzantines.png',
  chinese: 'chinese.png',
  delhi_sultanate: 'delhi.png',
  english: 'english.png',
  french: 'french.png',
  golden_horde: 'goldenhorde.png',
  holy_roman_empire: 'hre.png',
  hre: 'hre.png',
  house_of_lancaster: 'lancaster.png',
  japanese: 'japanese.png',
  jeanne_darc: 'jeannedarc.png',
  jin_dynasty: 'jin_dynasty.png',
  knights_templar: 'templar.png',
  macedonian_dynasty: 'macedonian.png',
  malians: 'malians.png',
  mongols: 'mongols.png',
  order_of_the_dragon: 'orderofthedragon.png',
  ottomans: 'ottomans.png',
  rus: 'rus.png',
  sengoku_daimyo: 'sengoku.png',
  tughlaq_dynasty: 'tughlaq.png',
  zhu_xis_legacy: 'zhuxi.png',
}

function cloneState(): StreamManagerState {
  return { ...state }
}

function sendJson(res: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(body)
}

function sendHtml(res: ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(STREAM_OVERLAY_HTML)
}

function sendLiveHtml(res: ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(LIVE_OVERLAY_HTML)
}

function sendCivFlag(res: ServerResponse, civ: string): void {
  const filename = CIV_FLAG_FILES[civ]
  if (!filename) {
    res.writeHead(404)
    res.end()
    return
  }
  const sourceFile = join(process.cwd(), 'src', 'data', 'vendor', 'aoe4world-overlay', 'flags', filename)
  let file = existsSync(sourceFile) ? sourceFile : null
  if (!file) {
    const outputDir = join(__dirname, '..', 'renderer', 'assets')
    const stem = filename.slice(0, -'.png'.length)
    const bundled = existsSync(outputDir)
      ? readdirSync(outputDir, { withFileTypes: true }).find(
          (entry) =>
            entry.isFile() && entry.name.startsWith(`${stem}-`) && entry.name.endsWith('.png'),
        )
      : undefined
    file = bundled ? join(outputDir, bundled.name) : null
  }
  if (!file) {
    res.writeHead(404)
    res.end()
    return
  }
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=86400',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(readFileSync(file))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk: string) => {
      body += chunk
      if (body.length > 100_000) reject(new Error('Payload too large'))
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function sanitizePatch(input: unknown): Partial<StreamManagerState> {
  if (!input || typeof input !== 'object') return {}
  const raw = input as Record<string, unknown>
  const patch: Partial<StreamManagerState> = {}
  for (const key of ['leftName', 'rightName', 'leftCiv', 'rightCiv', 'map', 'caster'] as const) {
    if (typeof raw[key] === 'string') patch[key] = raw[key].slice(0, 80)
  }
  for (const key of ['leftScore', 'rightScore', 'bestOf'] as const) {
    if (typeof raw[key] === 'number' && Number.isFinite(raw[key])) {
      patch[key] = Math.max(0, Math.min(key === 'bestOf' ? 99 : 999, Math.round(raw[key])))
    }
  }
  if (typeof raw.visible === 'boolean') patch.visible = raw.visible
  if (typeof raw.spoiler === 'boolean') patch.spoiler = raw.spoiler
  if (Array.isArray(raw.maps)) {
    patch.maps = raw.maps
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.slice(0, 80))
      .slice(0, 9)
  }
  if (typeof raw.mapIndex === 'number' && Number.isFinite(raw.mapIndex)) {
    patch.mapIndex = Math.max(0, Math.min(8, Math.round(raw.mapIndex)))
  }
  if (raw.civDraft && typeof raw.civDraft === 'object') {
    const draft = raw.civDraft as Record<string, unknown>
    const list = (value: unknown) =>
      Array.isArray(value)
        ? value
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.slice(0, 60))
            .slice(0, 12)
        : []
    patch.civDraft = {
      leftBans: list(draft.leftBans),
      rightBans: list(draft.rightBans),
      leftPicks: list(draft.leftPicks),
      rightPicks: list(draft.rightPicks),
    }
  }
  if (raw.countdownEndsAt === null) patch.countdownEndsAt = null
  if (typeof raw.countdownEndsAt === 'number' && Number.isFinite(raw.countdownEndsAt)) {
    patch.countdownEndsAt = Math.max(0, raw.countdownEndsAt)
  }
  if (raw.theme && typeof raw.theme === 'object') {
    const theme = raw.theme as Record<string, unknown>
    const isHex = (value: unknown): value is string =>
      typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
    const nextTheme: StreamManagerTheme = {
      accentColor: isHex(theme.accentColor) ? theme.accentColor : DEFAULT_THEME.accentColor,
      backgroundStart: isHex(theme.backgroundStart)
        ? theme.backgroundStart
        : DEFAULT_THEME.backgroundStart,
      backgroundEnd: isHex(theme.backgroundEnd) ? theme.backgroundEnd : DEFAULT_THEME.backgroundEnd,
      fontScale:
        typeof theme.fontScale === 'number' && Number.isFinite(theme.fontScale)
          ? Math.max(0.75, Math.min(1.5, theme.fontScale))
          : DEFAULT_THEME.fontScale,
      compact: typeof theme.compact === 'boolean' ? theme.compact : DEFAULT_THEME.compact,
      customCss:
        typeof theme.customCss === 'string'
          ? theme.customCss.slice(0, 20_000)
          : DEFAULT_THEME.customCss,
    }
    patch.theme = nextTheme
  }
  if (raw.liveOverride && typeof raw.liveOverride === 'object') {
    const source = raw.liveOverride as Record<string, unknown>
    const side = (value: unknown): StreamLiveOverride['left'] => {
      const item = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
      return {
        name: typeof item.name === 'string' ? item.name.slice(0, 80) : '',
        civ: typeof item.civ === 'string' ? item.civ.slice(0, 80) : '',
        rank: typeof item.rank === 'string' ? item.rank.slice(0, 40) : '',
      }
    }
    patch.liveOverride = { left: side(source.left), right: side(source.right) }
  }
  return patch
}

function applyPatch(patch: Partial<StreamManagerState>): StreamManagerState {
  state = { ...state, ...sanitizePatch(patch), updatedAt: Date.now() }
  return cloneState()
}

function routeCommand(pathname: string): boolean {
  if (pathname === '/score/toggleScore') applyPatch({ visible: !state.visible })
  else if (pathname === '/score/toggleSpoiler') applyPatch({ spoiler: !state.spoiler })
  else if (pathname === '/score/addLeft') applyPatch({ leftScore: state.leftScore + 1 })
  else if (pathname === '/score/addRight') applyPatch({ rightScore: state.rightScore + 1 })
  else if (pathname === '/score/swapScore') {
    applyPatch({
      leftName: state.rightName,
      rightName: state.leftName,
      leftCiv: state.rightCiv,
      rightCiv: state.leftCiv,
      leftScore: state.rightScore,
      rightScore: state.leftScore,
    })
  } else return false
  return true
}

function handle(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }
  if (req.method === 'GET' && url.pathname === '/') return sendHtml(res)
  if (req.method === 'GET' && url.pathname === '/live') return sendLiveHtml(res)
  if (req.method === 'GET' && url.pathname.startsWith('/assets/civ/')) {
    const civ = decodeURIComponent(url.pathname.slice('/assets/civ/'.length)).replace(/\.png$/i, '')
    return sendCivFlag(res, civ)
  }
  if (req.method === 'GET' && url.pathname === '/api/state') return sendJson(res, 200, cloneState())
  if (req.method === 'GET' && url.pathname === '/api/live') {
    return sendJson(res, 200, applyLiveOverride(livePayload))
  }
  if (req.method === 'GET' && routeCommand(url.pathname)) return sendJson(res, 200, cloneState())
  if (req.method === 'POST' && url.pathname === '/api/state') {
    void readBody(req)
      .then((body) => {
        let parsed: unknown
        try {
          parsed = body ? JSON.parse(body) : {}
        } catch {
          return sendJson(res, 400, { error: 'Invalid JSON' })
        }
        sendJson(res, 200, applyPatch(sanitizePatch(parsed)))
      })
      .catch((error: unknown) =>
        sendJson(res, 400, { error: error instanceof Error ? error.message : 'Invalid payload' }),
      )
    return
  }
  sendJson(res, 404, { error: 'Not found' })
}

export function getStreamManagerStatus(): StreamManagerStatus {
  return { running: server !== null, port, state: cloneState() }
}

export function getStreamManagerState(): StreamManagerState {
  return cloneState()
}

export function updateStreamManagerState(patch: Partial<StreamManagerState>): StreamManagerState {
  return applyPatch(patch)
}

/** Publishes the same live payload used by the native in-game overlay. */
export function updateLiveOverlay(payload: OverlayUpdatePayload): void {
  livePayload = payload
}

/** Applies only the explicit caster fields to the first player of each side. */
function applyLiveOverride(payload: OverlayUpdatePayload | null): OverlayUpdatePayload | null {
  if (!payload || !state.liveOverride || !payload.matchup) return payload
  const override = state.liveOverride
  const teams = payload.matchup.teams.map((team, teamIndex) =>
    team.map((player, playerIndex) => {
      if (playerIndex !== 0) return player
      const side = teamIndex === 0 ? override.left : teamIndex === 1 ? override.right : null
      if (!side) return player
      return {
        ...player,
        ...(side.name ? { name: side.name } : {}),
        ...(side.civ ? { civ: side.civ } : {}),
        ...(side.rank ? { rankLevel: side.rank } : {}),
      }
    }),
  )
  return { ...payload, matchup: { ...payload.matchup, teams } }
}

export function resetStreamManagerState(): StreamManagerState {
  state = { ...DEFAULT_STATE, updatedAt: Date.now() }
  livePayload = null
  return cloneState()
}

export async function startStreamManager(requestedPort = 4174): Promise<StreamManagerStatus> {
  if (server) return getStreamManagerStatus()
  port = requestedPort
  server = createServer(handle)
  await new Promise<void>((resolve, reject) => {
    const current = server!
    current.once('error', reject)
    current.listen(port, '127.0.0.1', () => {
      current.off('error', reject)
      resolve()
    })
  })
  return getStreamManagerStatus()
}

export async function stopStreamManager(): Promise<void> {
  const current = server
  server = null
  if (!current) return
  await new Promise<void>((resolve) => current.close(() => resolve()))
}

export function disposeStreamManager(): void {
  if (server) server.close()
  server = null
}

/**
 * Local equivalent of AoE4World's personalized browser-source bar. It is fed by
 * the native poller, hides itself outside an ongoing match, supports top/floating
 * placement, and renders every player in team games rather than only 1v1.
 */
const LIVE_OVERLAY_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RTSLytics Live Match</title>
<style>
:root{color-scheme:dark;font-family:Inter,Segoe UI,sans-serif}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:transparent;color:#f4f1e8;padding:18px}.card{width:min(1180px,calc(100vw - 36px));margin:0 auto;border:1px solid #92773d;background:linear-gradient(135deg,rgba(14,18,24,.96),rgba(31,27,22,.94));box-shadow:0 14px 45px #0009;border-radius:12px;overflow:hidden}.floating{display:flex;align-items:flex-end;justify-content:flex-end}.floating .card{width:min(760px,calc(100vw - 36px));margin:0}.hidden{display:none!important}.header{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:9px 15px;border-bottom:1px solid #ffffff1c;color:#c7ab6a;text-transform:uppercase;letter-spacing:.12em;font-size:10px}.header strong{color:#f4f1e8;font-size:12px;letter-spacing:.04em}.teams{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px;padding:12px}.team{border:1px solid #ffffff18;background:#0004;border-radius:8px;overflow:hidden}.team-title{padding:6px 10px;color:#c7ab6a;text-transform:uppercase;letter-spacing:.1em;font-size:9px}.player{display:flex;align-items:center;gap:8px;padding:9px 10px;border-top:1px solid #ffffff12}.flag{width:42px;height:23px;object-fit:cover;border-radius:3px;outline:1px solid #ffffff35;background:#ffffff12;flex:none}.player-body{min-width:0;flex:1}.player-top{display:flex;align-items:baseline;gap:7px}.civ{font-size:13px;font-weight:700;color:#f4f1e8;white-space:nowrap}.name{font-size:12px;color:#d4d0c8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.stats{display:flex;align-items:center;gap:8px;margin-top:3px;color:#a9a39a;font-size:10px}.wr{color:#67d49e}.alts{display:flex;gap:3px;margin-left:auto}.alt{width:25px;height:14px;object-fit:cover;border-radius:2px;opacity:.78;outline:1px solid #ffffff30}.muted{color:#88857f}
@media(max-width:650px){body{padding:8px}.card,.floating .card{width:calc(100vw - 16px)}.header{font-size:8px}.teams{grid-template-columns:1fr}.stats{gap:5px}}
</style></head><body class="top"><div id="card" class="card hidden"><div class="header"><strong>RTSLytics Live Match</strong><span id="meta">—</span></div><div id="teams" class="teams"></div></div>
<script>
const $=id=>document.getElementById(id);
const civOverrides={zhu_xis_legacy:"Zhu Xi's Legacy",jeanne_darc:"Jeanne d'Arc",holy_roman_empire:"Holy Roman Empire",house_of_lancaster:"House of Lancaster",macedonian_dynasty:"Macedonian Dynasty",order_of_the_dragon:"Order of the Dragon",knights_templar:"Knights Templar",golden_horde:"Golden Horde",jin_dynasty:"Jin Dynasty",tughlaq_dynasty:"Tughlaq Dynasty"};
const esc=value=>String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const civName=civ=>civOverrides[civ]||String(civ||'Unknown').replace(/_/g,' ').replace(/\\b\\w/g,c=>c.toUpperCase());
const rankName=rank=>rank?String(rank).replace(/_/g,' '):'';
const flag=(civ,small)=>civ?'<img class="'+(small?'alt':'flag')+'" src="/assets/civ/'+encodeURIComponent(civ)+'.png" alt="" onerror="this.style.display=\\'none\\'">':'';
function renderPlayer(p,includeAlts){
 const stats=[p.rankLevel?rankName(p.rankLevel):'',p.rating!=null?String(Math.round(p.rating)):'',p.winRate!=null?'<span class="wr">'+Math.round(p.winRate)+'% WR</span>':''].filter(Boolean).join(' · ');
 const alts=includeAlts&&Array.isArray(p.favoriteCivs)&&p.favoriteCivs.length?'<span class="alts">'+p.favoriteCivs.map(c=>flag(c,true)).join('')+'</span>':'';
 return '<div class="player">'+flag(p.civ,false)+'<div class="player-body"><div class="player-top"><span class="civ">'+esc(civName(p.civ))+'</span><span class="name">'+esc(p.name)+(p.isMe?' · You':'')+(p.isAI?' · AI':'')+'</span></div><div class="stats">'+(stats||'<span class="muted">No public profile data</span>')+alts+'</div></div></div>';
}
function render(s){
 const params=new URLSearchParams(location.search);document.body.className=params.get('theme')==='floating'?'floating':'top';
 const active=s&&s.matchState==='ongoing'&&s.matchup&&Array.isArray(s.matchup.teams)&&s.matchup.teams.length>=2;
 $('card').classList.toggle('hidden',!active);if(!active)return;
 $('meta').textContent=[s.kind,s.map].filter(Boolean).join(' · ')||'Live match';
 const includeAlts=params.get('includeAlts')!=='false';
 $('teams').innerHTML=s.matchup.teams.map((team,i)=>'<section class="team"><div class="team-title">'+(i===0?'You':(s.matchup.teams.length===2?'Opponents':'Team '+(i+1)))+'</div>'+team.map(p=>renderPlayer(p,includeAlts)).join('')+'</section>').join('');
}
async function tick(){try{const s=await fetch('/api/live',{cache:'no-store'}).then(r=>r.json());render(s)}catch{render(null)}}tick();setInterval(tick,1000);
</script></body></html>`

const STREAM_OVERLAY_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RTSLytics Stream Desk</title>
<style>
  :root{color-scheme:dark;font-family:Inter,Segoe UI,sans-serif;--stream-accent:#c7ab6a;--stream-bg-start:#12151b;--stream-bg-end:#1f1b16;--stream-scale:1}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:transparent;color:#f4f1e8;display:flex;align-items:flex-end;justify-content:center;padding:28px}.card{min-width:560px;border:1px solid var(--stream-accent);background:linear-gradient(135deg,color-mix(in srgb,var(--stream-bg-start) 96%,transparent),color-mix(in srgb,var(--stream-bg-end) 94%,transparent));box-shadow:0 14px 45px #0008;border-radius:14px;overflow:hidden;font-size:calc(16px * var(--stream-scale))}.compact{min-width:460px}.meta{padding:8px 18px;border-bottom:1px solid #ffffff1c;color:var(--stream-accent);text-transform:uppercase;letter-spacing:.14em;font-size:11px;display:flex;justify-content:space-between}.teams{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:18px 22px;gap:22px}.compact .teams{padding:12px 16px;gap:14px}.team{text-align:center}.team:last-child{color:#b8d7ef}.name{font-weight:700;font-size:20px}.civ{color:#a9a39a;font-size:12px;margin-top:5px}.score{font-size:38px;font-weight:800;line-height:1}.dash{color:var(--stream-accent);font-size:24px}.footer{padding:9px 18px;background:#0004;color:#a9a39a;text-align:center;font-size:12px}.hidden{display:none!important}
</style></head><body><div id="card" class="card hidden"><div class="meta"><span id="map">—</span><span id="timer"></span></div><div class="teams"><div class="team"><div id="leftName" class="name"></div><div id="leftCiv" class="civ"></div></div><div><div id="score" class="score"></div><div id="bestOf" class="dash"></div></div><div class="team"><div id="rightName" class="name"></div><div id="rightCiv" class="civ"></div></div></div><div id="footer" class="footer"></div></div><style id="customCss"></style>
<script>const $=id=>document.getElementById(id);async function tick(){try{const s=await fetch('/api/state',{cache:'no-store'}).then(r=>r.json());const t=s.theme||{};document.documentElement.style.setProperty('--stream-accent',t.accentColor||'#c7ab6a');document.documentElement.style.setProperty('--stream-bg-start',t.backgroundStart||'#12151b');document.documentElement.style.setProperty('--stream-bg-end',t.backgroundEnd||'#1f1b16');document.documentElement.style.setProperty('--stream-scale',String(t.fontScale||1));$('customCss').textContent=typeof t.customCss==='string'?t.customCss:'';$('card').classList.toggle('compact',Boolean(t.compact));$('card').classList.toggle('hidden',!s.visible);const maps=Array.isArray(s.maps)&&s.maps.length?s.maps:[s.map||'—'];$('map').textContent=maps[s.mapIndex||0]||maps[0]||'—';$('leftName').textContent=s.leftName||'';$('rightName').textContent=s.rightName||'';$('leftCiv').textContent=s.leftCiv||'';$('rightCiv').textContent=s.rightCiv||'';$('score').textContent=s.spoiler?'? ?':s.leftScore+' : '+s.rightScore;$('bestOf').textContent=s.bestOf?'Best of '+s.bestOf:'';const d=s.civDraft||{};const draft=[...(d.leftBans||[]).map(x=>'Ban '+x),...(d.rightBans||[]).map(x=>'Ban '+x),...(d.leftPicks||[]).map(x=>'Pick '+x),...(d.rightPicks||[]).map(x=>'Pick '+x)];$('footer').textContent=(s.caster?'Caster: '+s.caster:'')+(draft.length?' · '+draft.join(' · '):'');const left=s.countdownEndsAt?Math.max(0,Math.ceil((s.countdownEndsAt-Date.now())/1000)):0;$('timer').textContent=left?'00:'+String(left).padStart(2,'0'):''}catch{}}tick();setInterval(tick,1000)</script></body></html>`
