export type CommunitySiteKind = 'api' | 'local' | 'live'

export interface CommunitySite {
  id: string
  name: string
  url: string
  kind: CommunitySiteKind
  origin: 'aoe4world' | 'aoe4guides' | 'aoe4club' | 'reddit-yoxtt9'
  localTo?: string
  description: string
}

/**
 * Sites studied for this hub. Live rows open the original page. Local rows
 * use bundled AoE4World data instead of scraping aoe4.club HTML. The Reddit
 * thread is a 2022 community list of build-order sites, not an API.
 */
export const COMMUNITY_SITES: readonly CommunitySite[] = [
  {
    id: 'aoe4world-home',
    name: 'AoE4World',
    url: 'https://aoe4world.com/',
    kind: 'api',
    origin: 'aoe4world',
    localTo: '/scout?section=ladders',
    description: 'Profiles, ladders, match history, civ/map stats, VODs and public dumps via /api/v0.',
  },
  {
    id: 'aoe4guides-home',
    name: 'AoE4Guides',
    url: 'https://aoe4guides.com/',
    kind: 'api',
    origin: 'aoe4guides',
    localTo: '/guides',
    description: 'Community build orders. Live catalogue uses their public Cloud Run list API; a pasted /builds/<id> still loads the proxied JSON.',
  },
  {
    id: 'aoe4club-home',
    name: 'AoE4 Club',
    url: 'https://www.aoe4.club/en',
    kind: 'live',
    origin: 'aoe4club',
    localTo: '/lab?section=club&tab=club',
    description: 'Civ database, unit compare, DPS and cost calculators. No public JSON API; the Tools lab recreates those three calculators from aoe4world/data.',
  },
  {
    id: 'aoe4club-compare',
    name: 'AoE4 Club · Unit compare',
    url: 'https://www.aoe4.club/en/compare/units',
    kind: 'live',
    origin: 'aoe4club',
    localTo: '/lab?section=club&tab=club&lab=compare',
    description: 'Side-by-side hit points, armor, attacks, costs and civ availability.',
  },
  {
    id: 'aoe4club-dps',
    name: 'AoE4 Club · DPS calculator',
    url: 'https://www.aoe4.club/en/compare/dps-calculator',
    kind: 'live',
    origin: 'aoe4club',
    localTo: '/lab?section=club&tab=club&lab=dps',
    description: 'Damage, time-to-kill and technology context. Local preview uses compact armor math, not a frame simulator.',
  },
  {
    id: 'aoe4club-cost',
    name: 'AoE4 Club · Cost calculator',
    url: 'https://www.aoe4.club/en/tools/cost-calculator',
    kind: 'live',
    origin: 'aoe4club',
    localTo: '/lab?section=club&tab=club&lab=cost',
    description: 'Army resource bill and gather-source villager-seconds from bundled unit costs.',
  },
  {
    id: 'aoe4club-civs',
    name: 'AoE4 Club · Civilizations',
    url: 'https://www.aoe4.club/en/civs',
    kind: 'live',
    origin: 'aoe4club',
    localTo: '/explorer',
    description: 'Live civ/unit/tech database (patch-stamped on their site). Local Explorer uses the aoe4world/data snapshot.',
  },
  {
    id: 'age4builder',
    name: 'age4builder',
    url: 'https://age4builder.com/',
    kind: 'api',
    origin: 'reddit-yoxtt9',
    localTo: '/guides',
    description: 'Illustrated overlay builds. Paste a builder link into Guides/Tincture Cellar.',
  },
  {
    id: 'aoeivbuilds',
    name: 'AOE4 Builds',
    url: 'https://www.aoeivbuilds.com/',
    kind: 'api',
    origin: 'reddit-yoxtt9',
    localTo: '/guides',
    description: 'Text build-order exports. Import any /build_orders/<id> link into Cellar.',
  },
  {
    id: 'rts-overlay',
    name: 'RTS Overlay',
    url: 'https://rts-overlay.github.io/',
    kind: 'live',
    origin: 'reddit-yoxtt9',
    description: 'Browser overlay build stepper. Compatible Overlay JSON can be imported locally.',
  },
  {
    id: 'liquipedia-bo',
    name: 'Liquipedia AoE IV',
    url: 'https://liquipedia.net/ageofempires/Age_of_Empires_IV',
    kind: 'live',
    origin: 'reddit-yoxtt9',
    description: 'Tournament pages, civ overviews and historical context from the 2022 community list.',
  },
  {
    id: 'reddit-thread',
    name: 'r/aoe4 build-order thread',
    url: 'https://www.reddit.com/r/aoe4/comments/yoxtt9/what_are_some_good_websites_for_build_order/',
    kind: 'live',
    origin: 'reddit-yoxtt9',
    description: 'Original Nov 2022 discussion that pointed players at AoE4Guides, age4builder, AOE4 Builds and AoE4World.',
  },
]
