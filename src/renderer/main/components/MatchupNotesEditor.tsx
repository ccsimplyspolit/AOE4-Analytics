import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Check, FileEdit, Trash2 } from 'lucide-react'
import { civDisplayName } from '@domain/civ'
import {
  formatNoteKey,
  type MatchupNoteContext,
  resolveActiveNotes,
  updateNoteInMap,
} from '@domain/matchupNotes'
import { cn } from '@shared/lib/utils'
import { useSettings, useUpdateSettings } from '../queries/useProfile'
import { useI18n } from '../../i18n'

export function MatchupNotesEditor({
  context,
  className,
}: {
  context: MatchupNoteContext
  className?: string
}) {
  const { tt, gameName } = useI18n()
  const { data: settings } = useSettings()
  const updateSettings = useUpdateSettings()

  const { myCiv, oppCiv, map } = context
  const notes = useMemo(() => settings?.matchupNotes || {}, [settings?.matchupNotes])

  type ActiveTab = 'oppCiv' | 'matchup' | 'map'
  const [tab, setTab] = useState<ActiveTab>(oppCiv ? 'oppCiv' : map ? 'map' : 'oppCiv')
  const [draft, setDraft] = useState('')
  const [savedBadge, setSavedBadge] = useState(false)

  const activeKey =
    tab === 'oppCiv' && oppCiv
      ? formatNoteKey('civ', oppCiv)
      : tab === 'matchup' && myCiv && oppCiv
        ? formatNoteKey('matchup', myCiv, oppCiv)
        : tab === 'map' && map
          ? formatNoteKey('map', map)
          : null

  const resolved = resolveActiveNotes(notes, context)

  useEffect(() => {
    if (activeKey) {
      setDraft(notes[activeKey] || '')
    } else {
      setDraft('')
    }
  }, [activeKey, notes])

  const handleSave = async (overrideContent?: string) => {
    if (!activeKey) return
    const contentToSave = overrideContent !== undefined ? overrideContent : draft
    const nextNotes = updateNoteInMap(notes, activeKey, contentToSave)

    await updateSettings.mutateAsync({
      matchupNotes: nextNotes,
    })

    setSavedBadge(true)
    setTimeout(() => setSavedBadge(false), 2000)
  }

  const handleDelete = async () => {
    if (!activeKey) return
    const nextNotes = updateNoteInMap(notes, activeKey, '')
    setDraft('')
    await updateSettings.mutateAsync({
      matchupNotes: nextNotes,
    })
  }

  const quickTips = [
    tt('Early wooden wall on woodline'),
    tt('Sheep patrol & dual scout'),
    tt('Fast Castle timing defense'),
    tt('Watch out for 2TC boom'),
    tt('Contest sacred sites at 8m'),
    tt('Forward tower on primary gold'),
  ]

  const handleInsertTip = (tip: string) => {
    const next = draft ? `${draft}\n• ${tip}` : `• ${tip}`
    setDraft(next)
    void handleSave(next)
  }

  if (!oppCiv && !map) return null

  return (
    <div className={cn('rounded-lg border border-border/80 bg-card/60 p-3.5 space-y-3', className)}>
      {/* Header with Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <BookOpen className="h-4 w-4 text-amber-500" />
          <span>{tt('Matchup & Map Notes')}</span>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-secondary/50 p-0.5 rounded-md border border-border/40 text-[11px]">
          {oppCiv && (
            <button
              type="button"
              onClick={() => setTab('oppCiv')}
              className={cn(
                'rounded px-2 py-0.5 font-medium transition-colors',
                tab === 'oppCiv'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tt('vs')} {gameName(civDisplayName(oppCiv))}
              {resolved.civNote && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />}
            </button>
          )}

          {myCiv && oppCiv && (
            <button
              type="button"
              onClick={() => setTab('matchup')}
              className={cn(
                'rounded px-2 py-0.5 font-medium transition-colors',
                tab === 'matchup'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tt('Matchup')}
              {resolved.matchupNote && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />}
            </button>
          )}

          {map && (
            <button
              type="button"
              onClick={() => setTab('map')}
              className={cn(
                'rounded px-2 py-0.5 font-medium transition-colors',
                tab === 'map'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {map}
              {resolved.mapNote && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />}
            </button>
          )}
        </div>
      </div>

      {/* Editor Textarea */}
      <div className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            tab === 'oppCiv' && oppCiv
              ? `${tt('Personal notes when playing against')} ${gameName(civDisplayName(oppCiv))}... (e.g. wall relic access, scout opening)`
              : tab === 'matchup' && myCiv && oppCiv
                ? `${tt('Specific advice for')} ${gameName(civDisplayName(myCiv))} ${tt('vs')} ${gameName(civDisplayName(oppCiv))}...`
                : `${tt('Map-specific notes for')} ${map || 'this map'}...`
          }
          className="w-full h-20 rounded-md border border-input bg-background/80 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none font-sans"
        />

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
            <FileEdit className="h-3 w-3 text-muted-foreground/80" />
            {tt('Quick tips')}:
          </span>
          {quickTips.slice(0, 4).map((tip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleInsertTip(tip)}
              className="text-[10px] rounded-sm bg-secondary/70 hover:bg-secondary border border-border/40 px-1.5 py-0.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              + {tip}
            </button>
          ))}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
          {savedBadge ? (
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
              <Check className="h-3 w-3" /> {tt('Saved')}
            </span>
          ) : (
            <span>{tt('Notes persist locally and show in match prep.')}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {draft && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors p-1"
              title={tt('Delete note')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={updateSettings.isPending}
            className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            {savedBadge ? <Check className="h-3 w-3" /> : null}
            {tt('Save note')}
          </button>
        </div>
      </div>
    </div>
  )
}
