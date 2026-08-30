import { useMemo, useState } from 'react'
import { civDisplayName } from '@domain/civ'
import type { CivKeyUnit, MatchupTroops } from '@domain/civUnits'
import type { LiveMatchup, MatchupPlayer } from '@domain/liveMatch'
import { winProbability } from '@domain/winProbability'
import { UNIT_ICONS } from '@data/vendor/aoe4world-overlay/units'
import { formatRankLevel, formatRating } from '@shared/format'
import { cn } from '@shared/lib/utils'
import { CivFlag } from './CivFlag'
import { panelBg } from './panelBg'
import { useI18n } from '../i18n'

const AGE_ROMAN: Record<number, string> = { 2: 'II', 3: 'III', 4: 'IV' }
const UNIT_CDN = 'https://data.aoe4world.com/images/units'

/** One side of the legacy 1v1 matchup fallback. */
export interface MatchupSide {
  civ: string | null
  name: string | null
  rankLevel: string | null
  rating: number | null
  winRate: number | null
  favoriteCivs: string[]
  isAI: boolean
}

export function MatchupBar({
  me,
  opponent,
  matchup,
  troops,
  compact = false,
}: {
  me: MatchupSide
  opponent: MatchupSide
  matchup?: LiveMatchup | null
  troops?: MatchupTroops | null
  compact?: boolean
}) {
  const { tt } = useI18n()
  const teams = matchup?.teams ?? []
  const hasTeams = teams.length >= 2 && teams.some((t) => t.length > 0)
  const hasTroops = !!troops && (troops.mine.length > 0 || troops.theirs.length > 0)
  const maxTeamSize = hasTeams ? Math.max(...teams.map((t) => t.length)) : 1
  // Pre-game win odds by rating gap (Elo expectation) — 1v1 with two rated
  // humans only; anything else (teams, AI, missing rating) hides the chip.
  const winOdds = useMemo(() => {
    const t = matchup?.teams ?? []
    if (t.length >= 2 && t.some((team) => team.length > 0)) {
      const mine = t[0] ?? []
      const theirs = t.slice(1).flat()
      if (mine.length !== 1 || theirs.length !== 1 || theirs[0]!.isAI) return null
      return winProbability(mine[0]!.rating, theirs[0]!.rating)
    }
    return opponent.isAI ? null : winProbability(me.rating, opponent.rating)
  }, [matchup, me.rating, opponent.isAI, opponent.rating])

  return (
    <div
      className="pointer-events-none select-none font-sans text-white"
      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
    >
      {hasTeams ? (
        <div className="flex flex-col items-center">
          <div className="flex items-start">
            <TeamColumn
              label={compact ? null : maxTeamSize > 1 ? tt('Your Team') : null}
              players={teams[0] ?? []}
              align="left"
              winOdds={compact ? null : winOdds}
              compact={compact}
            />
            <div className={compact ? 'w-[200px] shrink-0' : 'w-[220px] shrink-0'} aria-hidden />
            <TeamColumn
              label={compact ? null : maxTeamSize > 1 ? tt('Enemy Team') : null}
              players={teams.slice(1).flat()}
              align="right"
              compact={compact}
            />
          </div>
          {hasTroops && (
            // Wider center gap than the names row: the game draws its age-up
            // progress banner top-center BELOW its HUD bar — exactly at troop-row
            // height — so the icons must keep clear of a bigger center band.
            <div className="mt-1 flex items-start">
              <TroopsCol
                units={troops!.mine}
                priority={troops!.priority}
                align="left"
                label={compact ? null : tt('Your army')}
                compact={compact}
              />
              <div className={compact ? 'w-[360px] shrink-0' : 'w-[430px] shrink-0'} aria-hidden />
              <TroopsCol
                units={troops!.theirs}
                align="right"
                label={compact ? null : tt('They make')}
                compact={compact}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="flex items-start">
            <LegacySide side={me} align="left" winOdds={compact ? null : winOdds} compact={compact} />
            <div className={compact ? 'w-[240px] shrink-0' : 'w-[280px] shrink-0'} aria-hidden />
            <LegacySide side={opponent} align="right" compact={compact} />
          </div>
          {hasTroops && (
            <div className="mt-1 flex items-start">
              <TroopsCol
                units={troops!.mine}
                priority={troops!.priority}
                align="left"
                label={compact ? null : tt('Your army')}
                compact={compact}
              />
              <div className={compact ? 'w-[380px] shrink-0' : 'w-[460px] shrink-0'} aria-hidden />
              <TroopsCol
                units={troops!.theirs}
                align="right"
                label={compact ? null : tt('They make')}
                compact={compact}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TeamColumn({
  label,
  players,
  align,
  winOdds,
  compact = false,
}: {
  label: string | null
  players: MatchupPlayer[]
  align: 'left' | 'right'
  /** Pre-game win odds (%) shown on the primary line; my column in a 1v1 only. */
  winOdds?: number | null
  compact?: boolean
}) {
  const isRight = align === 'right'
  const color = isRight ? 'hsl(var(--loss))' : 'hsl(var(--win))'
  const primaryIdx = Math.max(
    0,
    players.findIndex((p) => p.isMe),
  )
  const primary = players[primaryIdx]
  const rest = players.filter((_, i) => i !== primaryIdx)
  return (
    <div
      className={cn(
        'overlay-panel overflow-hidden',
        compact ? 'min-w-[220px] max-w-[300px]' : 'min-w-[280px] max-w-[380px]',
      )}
      style={{
        background: panelBg(compact ? 0.55 : 0.72),
        boxShadow: `inset ${isRight ? '-' : ''}2px 0 0 0 ${color}`,
      }}
    >
      {label && (
        <div
          className={cn(
            'border-b border-white/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/40',
            isRight && 'text-right',
          )}
        >
          {label}
        </div>
      )}
      {primary && <PlayerLine player={primary} align={align} winOdds={winOdds} compact={compact} />}
      {rest.length > 0 && (
        <div className="divide-y divide-white/10 border-t border-white/10">
          {rest.map((p, i) => (
            <CompactPlayerLine
              key={`${p.profileId}-${p.name}-${p.civ ?? 'unknown'}-${i}`}
              player={p}
              align={align}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PlayerLine({
  player,
  align,
  winOdds,
  compact = false,
}: {
  player: MatchupPlayer
  align: 'left' | 'right'
  winOdds?: number | null
  compact?: boolean
}) {
  const { tt, gameName } = useI18n()
  const isRight = align === 'right'
  const color = player.isMe
    ? 'hsl(var(--primary))'
    : isRight
      ? 'hsl(var(--loss))'
      : 'hsl(var(--win))'
  const rank =
    player.rankLevel && /[a-z]/i.test(player.rankLevel) ? tt(formatRankLevel(player.rankLevel)) : null
  const showMeta =
    !compact &&
    (rank ||
      player.rating != null ||
      player.winRate != null ||
      player.favoriteCivs.length > 0 ||
      winOdds != null)
  return (
    <div
      className={cn(
        'flex items-center gap-2',
        compact ? 'px-2 py-1' : 'px-3 py-2',
        isRight && 'flex-row-reverse text-right',
      )}
    >
      <CivFlag civ={player.civ} compact={compact} />
      <div className={cn('min-w-0 flex-1', isRight && 'items-end')}>
        <div className={cn('flex items-baseline gap-2', isRight && 'flex-row-reverse')}>
          <span
            className={cn('whitespace-nowrap font-semibold', compact ? 'text-[13px]' : 'text-[15px] font-bold')}
            style={{ color }}
          >
            {player.civ ? gameName(civDisplayName(player.civ)) : tt('Unknown')}
          </span>
          <span
            className={cn(
              'flex min-w-0 items-center gap-1 text-white/80',
              compact ? 'text-[11px]' : 'text-[12px]',
              isRight && 'flex-row-reverse',
            )}
          >
            {player.isMe && !compact && (
              <span className="rounded bg-primary/20 px-1 py-px text-[8px] font-semibold uppercase text-primary">
                {tt('You')}
              </span>
            )}
            {player.isAI && (
              <span className="rounded bg-white/15 px-1 py-px text-[8px] font-semibold uppercase text-white/75">
                {tt('AI')}
              </span>
            )}
            <span className={compact ? 'max-w-[110px] truncate' : 'max-w-[150px] truncate'}>
              {player.name}
            </span>
            {compact && player.rating != null && (
              <span className="font-medium tabular-nums text-white/70">{formatRating(player.rating)}</span>
            )}
          </span>
        </div>
        {showMeta && (
          <div
            className={cn(
              'mt-1 flex items-center gap-2 text-[11px] text-white/65',
              isRight && 'flex-row-reverse',
            )}
          >
            {rank && <span className="whitespace-nowrap">{rank}</span>}
            {player.rating != null && (
              <span className="font-semibold tabular-nums text-white/85">
                {formatRating(player.rating)}
              </span>
            )}
            {player.winRate != null && (
              <span className="tabular-nums">
                {Math.round(player.winRate)}% {tt('WR')}
              </span>
            )}
            {winOdds != null && <WinOddsChip pct={winOdds} />}
            {player.favoriteCivs.length > 0 && (
              <span
                className={cn('flex items-center gap-1', isRight && 'flex-row-reverse')}
                title={tt('Most-played civs')}
              >
                {player.favoriteCivs.map((civ) => (
                  <CivFlag key={civ} civ={civ} compact />
                ))}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Pre-game win odds from the rating gap (Elo expectation) — an estimate, so the
 * label says "by rating" rather than presenting it as a prediction.
 */
function WinOddsChip({ pct }: { pct: number }) {
  const { tt } = useI18n()
  return (
    <span className="whitespace-nowrap tabular-nums">
      <span className={pct >= 50 ? 'text-win' : 'text-loss'}>{Math.round(pct)}%</span>{' '}
      <span className="text-white/55">{tt('by rating')}</span>
    </span>
  )
}

/** A teammate/opponent beyond the column's primary player — civ + name only, no rank/rating row. */
function CompactPlayerLine({ player, align }: { player: MatchupPlayer; align: 'left' | 'right' }) {
  const { tt, gameName } = useI18n()
  const isRight = align === 'right'
  const color = player.isMe
    ? 'hsl(var(--primary))'
    : isRight
      ? 'hsl(var(--loss))'
      : 'hsl(var(--win))'
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-3 py-1',
        isRight && 'flex-row-reverse text-right',
      )}
    >
      <CivFlag civ={player.civ} compact />
      <span
        className={cn('flex min-w-0 items-center gap-1 text-[11px]', isRight && 'flex-row-reverse')}
      >
        <span className="whitespace-nowrap font-semibold" style={{ color }}>
          {player.civ ? gameName(civDisplayName(player.civ)) : tt('Unknown')}
        </span>
        {player.isMe && (
          <span className="rounded bg-primary/20 px-1 py-px text-[7px] font-semibold uppercase text-primary">
            {tt('You')}
          </span>
        )}
        {player.isAI && (
          <span className="rounded bg-white/15 px-1 py-px text-[7px] font-semibold uppercase text-white/75">
            {tt('AI')}
          </span>
        )}
        <span className="max-w-[110px] truncate text-white/80">{player.name}</span>
        {player.winRate != null && (
          <span className="tabular-nums text-white/55">{Math.round(player.winRate)}% {tt('WR')}</span>
        )}
        {player.favoriteCivs.length > 0 && (
          <span
            className={cn('flex items-center gap-1', isRight && 'flex-row-reverse')}
            title={tt('Most-played civs')}
          >
            {player.favoriteCivs.map((civ) => (
              <CivFlag key={civ} civ={civ} compact />
            ))}
          </span>
        )}
      </span>
    </div>
  )
}

function TroopsCol({
  units,
  priority,
  align,
  label,
  compact = false,
}: {
  units: CivKeyUnit[]
  priority?: Set<string>
  align: 'left' | 'right'
  label: string | null
  compact?: boolean
}) {
  if (units.length === 0) return <div className="max-w-[380px]" aria-hidden />
  const isRight = align === 'right'
  return (
    <div className={cn('flex max-w-[430px] flex-col gap-0.5', isRight && 'items-end')}>
      {label && (
        <span
          className={cn('text-[9px] font-medium uppercase tracking-wide', isRight ? 'text-loss/70' : 'text-win/70')}
        >
          {label}
        </span>
      )}
      <div className={cn('flex items-start gap-1', isRight && 'flex-row-reverse')}>
        {units.map((u) => (
          <UnitIcon key={u.name} unit={u} priority={priority?.has(u.name)} compact={compact} />
        ))}
      </div>
    </div>
  )
}

function UnitIcon({
  unit,
  priority,
  compact = false,
}: {
  unit: CivKeyUnit
  priority?: boolean
  compact?: boolean
}) {
  const { tt, gameName } = useI18n()
  const label = gameName(unit.name)
  // Vendored icon first (bundled — instant, offline); the CDN self-heal chain
  // stays as the fallback for units added before the next vendoring run.
  const candidates = useMemo(() => {
    const cdn = Array.from(new Set([`-${unit.age}`, '-1', '-2', '-3', '-4', ''])).map(
      (suffix) => `${UNIT_CDN}/${unit.icon}${suffix}.png`,
    )
    const vendored = UNIT_ICONS[unit.icon]
    return vendored ? [vendored, ...cdn] : cdn
  }, [unit.age, unit.icon])
  const [idx, setIdx] = useState(0)
  const broken = idx >= candidates.length
  const size = compact ? 'h-8 w-8' : 'h-10 w-10'
  const ring = priority ? 'ring-1 ring-win' : 'ring-1 ring-white/10'
  const title = priority
    ? tt('{unit} — counters one of their key units').replace('{unit}', label)
    : label
  return (
    <div className={cn('flex flex-col items-center gap-0.5', compact ? 'w-9' : 'w-[56px]')} title={title}>
      {broken ? (
        <span
          className={cn(
            'flex items-center justify-center rounded bg-white/10 px-0.5 text-center text-[7px] font-semibold leading-tight text-white/90',
            size,
            ring,
          )}
        >
          {label}
        </span>
      ) : (
        <img
          key={candidates[idx]}
          src={candidates[idx]}
          alt={label}
          onError={() => setIdx((i) => i + 1)}
          className={cn('rounded bg-black/40 object-contain', size, ring)}
        />
      )}
      {!compact && (
        <>
          <span className="h-[18px] w-full overflow-hidden text-center text-[8px] font-medium leading-[9px] text-white/75">
            {label}
          </span>
          <span className="text-[7px] font-semibold leading-none text-white/45">{AGE_ROMAN[unit.age]}</span>
        </>
      )}
    </div>
  )
}

function LegacySide({
  side,
  align,
  winOdds,
  compact = false,
}: {
  side: MatchupSide
  align: 'left' | 'right'
  winOdds?: number | null
  compact?: boolean
}) {
  const { tt, gameName } = useI18n()
  const isRight = align === 'right'
  const color = isRight ? 'hsl(var(--loss))' : 'hsl(var(--win))'
  const rank =
    side.rankLevel && /[a-z]/i.test(side.rankLevel) ? tt(formatRankLevel(side.rankLevel)) : null
  const hasRow2 =
    !compact &&
    !side.isAI &&
    (rank != null ||
      side.rating != null ||
      side.winRate != null ||
      side.favoriteCivs.length > 0 ||
      winOdds != null)
  return (
    <div
      className={cn(
        'overlay-panel flex items-center',
        compact ? 'gap-2 px-2 py-1' : 'gap-3 px-3 py-1.5',
        isRight && 'flex-row-reverse',
      )}
      style={{
        background: panelBg(compact ? 0.5 : 0.7),
        boxShadow: `inset ${isRight ? '-' : ''}2px 0 0 0 ${color}`,
      }}
    >
      <CivFlag civ={side.civ} compact={compact} />
      <div className={cn('flex min-w-0 flex-col gap-0.5', isRight && 'items-end')}>
        <div
          className={cn('flex items-baseline gap-1.5 leading-none', isRight && 'flex-row-reverse')}
        >
          <span
            className={cn('whitespace-nowrap font-semibold', compact ? 'text-[13px]' : 'text-[15px] font-bold')}
            style={{ color }}
          >
            {side.civ ? gameName(civDisplayName(side.civ)) : tt('Unknown')}
          </span>
          <span
            className={cn(
              'flex items-center gap-1 font-medium text-white/80',
              compact ? 'text-[11px]' : 'text-[12px]',
              isRight && 'flex-row-reverse',
            )}
          >
            {side.isAI && (
              <span className="rounded bg-white/15 px-1 py-px text-[8px] font-semibold uppercase text-white/80">
                {tt('AI')}
              </span>
            )}
            <span className={compact ? 'max-w-[120px] truncate' : 'max-w-[170px] truncate'}>
              {side.name ?? (isRight ? tt('Opponent') : tt('You'))}
            </span>
            {compact && side.rating != null && (
              <span className="tabular-nums text-white/70">{formatRating(side.rating)}</span>
            )}
          </span>
        </div>
        {hasRow2 && (
          <div
            className={cn(
              'flex items-center gap-2 text-[11px] leading-none text-white/70',
              isRight && 'flex-row-reverse',
            )}
          >
            {rank && <span className="whitespace-nowrap">{rank}</span>}
            {side.rating != null && (
              <span className="whitespace-nowrap font-semibold tabular-nums text-white/85">
                {formatRating(side.rating)}
              </span>
            )}
            {side.winRate != null && (
              <span className="whitespace-nowrap tabular-nums">
                <span className={side.winRate >= 50 ? 'text-win' : 'text-loss'}>
                  {Math.round(side.winRate)}%
                </span>{' '}
                {tt('WR')}
              </span>
            )}
            {winOdds != null && <WinOddsChip pct={winOdds} />}
            {side.favoriteCivs.length > 0 && (
              <span className={cn('flex items-center gap-1', isRight && 'flex-row-reverse')}>
                {side.favoriteCivs.map((c) => (
                  <CivFlag key={c} civ={c} compact />
                ))}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
