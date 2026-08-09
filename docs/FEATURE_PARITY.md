# AoE4 overlay and guide parity

Audit date: 2026-08-09.

This is a capability audit, not a claim that the local application is a
pixel-for-pixel copy of any community project. The referenced projects have
different scopes: some are hosted browser overlays, some are native desktop
overlays, and some are build-order libraries.

## Matrix

| Capability                           | Local status                  | Implementation / limitation                                                                                                                                                                                                                                                                                                          |
| ------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AoE4World live player bar            | Implemented                   | Local `/live` browser source polls `/api/live`, renders every detected team, player name, civilization, rank, rating, win rate, favorite civilizations, map/mode, and hides outside an ongoing match. `Stream Desk` also builds the official hosted AoE4World profile URL with `top`/`floating` and alternate-civ options.           |
| Ranked and team formats              | Implemented                   | The live model keeps all teams, not only a 1v1 opponent; the stats/meta screens cover ranked/QM 1v1, 2v2, 3v3 and 4v4.                                                                                                                                                                                                               |
| OBS / Streamlabs browser source      | Implemented                   | Local tournament source and live-match source are copyable and previewable from `Stream Desk`.                                                                                                                                                                                                                                       |
| Tournament score graphics            | Implemented                   | Teams, civs, score, best-of, map series, civ draft, caster, countdown, spoiler, swap/reset, HTTP score routes, and CSS theme controls are available.                                                                                                                                                                                 |
| FluffyMaguro player panel            | Implemented                   | Native overlay includes matchup/stats, APM, post-game, session, counters, coach, age targets and build-order widgets.                                                                                                                                                                                                                |
| Illustrated build order              | Implemented                   | Build steps render game icons and resource tokens; font/image size and overlay positions are configurable.                                                                                                                                                                                                                           |
| Build step controls                  | Implemented                   | Clock-driven mode plus manual next/previous/reset step, build cycling, manual timer, build-only show/hide, title/timer visibility, and configurable global hotkeys.                                                                                                                                                                  |
| Custom BO library and cycle rules    | Implemented                   | Build Builder imports/exports illustrated JSON and TXT; `Use in overlay` persists custom BOs. Settings exposes the complete bundled + custom list, per-build enable/disable, and explicit cycle ordering.                                                                                                                          |
| RTS_Overlay compatibility            | Implemented                   | Import/export uses the normalized `.overlay.json` schema, with timing, villagers, resources, supply, age and notes. The editor validates feasibility and supports local save/share links.                                                                                                                                            |
| Build library search                 | Implemented                   | Library and Cellar now use tokenized fuzzy matching; searches tolerate punctuation, accents and incomplete subsequences.                                                                                                                                                                                                             |
| Faction/opponent build filters       | Implemented                   | Guides library and Cellar filter by own civilization, opponent civilization and provenance.                                                                                                                                                                                                                                          |
| AoE4Guides community data            | Implemented                   | Community source synchronizer/import path preserves author, score, views, patch, timestamps, source URL, confidence and sample metadata; duplicate build fingerprints are removed. Guides also has a debounced, typed online catalogue search using the provider's civ/sort API boundary, with preview and source-link preservation. |
| Counter helper / quiz / video finder | Implemented                   | Available in Guides and Explorer; local data and external-source links are kept separate.                                                                                                                                                                                                                                            |
| Structured casting / replay override | Implemented                   | Stream Desk exposes typed left/right name, civilization and rank overrides, live roster import, score/civ-draft controls and a local browser source; this covers the upstream override workflow without arbitrary code.                                             |
| Arbitrary custom overlay JavaScript  | Intentionally not implemented | The local stream source accepts bounded CSS only. Executing arbitrary scripts from a settings field would give an OBS browser source code-execution surface; use the typed controls or edit the local template in source.                                                                                                            |
| AoE4World account/comments/ratings   | Not replicated                | The app consumes public data and links to the hosted service; private account state, community comments and server-side rating writes require the corresponding remote authentication/backend.                                                                                                                                       |
| Hosted AoE4World UI clone            | Not replicated                | The official hosted bar remains available through the generated public URL. The local source is a self-contained, offline-capable equivalent for local game data and tournament graphics.                                                                                                                                            |

## Source-to-local mapping

