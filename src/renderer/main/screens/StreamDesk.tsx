import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Radio, RotateCcw, Square, Trophy } from 'lucide-react'
import type {
  StreamLiveOverride,
  StreamManagerState,
  StreamManagerStatus,
  StreamManagerTheme,
} from '@ipc/contract'
import { ipc } from '@shared/ipc'
import { Card, CardContent } from '@shared/components/ui/card'
import { Badge } from '@shared/components/ui/badge'
import { PageHead } from '../components/PageHead'
import { useI18n } from '../../i18n'
import { useSettings } from '../queries/useProfile'

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
  theme: {
    accentColor: '#c7ab6a',
    backgroundStart: '#12151b',
    backgroundEnd: '#1f1b16',
    fontScale: 1,
    compact: false,
    customCss: '',
  },
  liveOverride: {
    left: { name: '', civ: '', rank: '' },
    right: { name: '', civ: '', rank: '' },
  },
  updatedAt: 0,
}

export function StreamDesk() {
  const { tt } = useI18n()
  const { data: appSettings } = useSettings()
  const [status, setStatus] = useState<StreamManagerStatus | null>(null)
  const [state, setState] = useState<StreamManagerState>(DEFAULT_STATE)
  const [copied, setCopied] = useState(false)
  const [copiedLive, setCopiedLive] = useState(false)
  const [copiedPublic, setCopiedPublic] = useState(false)
  const [liveRosterStatus, setLiveRosterStatus] = useState<string | null>(null)
  const [publicProfileId, setPublicProfileId] = useState('')
  const [publicTheme, setPublicTheme] = useState<'top' | 'floating'>('top')
  const [publicIncludeAlts, setPublicIncludeAlts] = useState(true)

  useEffect(() => {
    if (publicProfileId || appSettings?.profileId == null) return
    setPublicProfileId(String(appSettings.profileId))
  }, [appSettings?.profileId, publicProfileId])

  useEffect(() => {
    void ipc.getStreamManagerStatus().then((value) => {
      setStatus(value)
      setState(value.state)
    })
  }, [])

  const overlayUrl = useMemo(() => `http://127.0.0.1:${status?.port ?? 4174}/`, [status?.port])
  const liveOverlayUrl = useMemo(
    () => `http://127.0.0.1:${status?.port ?? 4174}/live?theme=top&includeAlts=true`,
    [status?.port],
  )
  const safePublicProfileId = publicProfileId.trim().match(/^\d+$/)?.[0] ?? ''
  const publicOverlayUrl = useMemo(() => {
    if (!safePublicProfileId) return 'https://overlay.aoe4world.com/'
    const params = new URLSearchParams({
      theme: publicTheme,
      includeAlts: String(publicIncludeAlts),
    })
    return `https://overlay.aoe4world.com/profile/${safePublicProfileId}/bar?${params.toString()}`
  }, [publicIncludeAlts, publicTheme, safePublicProfileId])

  const update = async (patch: Partial<StreamManagerState>) => {
    const next = await ipc.updateStreamManager(patch)
    setState(next)
    setStatus((current) => (current ? { ...current, state: next } : current))
  }

  const start = async () => {
    const next = await ipc.startStreamManager(status?.port ?? 4174)
    setStatus(next)
    setState(next.state)
  }

  const stop = async () => {
    await ipc.stopStreamManager()
    setStatus((current) => (current ? { ...current, running: false } : current))
  }

  const copyUrl = () => {
    void navigator.clipboard?.writeText(overlayUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const copyLiveUrl = () => {
    void navigator.clipboard?.writeText(liveOverlayUrl)
    setCopiedLive(true)
    window.setTimeout(() => setCopiedLive(false), 1500)
  }

  const copyPublicUrl = () => {
    if (!safePublicProfileId) return
    void navigator.clipboard?.writeText(publicOverlayUrl)
    setCopiedPublic(true)
    window.setTimeout(() => setCopiedPublic(false), 1500)
  }

  const importLiveRoster = async () => {
    setLiveRosterStatus(tt('Reading live roster…'))
    try {
      const live = await ipc.getLiveMatch()
      const teams = live.teams?.filter((team) => team.length > 0) ?? []
      if (teams.length >= 2) {
        const formatNames = (team: (typeof teams)[number]) =>
          team.map((player) => player.name).join(' / ')
        const formatCivs = (team: (typeof teams)[number]) =>
          team
            .map((player) => player.civ)
            .filter((civ): civ is string => Boolean(civ))
            .join(' · ')
        await update({
          leftName: formatNames(teams[0]!),
          rightName: formatNames(teams[1]!),
          leftCiv: formatCivs(teams[0]!) || state.leftCiv,
          rightCiv: formatCivs(teams[1]!) || state.rightCiv,
          ...(live.map ? { map: live.map } : {}),
        })
        setLiveRosterStatus(tt('Live roster imported'))
        return
      }
      if (live.isLive && live.opponent) {
        await update({
          leftCiv: live.myCiv ?? state.leftCiv,
          rightName: live.opponent.name,
          rightCiv: live.opponent.civ,
          ...(live.map ? { map: live.map } : {}),
        })
        setLiveRosterStatus(tt('Live opponent imported'))
        return
      }
      setLiveRosterStatus(tt('No public live roster is available'))
    } catch {
      setLiveRosterStatus(tt('Live roster unavailable'))
    }
  }

  const addScore = (side: 'left' | 'right') =>
    void update({
      [side === 'left' ? 'leftScore' : 'rightScore']:
        state[side === 'left' ? 'leftScore' : 'rightScore'] + 1,
    })

  const startCountdown = (seconds: number) =>
    void update({ countdownEndsAt: Date.now() + seconds * 1000 })

  return (
    <div className="animate-fade-in space-y-5">
      <PageHead
        kicker="Broadcast toolkit"
        title="Stream Desk"
        sub="Local tournament graphics, score controls, countdowns, and a browser-source URL for OBS or Streamlabs."
        aside={
          <Badge variant={status?.running ? 'success' : 'outline'}>
            {status?.running ? tt('Running') : tt('Stopped')}
          </Badge>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Radio className="h-4 w-4 text-primary" /> {tt('Browser source')}
            </div>
            <code className="mt-1 block text-xs text-muted-foreground">{overlayUrl}</code>
            <p className="mt-1 text-xs text-muted-foreground">
              {tt(
                'Add this URL as an OBS Browser Source. The page polls the local state once per second.',
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyUrl}
              className="rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary"
            >
              {copied ? tt('Copied') : tt('Copy URL')}
            </button>
            <a
              href={overlayUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary"
            >
              {tt('Open preview')} <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {status?.running ? (
              <button
                type="button"
                onClick={() => void stop()}
                className="inline-flex items-center gap-1.5 rounded-md border border-loss/40 px-3 py-2 text-xs text-loss hover:bg-loss/10"
              >
                <Square className="h-3.5 w-3.5" /> {tt('Stop server')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void start()}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Radio className="h-3.5 w-3.5" /> {tt('Start server')}
              </button>
            )}
            <button
              type="button"
              onClick={() => void importLiveRoster()}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 px-3 py-2 text-xs text-primary hover:bg-primary/10"
            >
              {tt('Import live roster')}
            </button>
          </div>
          {liveRosterStatus && (
            <p className="mt-2 text-xs text-muted-foreground">{liveRosterStatus}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ExternalLink className="h-4 w-4 text-primary" /> {tt('AoE4World public overlay')}
            </div>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
              {tt(
                'Use the official hosted browser source when you need the AoE4World profile bar. It is separate from the local RTSLytics source and requires internet access.',
              )}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-end">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {tt('AoE4World profile id')}
              </span>
              <input
                value={publicProfileId}
                onChange={(event) => setPublicProfileId(event.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                placeholder="1234567"
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {tt('Theme')}
              </span>
              <select
                value={publicTheme}
                onChange={(event) => setPublicTheme(event.target.value as 'top' | 'floating')}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="top">{tt('Top bar')}</option>
                <option value="floating">{tt('Floating')}</option>
              </select>
            </label>
            <label className="flex items-center gap-2 pb-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={publicIncludeAlts}
                onChange={(event) => setPublicIncludeAlts(event.target.checked)}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              {tt('Show alternate civilizations')}
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
              {publicOverlayUrl}
            </code>
            <button
              type="button"
              disabled={!safePublicProfileId}
              onClick={copyPublicUrl}
              className="rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copiedPublic ? tt('Copied') : tt('Copy public URL')}
            </button>
            <a
              href={publicOverlayUrl}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!safePublicProfileId}
              className={`inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary ${!safePublicProfileId ? 'pointer-events-none opacity-40' : ''}`}
            >
              {tt('Open public overlay')} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Radio className="h-4 w-4 text-primary" /> {tt('Live match browser source')}
            </div>
            <code className="mt-1 block text-xs text-muted-foreground">{liveOverlayUrl}</code>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              {tt(
                'Live roster, ranks, win rates, favorite civilizations, team modes, and auto-hide outside a match. Use ?theme=floating for a corner layout.',
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyLiveUrl}
              className="rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary"
            >
              {copiedLive ? tt('Copied') : tt('Copy live URL')}
            </button>
            <a
              href={liveOverlayUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary"
            >
              {tt('Open live preview')} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <div className="text-sm font-semibold">{tt('Casting / replay override')}</div>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
              {tt(
                'Replace the first player shown on each side of the local live browser source. This is a structured override for casting and replays; the native in-game roster is unchanged.',
              )}
            </p>
          </div>
          <LiveOverrideForm state={state} onUpdate={update} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <TeamForm side="left" state={state} onUpdate={update} />
              <TeamForm side="right" state={state} onUpdate={update} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field
                label={tt('Map')}
                value={state.map}
                onChange={(value) => void update({ map: value })}
              />
              <Field
                label={tt('Caster')}
                value={state.caster}
                onChange={(value) => void update({ caster: value })}
              />
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {tt('Best of')}
                </span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={state.bestOf}
                  onChange={(event) => void update({ bestOf: Number(event.target.value) || 1 })}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
              </label>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <MapSeriesForm state={state} onUpdate={update} />
              <CivDraftForm state={state} onUpdate={update} />
            </div>
            <ThemeForm state={state} onUpdate={update} />
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <span className="mr-2 text-xs uppercase tracking-wide text-muted-foreground">
                {tt('Countdown')}
              </span>
              {[30, 60, 120].map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => startCountdown(seconds)}
                  className="rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary"
                >
                  {seconds}s
                </button>
              ))}
              <button
                type="button"
                onClick={() => void update({ countdownEndsAt: null })}
                className="rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary"
              >
                {tt('Clear')}
              </button>
              <button
                type="button"
                onClick={() => void update({ visible: !state.visible })}
                className="rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary"
              >
                {state.visible ? tt('Hide graphic') : tt('Show graphic')}
              </button>
              <button
                type="button"
                onClick={() => void update({ spoiler: !state.spoiler })}
                className="rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary"
              >
                {state.spoiler ? tt('Reveal score') : tt('Hide score')}
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-primary" /> {tt('Series control')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ScoreButton
                label={state.leftName}
                score={state.leftScore}
                onClick={() => addScore('left')}
              />
              <ScoreButton
                label={state.rightName}
                score={state.rightScore}
                onClick={() => addScore('right')}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  void update({
                    leftScore: state.rightScore,
                    rightScore: state.leftScore,
                    leftName: state.rightName,
                    rightName: state.leftName,
                    leftCiv: state.rightCiv,
                    rightCiv: state.leftCiv,
                  })
                }
                className="flex-1 rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary"
              >
                {tt('Swap sides')}
              </button>
              <button
                type="button"
                onClick={() =>
                  void ipc.resetStreamManager().then((next) => {
                    setState(next)
                    setStatus((current) => (current ? { ...current, state: next } : current))
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary"
              >
                <RotateCcw className="h-3.5 w-3.5" /> {tt('Reset')}
              </button>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {tt(
                'The score routes /score/toggleScore, /score/toggleSpoiler, /score/addLeft, /score/addRight, and /score/swapScore are available for Stream Deck or automation.',
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function LiveOverrideForm({
  state,
  onUpdate,
}: {
  state: StreamManagerState
  onUpdate: (patch: Partial<StreamManagerState>) => Promise<void>
}) {
  const { tt } = useI18n()
  const empty: StreamLiveOverride = {
    left: { name: '', civ: '', rank: '' },
    right: { name: '', civ: '', rank: '' },
  }
  const override = state.liveOverride ?? empty
  const edit = (side: 'left' | 'right', key: keyof StreamLiveOverride['left'], value: string) =>
    void onUpdate({
      liveOverride: {
        ...override,
        [side]: { ...override[side], [key]: value },
      },
    })
  const reset = () => void onUpdate({ liveOverride: empty })
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(['left', 'right'] as const).map((side) => (
        <div key={side} className="space-y-2 rounded-md border border-border bg-background/30 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {side === 'left' ? tt('Left side') : tt('Right side')}
          </div>
          <Field
            label={tt('Override name')}
            value={override[side].name}
            onChange={(value) => edit(side, 'name', value)}
          />
          <Field
            label={tt('Override civilization')}
            value={override[side].civ}
            onChange={(value) => edit(side, 'civ', value)}
          />
          <Field
            label={tt('Override rank')}
            value={override[side].rank}
            onChange={(value) => edit(side, 'rank', value)}
          />
        </div>
      ))}
      <div className="sm:col-span-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-secondary"
        >
          {tt('Clear casting override')}
        </button>
      </div>
    </div>
  )
}

function TeamForm({
  side,
  state,
  onUpdate,
}: {
  side: 'left' | 'right'
  state: StreamManagerState
  onUpdate: (patch: Partial<StreamManagerState>) => Promise<void>
}) {
  const { tt } = useI18n()
  const nameKey = side === 'left' ? 'leftName' : 'rightName'
  const civKey = side === 'left' ? 'leftCiv' : 'rightCiv'
  return (
    <div className="space-y-3 rounded-md border border-border bg-background/30 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {side === 'left' ? tt('Home team') : tt('Away team')}
      </div>
      <Field
        label={tt('Name')}
        value={state[nameKey]}
        onChange={(value) => void onUpdate({ [nameKey]: value })}
      />
      <Field
        label={tt('Civilization')}
        value={state[civKey]}
        onChange={(value) => void onUpdate({ [civKey]: value })}
      />
    </div>
  )
}

function MapSeriesForm({
  state,
  onUpdate,
}: {
  state: StreamManagerState
  onUpdate: (patch: Partial<StreamManagerState>) => Promise<void>
}) {
  const { tt } = useI18n()
  const maps = state.maps?.length ? state.maps : [state.map]
  const setMaps = (next: string[]) => {
    const safe = next.slice(0, 9)
    void onUpdate({ maps: safe, map: safe[state.mapIndex ?? 0] ?? safe[0] ?? '—' })
  }
  return (
    <div className="space-y-2 rounded-md border border-border bg-background/30 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {tt('Map series')} · {maps.length}/9
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={maps.length >= 9}
            onClick={() => setMaps([...maps, ''])}
            className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40"
          >
            +
          </button>
          <button
            type="button"
            disabled={maps.length <= 1}
            onClick={() => setMaps(maps.slice(0, -1))}
            className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40"
          >
            −
          </button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {maps.map((map, index) => (
          <div key={index} className="flex gap-1">
            <input
              value={map}
              onChange={(event) => {
                const next = [...maps]
                next[index] = event.target.value
                setMaps(next)
              }}
              className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs"
              placeholder={`${tt('Map')} ${index + 1}`}
            />
            <button
              type="button"
              onClick={() => void onUpdate({ mapIndex: index, map: map || '—' })}
              className={`rounded border px-2 text-[10px] ${state.mapIndex === index ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
            >
              {state.mapIndex === index ? '●' : index + 1}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function CivDraftForm({
  state,
  onUpdate,
}: {
  state: StreamManagerState
  onUpdate: (patch: Partial<StreamManagerState>) => Promise<void>
}) {
  const { tt } = useI18n()
  const draft = state.civDraft ?? { leftBans: [], rightBans: [], leftPicks: [], rightPicks: [] }
  const [draftUrl, setDraftUrl] = useState('')
  const [draftStatus, setDraftStatus] = useState<string | null>(null)
  const edit = (key: keyof typeof draft, value: string) =>
    void onUpdate({
      civDraft: {
        ...draft,
        [key]: value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 12),
      },
    })
  const importDraft = async () => {
    setDraftStatus(null)
    const result = await ipc.importStreamDraft(draftUrl)
    if (!result.ok) {
      setDraftStatus(result.error.message)
      return
    }
    await onUpdate({
      civDraft: result.data.civDraft,
      ...(result.data.leftName ? { leftName: result.data.leftName } : {}),
      ...(result.data.rightName ? { rightName: result.data.rightName } : {}),
    })
    setDraftStatus(tt('Draft imported'))
  }
  return (
    <div className="space-y-2 rounded-md border border-border bg-background/30 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {tt('Civilization draft')}
      </div>
      <div className="flex gap-2">
        <input
          value={draftUrl}
          onChange={(event) => setDraftUrl(event.target.value)}
          className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs"
          placeholder="https://aoe2cm.net/draft/..."
        />
        <button
          type="button"
          onClick={() => void importDraft()}
          className="shrink-0 rounded-md border border-primary/40 px-2.5 py-1 text-xs text-primary hover:bg-primary/10"
        >
          {tt('Import AoE2CM')}
        </button>
      </div>
      {draftStatus && <p className="text-[10px] text-muted-foreground">{draftStatus}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-[10px] text-muted-foreground">{tt('Left bans / picks')}</span>
          <input
            value={draft.leftBans.join(', ')}
            onChange={(event) => edit('leftBans', event.target.value)}
            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
            placeholder="English, French"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-muted-foreground">{tt('Right bans / picks')}</span>
          <input
            value={draft.rightBans.join(', ')}
            onChange={(event) => edit('rightBans', event.target.value)}
            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
            placeholder="Mongols, Rus"
          />
        </label>
      </div>
      <p className="text-[10px] text-muted-foreground">
        {tt('Comma-separated civs are shown in the browser source as draft notes.')}
      </p>
    </div>
  )
}

function ThemeForm({
  state,
  onUpdate,
}: {
  state: StreamManagerState
  onUpdate: (patch: Partial<StreamManagerState>) => Promise<void>
}) {
  const { tt } = useI18n()
  const theme: StreamManagerTheme = state.theme ?? DEFAULT_STATE.theme!
  const edit = (patch: Partial<StreamManagerTheme>) =>
    void onUpdate({ theme: { ...theme, ...patch } })

  return (
    <div className="space-y-3 rounded-md border border-border bg-background/30 p-3">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {tt('Graphic theme')}
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {tt('Safe browser-source controls replace arbitrary custom JavaScript.')}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <ColorField
          label={tt('Accent')}
          value={theme.accentColor}
          onChange={(value) => edit({ accentColor: value })}
        />
        <ColorField
          label={tt('Background start')}
          value={theme.backgroundStart}
          onChange={(value) => edit({ backgroundStart: value })}
        />
        <ColorField
          label={tt('Background end')}
          value={theme.backgroundEnd}
          onChange={(value) => edit({ backgroundEnd: value })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="space-y-1">
          <span className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
            <span>{tt('Font scale')}</span>
            <span>{Math.round(theme.fontScale * 100)}%</span>
          </span>
          <input
            type="range"
            min="0.75"
            max="1.5"
            step="0.05"
            value={theme.fontScale}
            onChange={(event) => edit({ fontScale: Number(event.target.value) })}
            className="w-full accent-[hsl(var(--primary))]"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={theme.compact}
            onChange={(event) => edit({ compact: event.target.checked })}
            className="h-4 w-4 accent-[hsl(var(--primary))]"
          />
          {tt('Compact card')}
        </label>
      </div>
      <label className="block space-y-1">
        <span className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
          <span>{tt('Custom stream CSS')}</span>
          <span>{theme.customCss.length.toLocaleString()}/20,000</span>
        </span>
        <textarea
          value={theme.customCss}
          maxLength={20_000}
          rows={4}
          onChange={(event) => edit({ customCss: event.target.value })}
          placeholder={'.card { border-radius: 0; }\n.name { text-transform: uppercase; }'}
          className="w-full resize-y rounded-md border border-border bg-background/50 px-2 py-2 font-mono text-[11px] text-foreground outline-none transition focus:border-primary"
        />
        <span className="block text-[10px] text-muted-foreground">
          {tt('CSS only for the local stream source; scripts are never executed.')}
        </span>
      </label>
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs">
      <span className="truncate text-muted-foreground">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
      />
    </label>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
      />
    </label>
  )
}

function ScoreButton({
  label,
  score,
  onClick,
}: {
  label: string
  score: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-border p-3 text-left hover:border-primary/50 hover:bg-secondary"
    >
      <div className="truncate text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{score}</div>
    </button>
  )
}
