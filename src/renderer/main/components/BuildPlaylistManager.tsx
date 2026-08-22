import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FolderPlus,
  Layers,
  Play,
  Plus,
  Trash2,
  Check,
  Sparkles,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react'
import type { BuildOrder } from '@domain/buildOrderSchema'
import { buildOrderCivLabel } from '@domain/buildOrderSchema'
import {
  type BuildPlaylist,
  createBuildPlaylist,
  removeBuildFromPlaylist,
  reorderPlaylistBuilds,
  resolvePlaylistBuilds,
  exportPlaylistToOverlayCycle,
} from '@domain/buildPlaylists'
import { civDisplayName } from '@domain/civ'
import { cn } from '@shared/lib/utils'
import { useSettings, useUpdateSettings } from '../queries/useProfile'
import { useI18n } from '../../i18n'

export function BuildPlaylistManager({
  allBuilds,
  className,
}: {
  allBuilds: BuildOrder[]
  className?: string
}) {
  const { tt, gameName } = useI18n()
  const { data: settings } = useSettings()
  const updateSettings = useUpdateSettings()

  const playlists: BuildPlaylist[] = settings?.buildPlaylists || []
  const activePlaylistId = settings?.activeBuildPlaylistId ?? null

  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    playlists[0]?.id ?? null,
  )
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCiv, setNewCiv] = useState<string>('')
  const [appliedFeedback, setAppliedFeedback] = useState(false)

  const activeSelected = playlists.find((p) => p.id === (selectedPlaylistId || activePlaylistId)) || playlists[0]

  const handleCreatePlaylist = async () => {
    if (!newTitle.trim()) return
    const pl = createBuildPlaylist(newTitle, {
      description: newDesc,
      civ: newCiv || null,
    })

    const next = [...playlists, pl]
    await updateSettings.mutateAsync({
      buildPlaylists: next,
      activeBuildPlaylistId: activePlaylistId || pl.id,
    })

    setSelectedPlaylistId(pl.id)
    setShowCreateModal(false)
    setNewTitle('')
    setNewDesc('')
    setNewCiv('')
  }

  const handleDeletePlaylist = async (id: string) => {
    const next = playlists.filter((p) => p.id !== id)
    await updateSettings.mutateAsync({
      buildPlaylists: next,
      activeBuildPlaylistId: activePlaylistId === id ? (next[0]?.id ?? null) : activePlaylistId,
    })
    if (selectedPlaylistId === id) {
      setSelectedPlaylistId(next[0]?.id ?? null)
    }
  }

  const handleRemoveBuild = async (playlistId: string, buildName: string) => {
    const target = playlists.find((p) => p.id === playlistId)
    if (!target) return
    const updated = removeBuildFromPlaylist(target, buildName)
    const next = playlists.map((p) => (p.id === playlistId ? updated : p))
    await updateSettings.mutateAsync({
      buildPlaylists: next,
    })
  }

  const handleMoveBuild = async (playlistId: string, index: number, direction: 'up' | 'down') => {
    const target = playlists.find((p) => p.id === playlistId)
    if (!target) return
    const list = [...target.buildOrderIds]
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= list.length) return

    const temp = list[index]!
    list[index] = list[targetIdx]!
    list[targetIdx] = temp

    const updated = reorderPlaylistBuilds(target, list)
    const next = playlists.map((p) => (p.id === playlistId ? updated : p))
    await updateSettings.mutateAsync({
      buildPlaylists: next,
    })
  }

  const handleApplyToOverlayCycle = async (playlist: BuildPlaylist) => {
    const cycle = exportPlaylistToOverlayCycle(playlist)
    await updateSettings.mutateAsync({
      activeBuildPlaylistId: playlist.id,
      overlay: {
        ...(settings?.overlay || {}),
        buildOrderCycle: cycle,
      },
    })
    setAppliedFeedback(true)
    setTimeout(() => setAppliedFeedback(false), 2500)
  }

  const resolvedBuilds = activeSelected ? resolvePlaylistBuilds(activeSelected, allBuilds) : []

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            {tt('Curated Practice Playlists')}
          </h2>
          <p className="text-xs text-muted-foreground">
            {tt('Organize focused queues of build orders for warmup, civ mastery, or tournament practice.')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          {tt('New Playlist')}
        </button>
      </div>

      {playlists.length === 0 ? (
        /* Empty State */
        <div className="rounded-xl border border-dashed border-border p-8 text-center bg-card/40">
          <FolderPlus className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
          <h3 className="text-sm font-semibold text-foreground">{tt('No practice playlists yet')}</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
            {tt('Create a playlist to group your favorite openings for Order of the Dragon, Byzantines, or Fast Castle rushes.')}
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-secondary px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary/80 border border-border/60 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {tt('Create your first playlist')}
          </button>
        </div>
      ) : (
        /* 2-Column Playlist Grid */
        <div className="grid gap-6 md:grid-cols-12">
          {/* Left Column: Playlist Tabs / Selector */}
          <div className="md:col-span-4 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              {tt('Your Playlists')} ({playlists.length})
            </span>
            <div className="space-y-1.5">
              {playlists.map((pl) => {
                const isSelected = activeSelected?.id === pl.id
                const isActiveInOverlay = activePlaylistId === pl.id
                return (
                  <div
                    key={pl.id}
                    onClick={() => setSelectedPlaylistId(pl.id)}
                    className={cn(
                      'group flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-all',
                      isSelected
                        ? 'border-primary/80 bg-primary/10 shadow-sm'
                        : 'border-border/60 bg-card hover:bg-secondary/50',
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-foreground truncate">{pl.name}</span>
                        {isActiveInOverlay && (
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">
                            {tt('Active Overlay')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span>
                          {pl.buildOrderIds.length} {tt('builds')}
                        </span>
                        {pl.civ && <span>• {gameName(civDisplayName(pl.civ))}</span>}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleDeletePlaylist(pl.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                      title={tt('Delete playlist')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Column: Selected Playlist Details & Build List */}
          <div className="md:col-span-8 space-y-4">
            {activeSelected && (
              <div className="rounded-xl border border-border/80 bg-card/70 p-5 space-y-4 shadow-sm">
                {/* Playlist Info Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-foreground">{activeSelected.name}</h3>
                    {activeSelected.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{activeSelected.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] rounded bg-secondary px-2 py-0.5 text-muted-foreground">
                        {activeSelected.buildOrderIds.length} {tt('build orders')}
                      </span>
                      {activeSelected.civ && (
                        <span className="text-[11px] rounded bg-secondary px-2 py-0.5 text-muted-foreground">
                          {gameName(civDisplayName(activeSelected.civ))}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sync to Overlay Action */}
                  <button
                    type="button"
                    onClick={() => handleApplyToOverlayCycle(activeSelected)}
                    disabled={activeSelected.buildOrderIds.length === 0}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all shadow-sm',
                      activePlaylistId === activeSelected.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90',
                    )}
                  >
                    {appliedFeedback || activePlaylistId === activeSelected.id ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {appliedFeedback
                      ? tt('Applied to Overlay!')
                      : activePlaylistId === activeSelected.id
                        ? tt('Active Overlay Cycle')
                        : tt('Set as Overlay Cycle')}
                  </button>
                </div>

                {/* Build Order Items List */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1">
                    <Play className="h-3.5 w-3.5 text-primary" />
                    {tt('Queue Sequence')} ({resolvedBuilds.length})
                  </span>

                  {resolvedBuilds.length === 0 ? (
                    <div className="p-4 rounded-lg border border-dashed border-border/60 text-center text-xs text-muted-foreground">
                      {tt('No builds added to this playlist yet. Browse the Build Catalog and click "+ Add to Playlist".')}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {resolvedBuilds.map((b, idx) => (
                        <div
                          key={`${b.name}_${idx}`}
                          className="flex items-center justify-between rounded-lg border border-border/50 bg-background/60 p-2.5 transition-colors hover:bg-background/90"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <span className="font-semibold text-xs text-foreground truncate block">
                                {b.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {gameName(civDisplayName(buildOrderCivLabel(b)))} • {b.build_order?.length || 0} {tt('steps')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveBuild(activeSelected.id, idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                              title={tt('Move up')}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveBuild(activeSelected.id, idx, 'down')}
                              disabled={idx === resolvedBuilds.length - 1}
                              className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                              title={tt('Move down')}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <Link
                              to={`/civ/${buildOrderCivLabel(b).toLowerCase()}`}
                              className="p-1 rounded text-primary hover:text-primary/80"
                              title={tt('View build')}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleRemoveBuild(activeSelected.id, b.name)}
                              className="p-1 rounded text-muted-foreground hover:text-destructive"
                              title={tt('Remove from playlist')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="text-base font-bold text-foreground">{tt('Create Practice Playlist')}</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">{tt('Playlist Title')}</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Order of the Dragon 1v1 Mastery"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">{tt('Description (optional)')}</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="e.g. Fast Castle into relic control queue"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">{tt('Target Civilization (optional)')}</label>
                <input
                  type="text"
                  value={newCiv}
                  onChange={(e) => setNewCiv(e.target.value)}
                  placeholder="e.g. order_of_the_dragon, french, byzantines"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {tt('Cancel')}
              </button>
              <button
                type="button"
                onClick={handleCreatePlaylist}
                disabled={!newTitle.trim()}
                className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {tt('Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