- [AoE4World Overlay](https://github.com/aoe4world/overlay): hosted
  personalized profile bar, team modes and auto-hide behavior are represented
  by the official public URL builder and the local `/live` source.
- [FluffyMaguro AoE4 Overlay](https://github.com/FluffyMaguro/AoE4_Overlay):
  build-order widget, illustrated resources/game images, hotkeys, build cycling,
  player information and streaming overlay behavior are represented by the
  native overlay and `Stream Desk`.
- [RTS Overlay](https://rts-overlay.github.io/) and
  [CraftySalamander RTS_Overlay](https://github.com/CraftySalamander/RTS_Overlay):
  manual timer, step navigation, global hotkeys, draggable placement, fuzzy
  build search, faction/opponent filters and compatible build-order files are
  represented locally.
- [AoE4Guides](https://aoe4guides.com/): community build provenance and
  validated import/export are represented in Guides and Tincture Cellar.
- [aoe4world/data](https://github.com/aoe4world/data) and
  [aoe4world/explorer](https://github.com/aoe4world/explorer): the renderer
  consumes a compact, patch-pinned projection of units, buildings,
  technologies, upgrades and explorer records.
- [aoe4world/replays-api](https://github.com/aoe4world/replays-api): replay
  summary normalization follows version-aware field boundaries and keeps
  parser provenance visible in Replay Lab.
- [aoe4world/curated](https://github.com/aoe4world/curated): approved guides,
  analysed games and videos are synchronized into Explorer as provenance-tagged
  reference evidence and exported through Dumps.
- [aoe4world/docker-ruby-node](https://github.com/aoe4world/docker-ruby-node):
  retained as an optional Ruby/Node CI reference; it is not a runtime dependency
  of the Windows Electron app.

## Source-stack implementation audit

The current integration is deliberately an adapter stack, not a copy of every
upstream application:

- [jensbuehl/aoe4-guides](https://github.com/jensbuehl/aoe4-guides) and
  [gzordrai/orda](https://github.com/gzordrai/orda): the synchronizer queries
  the public build API across all supported civilization codes and sort orders;
  the renderer consumes one normalized BuildOrder schema with provider,
  patch, timestamp and provenance fields. Guides can also query a bounded
  online slice on demand (debounced from search/filter changes) and preview
  the normalized result before pinning or exporting it.
- [aoemods/attrib](https://github.com/aoemods/attrib) and
  [aoemods/AOEMods.Essence](https://github.com/aoemods/AOEMods.Essence): the
  offline importer records hashes, decoded-record counts, binary asset types
  and source revisions. The desktop synchronizer auto-discovers `Attrib.sga`,
  publishes compact Essence provenance to the bundled game-data layer and
  keeps explicit RGD/RRTex decoding opt-in. With RGD decoding enabled, the
  bounded `rgd-projection.json` index exposes local unit/building attributes
  (PBG identity, health, costs, train time, movement, armour and weapon refs)
  for patch audits while AoE4World remains the primary runtime source. Electron
  does not execute archive parsers or load unreviewed game binaries; audited
  projections are the runtime boundary. `aoemods/zig-essence` is retained as an
  independent cross-check.
  Data Studio compares that local projection against every bundled
  `aoe4world/data` combat unit and reports exact matches, civ-variant groups,
  field conflicts and missing counterparts with the projection warning count.
  This remains a validation lens only: AoE4World is still the patch-aware
  runtime source and PBG variants are never silently merged.
- [aoemods/aoetypes](https://github.com/aoemods/aoetypes),
  [aoemods/aoetypes-docs](https://github.com/aoemods/aoetypes-docs),
  [aoemods/AOE4-TSTL](https://github.com/aoemods/AOE4-TSTL),
  [aoemods/aoe4-typescript-template](https://github.com/aoemods/aoe4-typescript-template),
  [aoemods/lua-docs](https://github.com/aoemods/lua-docs),
  [aoemods/dodge-mod](https://github.com/aoemods/dodge-mod) and
  [aoemods/wiki](https://github.com/aoemods/wiki): these are audited developer
  references for TypeScript-to-Lua, API vocabulary, documentation and mod
  project layout. They are surfaced in the source registry and provenance
  manifest, but no mod code is executed or injected by RTSLytics.
- [haZiinstinct/aoe4-war-room](https://github.com/haZiinstinct/aoe4-war-room):
  the counter layer now evaluates the complete 205×205 directed pair space,
  carries the source revision, and exposes explainable role/cost/age evidence.
  Counter Lab also has a contextual pair evaluator with versioned weapon
  profiles, target-class bonus damage, budget/count, terrain, micro and relative
  upgrade controls. It remains a ranked learning aid rather than a combat
  simulator or win-probability model.
- [willfindlay/prelate-rs](https://github.com/willfindlay/prelate-rs) and
  [aoe4world/overlay](https://github.com/aoe4world/overlay): typed AoE4World
  contracts live in the main process, including de-duplicated pagination for
  account history and leaderboards; the live overlay keeps all detected teams.
- [willbonney/aoe4stats.com](https://github.com/willbonney/aoe4stats.com):
  public dump discovery is rate-limited and cached, while every bundled source
  now exposes a versioned snapshot envelope and freshness state. Large dump
  mirroring is still opt-in rather than an automatic background download. Data
  Studio can run the checked-in source orchestrator in dry-run or explicit
  refresh mode and reports its captured output. The orchestrator also records
  exact GitHub HEAD revisions for all twenty-four referenced upstream repositories in
  `data/research/aoe4-upstream-revisions.json`, so a source refresh can be
  reproduced and reviewed instead of relying on an unpinned `main`/`master`.
- [FramHerel/Aoe4OverlayWinUI3](https://github.com/FramHerel/Aoe4OverlayWinUI3)
  and [ycxisreal/ycx-aoe4-hud-frontend](https://github.com/ycxisreal/ycx-aoe4-hud-frontend):
  native always-on-top placement, typed IPC, hotkeys and local HUD boundaries
  are integrated; unsafe memory/OCR capture is intentionally not bundled.
- [LeandroSQ/aoe4-counter-chart](https://github.com/LeandroSQ/aoe4-counter-chart):
  the presentation idea is represented, but its stale matchup values are not
  imported as data.

The compact `aoe4world/data` projection now keeps every non-fire weapon's
damage, cadence, range and class-bonus groups. The generated fields are
versioned with the same source commit as the Production Calculator, so a
refresh updates both economic calculations and matchup evidence together.

## Deliberate boundaries

The local app is stronger than the referenced overlays in post-game analysis:
it compares the player's steps and economy against a build, scores timing
deviations, separates team formats and provides coaching signals. Conversely,
it does not pretend to reproduce remote account features or execute arbitrary
third-party JavaScript. Those are product-boundary decisions, not hidden
missing functionality.

## Match-analysis methodology

The match review now exposes the evidence layer alongside the interpretation:

- `summary totals`, `economy timeline`, `score timeline`, `build timeline`, and
  `casualty timeline`, and `combat counters` are reported as explicit coverage flags. A low-coverage
  game is not allowed to look like a complete replay audit.
- `Unspent float` is the last recorded resource bank as a percentage of total
  gathered resources. It is a conversion clue, not a claim that saving for an
  age-up or technology was a mistake.
- `Unit cadence` reports gaps between completed non-villager units. It is
  deliberately worded as an observable completion gap because the summary does
  not identify the exact queue state of every production building.
- `First pressure` uses the decoded STLS casualty records: first hostile
  military loss for each side, the first opponent loss attributed to the player,
  and the elapsed response window. Unit type and timestamp are shown as evidence;
  the UI does not call this a complete fight log or infer vision, movement, or
  the exact reason a fight was won.
- Reference selection now tests compatible candidates against the actual player
  event timeline. A caption-backed build with recognized tactics extracted from
  a VOD linked to the same game is preferred; metadata-only VOD records remain
  source evidence but cannot override the observed fit. Otherwise the best
  observed fit is labeled as inferred, with its matched-action count and
  confidence shown next to the source link. The same VOD/build audit is exposed
  on local history and public match detail pages.
- Local replay command analysis groups decoded inputs into five-minute windows
  and reports first-to-last activity change. Unknown commands, truncated data,
  failed actions, worker allocation, and scouting remain visible limitations.
- Summary decoding follows the current `aoe4world/replays-api` STPD contract
  through v2034 (AoE4 15.4.8719). Every decoded summary carries the upstream
  revision, observed STPD version and local/remote coverage. A future format
  can optionally be delegated from the main process to a user-configured
  `/Summary/new` service; no public replays API endpoint is assumed.

This follows the same evidence-first approach as the [AoE4World Game Summary
FAQ](https://www.aoe4world.com/faq), which distinguishes exact unstacked
timings from higher-level post-game interpretation, and the versioned parser
guidance in [aoe4world/replays-api](https://github.com/aoe4world/replays-api).
