/**
 * Build Order Practice Playlists / Curated Practice Queues (pure domain logic).
 *
 * Enables players to organize build orders into custom practice playlists
 * (e.g. "Order of the Dragon Practice: 1v1 Open, Fast Castle, 2v2 Frontline"),
 * manage queue sequences, and link active playlists directly to the in-game overlay cycle.
 */

import type { BuildOrder } from './buildOrderSchema'

export interface BuildPlaylist {
  id: string
  name: string
  description?: string
  civ?: string | null
  buildOrderIds: string[]
  createdAt: string
  updatedAt: string
}

function generatePlaylistId(): string {
  return `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Creates a new curated practice playlist.
 */
export function createBuildPlaylist(
  name: string,
  options?: {
    description?: string
    civ?: string | null
    initialBuilds?: string[]
  },
): BuildPlaylist {
  const now = new Date().toISOString()
  return {
    id: generatePlaylistId(),
    name: name.trim() || 'New Practice Playlist',
    description: options?.description?.trim() || '',
    civ: options?.civ ?? null,
    buildOrderIds: Array.from(new Set(options?.initialBuilds || [])),
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Appends a build order into the playlist without duplication.
 */
export function addBuildToPlaylist(playlist: BuildPlaylist, buildId: string): BuildPlaylist {
  const cleanId = buildId.trim()
  if (!cleanId || playlist.buildOrderIds.includes(cleanId)) return playlist

  return {
    ...playlist,
    buildOrderIds: [...playlist.buildOrderIds, cleanId],
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Removes a build order from the playlist.
 */
export function removeBuildFromPlaylist(playlist: BuildPlaylist, buildId: string): BuildPlaylist {
  const cleanId = buildId.trim()
  if (!playlist.buildOrderIds.includes(cleanId)) return playlist

  return {
    ...playlist,
    buildOrderIds: playlist.buildOrderIds.filter((id) => id !== cleanId),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Reorders build order entries in the playlist.
 */
export function reorderPlaylistBuilds(playlist: BuildPlaylist, newBuildIds: string[]): BuildPlaylist {
  return {
    ...playlist,
    buildOrderIds: Array.from(new Set(newBuildIds)),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Updates playlist metadata (name, description, civ tag).
 */
export function updateBuildPlaylistMeta(
  playlist: BuildPlaylist,
  updates: { name?: string; description?: string; civ?: string | null },
): BuildPlaylist {
  return {
    ...playlist,
    name: updates.name !== undefined ? updates.name.trim() || playlist.name : playlist.name,
    description: updates.description !== undefined ? updates.description.trim() : playlist.description,
    civ: updates.civ !== undefined ? updates.civ : playlist.civ,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Resolves full BuildOrder objects from a playlist based on all available catalog builds.
 */
export function resolvePlaylistBuilds(playlist: BuildPlaylist, allBuilds: BuildOrder[]): BuildOrder[] {
  const buildMap = new Map<string, BuildOrder>()
  for (const b of allBuilds) {
    buildMap.set(b.name, b)
  }

  const result: BuildOrder[] = []
  for (const id of playlist.buildOrderIds) {
    const found = buildMap.get(id)
    if (found) {
      result.push(found)
    }
  }
  return result
}

/**
 * Exports a playlist's build names to the overlay cycle format.
 */
export function exportPlaylistToOverlayCycle(playlist: BuildPlaylist): string[] {
  return [...playlist.buildOrderIds]
}
