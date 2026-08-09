# RTSLytics

[![CI](https://github.com/alesxxxx/AOE4-Analytics/actions/workflows/ci.yml/badge.svg)](https://github.com/alesxxxx/AOE4-Analytics/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Platform: Windows](https://img.shields.io/badge/platform-Windows-blue.svg)

Age of Empires IV companion for scouting, overlay help, and post-game stats.

RTSLytics is read-only. It uses public APIs and your own local AoE4 files.

## Features

- Pre-game scouting: opponent rank, rating, recent form, favorite civs, recent public matches, and exact personal head-to-head history.
- Team plans: practical roles and priorities based on the public civilization lineup.
- In-game overlay: top matchup bar, civ flags, ranks, key units, counters, win odds by rating, and optional live APM.
- Adaptive Build Coach: conditional responses during a match and evidence-linked recovery plans after it.
- Session tracker: today's record at a glance ("3W – 1L +42") on the overlay, so a losing streak is visible without leaving the game.
- Live match clock widgets: a step-by-step build-order guide (pin any build from Guides) and age-up pace targets for your rank, driven by the real game clock (your own log file, pauses included). Build orders can be shown as illustrated cards or compact plain text, with manual timer/step hotkeys for practice and casting.
- Post-game review: result card, Turning-Point Story, economy grade, APM, trends, raw team contribution breakdowns, explicit evidence coverage, unspent-resource float, age checkpoints, and observable unit-completion cadence. Replay analysis also compares five-minute command windows to surface activity drop-off without presenting it as a direct villager-idle measurement.
- Forensic batch report: a Markdown audit of every locally cached game summary, with every player's actual opening, ages, economy, army, tech, APM, and evidence-backed personal findings. The match page infers the most likely compatible reference from the observed timeline; an exact linked Twitch/YouTube VOD build takes priority and keeps its source video link. Your selected build is scored only when its civilization matches.
- Benchmark Lens: compare recent stretches and filtered personal samples with the sample size shown for every metric.
- Matchup Lab: global directional matchup data and personal local results, kept separate with honest sample counts.
- Data Studio: filter local history by civ, opponent, map, format, patch or season, result, duration, and time window; filtered views can be bookmarked.
- Guides and data: civ pages, tier lists, counters, build orders, landmarks, and matchup stats.
- Community build sources: synced AoE4Guides catalog, debounced typed online AoE4Guides search with preview/source links, live searchable AOE4 Builds catalogue plus one-click URL imports (provider text export normalized into Cellar), validated `.overlay.json` imports from age4builder/other builders, and TXT import/export for classic RTS Overlay workflows.
- Explorer: bundled AoE4World units, buildings, technologies and upgrades with age/civilization filters, patch audit, and JSON/CSV dump exports.
- Online video/streamer search: current AoE4World Twitch VODs and linked streamer profiles, with optional direct YouTube/Twitch provider results; trusted YouTube and Twitch VODs open in the lazy embedded player when the provider permits it. Tincture can now scan the complete local history (up to 5,000 games) for exact AoE4World-linked Twitch VODs and distill every accessible caption track into Cellar build/tactic evidence with progress reporting.
- Broadcast toolkit: Stream Desk serves a local browser source for OBS/Streamlabs with team graphics, series scores, spoiler guard, countdowns, AoE2CM civ-draft import, structured casting/replay overrides for names/civs/ranks, and StreamDeck-compatible HTTP commands. Guides also includes a local shortcut trainer inspired by Aegis.
- Local support: ranked, Quick Match, custom games, and vs-AI where local files provide the data.

## Screenshots

<p align="center">
  <img src="docs/screenshots/overlay.png" width="720" alt="In-game overlay"><br>
  <sub><b>In-game overlay</b> — your build order vs theirs, hard-counters ringed</sub>
</p>

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/dashboard.png" width="100%" alt="Dashboard"><br><sub><b>Dashboard</b> — ranks, rating, recent form, match prep</sub></td>
    <td width="50%"><img src="docs/screenshots/my-stats.png" width="100%" alt="My Stats"><br><sub><b>My Stats</b> — playstyle radar, performance, rating over time</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/scout.png" width="100%" alt="Scout"><br><sub><b>Scout</b> — ladder leaderboard and opponent lookup</sub></td>
    <td width="50%"><img src="docs/screenshots/civ-meta.png" width="100%" alt="Civ Meta"><br><sub><b>Civ Meta</b> — live tier list and win rates</sub></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><img src="docs/screenshots/guides.png" width="50%" alt="Guides"><br><sub><b>Guides</b> — build orders, counter helper, civ quiz</sub></td>
  </tr>
</table>

## AoE4 Tincture layer

The `/tincture` route is the decision layer built on top of RTSLytics:

- **Meta Ledger** combines live AoE4World civ statistics with local build-order coverage. Live sample size and local curation count are shown as separate signals.
- **Cellar** is the Tincture archive: it indexes every valid JSON build in the source tree, deduplicates identical step lists, keeps provenance/patch/timing metadata, supports filters and shareable build URLs, imports/exports `.overlay.json`, and exports the current slice as JSON/CSV.
- **Match Brief** reads the current main-process overlay roster and gives an immediate civ/unit counter read; **Counter Lab** is the deeper War Room-style matchup workspace under Civ Meta.
- **Match Coach** resolves a player through the cached AoE4World profile + last-game endpoints, shows the match roster/map/patch, turns the current civ profile into an advisory read, ranks compatible Cellar builds, and links directly into Cellar or Production Calculator. It does not claim to infer a build from the public match payload.
- **Live match command center** fuses the AoE4 process, AoE4World `ongoing` state, and consent-gated local `warnings.log` data to identify the current game, roster, teammates, enemies, civ counters, map/patch source, and overlay guidance. Public games use the live roster; custom/AI games use the local roster instead of stale public history.
- **Replay Lab** has three archive paths: a paginated local index of every numeric `matchhistory` record (including metadata-only games without `replay.rec`), a paginated AoE4World account history enriched with Relic upload slots, and an authenticated local cache for downloadable online `.rec` files. The optional **Auto-cache available page replays** toggle downloads the currently visible account-history page when Steam is connected; the manual button can repeat that operation safely. **Cache summaries** batch-persists Relic datatype-1 `stats.rgs` blobs for the visible page, while **Open summary** loads the same data on demand. **Analyze replay** decodes the documented `game tick → block → command` stream from a local or cached `.rec` and exposes exact tick timestamps, command types, production-queue PBGIDs, per-player command gaps/APM, and parser coverage. Unknown or damaged records remain explicit coverage gaps; gaps are not reported as fake villager idle or failed actions.
- **Patch audit** compares the patch identifiers reported by live AoE4World meta with patch metadata on local builds, separating covered, legacy, and unversioned builds. The scheduled distiller persists the source patch set alongside each snapshot.
- **Production Calculator** uses the vendored AoE4World unit snapshot, supports age-filtered unit pools, continuous production lines, building-count or target-units-per-minute mode, gather source, custom gather rates, production speed, cost discounts, passive income, civ modifiers, and build-order composition import.
- **Unit-level counter candidates** use the War Room approach: a transparent role graph is combined with the responding civ's real roster, age, resource cost and training time. The result is a ranked answer list, not a combat simulator.
- **Counter Calculator parity** adds AoE4World's map, opponent civilization, rating-range and patch filters to the live map ranking. The local view also loads a directional matchup for the current leader and can open the exact official GET query with the same filters.
- **Explorer Quiz parity** includes difficulty progression, no-easy mode, A/B/C/D and 1/2/3/4 keyboard answers, streak/best-streak tracking, and a direct Twitch-viewer link.
- **Explorer and dump tools** use a generated, compact projection of the AoE4World game-data repository. They are deterministic and offline after sync; raw replays, full transcripts, and arbitrary executable game data are not bundled.
- **Broadcast / Stream Desk** is a local replacement for the useful control surface of community stream-manager tools. It intentionally does not inject into AoE4 or read game memory; OBS connects to `http://127.0.0.1:4174/` after the server is started from the app. The live roster source is `http://127.0.0.1:4174/live?theme=top&includeAlts=true`; use `theme=floating` for a corner layout. It auto-hides outside an ongoing match and includes all players in 1v1/2v2/3v3/4v4, rank, rating, win rate, current civ, and most-played civ flags. Stream Desk also supports structured casting overrides through its UI, a bounded CSS-only theme editor for the local source, and never executes arbitrary JavaScript.
- **HUD/OCR boundary** defines a versioned, confidence-scored local WebSocket contract for calibrated timer, population, idle-villager and resource observations. It remains optional and never reads game memory or injects into the game.
- The calculator math lives in `src/domain/productionCalculator.ts`; current calculator-style civ rules are isolated in `src/domain/productionModifiers.ts` and covered by Vitest tests. The screen stays inside the existing Electron/React/IPC boundaries.

### Optional translation API

The UI keeps built-in Russian/English copy and can lazily translate missing Ukrainian or German strings through an optional provider. Open **Settings → Translation API**, choose **DeepL Free/Pro** or **LibreTranslate**, enter the key, and enable automatic translation. DeepL requests use the authenticated `POST /v2/translate` endpoint; LibreTranslate can use a managed endpoint with a key or a self-hosted endpoint without one. The key is encrypted with the operating system's Electron secure storage, never exposed to the renderer or OBS source, and returned translations are cached locally. If the provider is disabled, offline, or rate-limited, the UI keeps its built-in English fallback.

To update the base app from upstream:

```bash
git fetch origin
git pull --ff-only origin main
npm ci
npm run verify
```

The AoE4 Tincture additions are intentionally kept in separate domain/screen files so upstream updates remain easy to review and merge.

### Build-order import

The build archive is no longer a hand-maintained import list. Vite includes every JSON file under `src/data/buildOrders/`, while the importer normalizes external exports into `src/data/buildOrders/imported/`, validates the RTS_Overlay schema, and skips duplicate step lists:

```bash
python scripts/import_build_orders.py --source-dir data/research/build-orders/inbox --dry-run
python scripts/import_build_orders.py --source-dir data/research/build-orders/inbox --origin imported --patch 15.2
```

Put provider exports in `data/research/build-orders/inbox/`; raw source exports stay outside the shipped app. Imported files carry `schemaVersion`, `origin`, `patch`, `capturedAt`, and `updatedAt` metadata so the Cellar can distinguish them from curated and house builds.

The public `aoe4guides.com` API can be synchronised directly. Its API returns at most ten builds per request, so the synchroniser queries score, creation time, views and likes, then deduplicates identical step lists:

```bash
python scripts/sync_aoe4guides.py --dry-run
python scripts/sync_aoe4guides.py --limit-per-query 10
```

The import preserves provider metadata (`description`, `video`, `strategy`, `season`, `map`, score and view counters) and keeps the raw build order in the existing RTS_Overlay-compatible schema. The runtime normalizer upgrades older files to `schemaVersion: 1`; the Cellar validator reports impossible timings, age/requirement conflicts, population/resource-assignment overflow and conservative resource warnings. A provider response is never treated as a patch proof unless a patch label is supplied explicitly.

For a single automatic refresh of all external sources, use the orchestrator. It updates AoE4World game data, the offline icon catalogue, AoE4World meta snapshots, AoE4Guides build files, and writes a local run manifest. Use `--dry-run` to fetch and validate without changing the catalog:

```bash
npm run sync:sources:dry
npm run sync:sources
python scripts/sync_sources.py --skip-game-data --patch 15.2
python scripts/sync_sources.py --skip-icons --skip-game-data --skip-meta
```

The same orchestrator is available from **Data Studio → Data sources and coverage**:
**Check sources** runs a write-free validation, while **Refresh snapshots** runs the
checked-in synchronizer and shows its captured output. A refresh is intentionally
explicit and serialized; the renderer can only pass bounded flags and a validated
patch label. Restart the app after a successful write so bundled TypeScript imports
load the new snapshots.

The orchestrator also records the exact GitHub HEAD revision of every referenced
upstream adapter/reference (12 repositories) without cloning or executing their
code. This makes source provenance auditable after a patch refresh:

```bash
python scripts/audit_upstream_repos.py --dry-run
python scripts/audit_upstream_repos.py
python scripts/sync_sources.py --skip-game-data --skip-meta --skip-guides --skip-icons
```

The revision manifest is written to `data/research/aoe4-upstream-revisions.json`
and is included in `data/research/aoe4-source-sync.json`. If a local
`aoemods/attrib` or `AOEMods.Essence` export is available, inventory it explicitly
and keep the decoded files outside the renderer bundle:

```bash
python scripts/import_attrib_snapshot.py --input C:\path\to\decoded-attrib --source-revision <commit>
python scripts/sync_sources.py --skip-game-data --skip-meta --skip-guides --skip-icons --attrib-input C:\path\to\decoded-attrib
```

`AOEMods.Essence` remains the external unpack/decode tool for `.sga`, `.rgd`,
`.rrtex` and `.rrgeom`; the local importer only inventories and hashes its output.
The runtime uses reviewed projections from `aoe4world/data`, not arbitrary parser
code or untrusted game binaries.

The scheduled workflow `.github/workflows/sync-external-sources.yml` runs the same pipeline daily and commits only the generated source artifacts. A failed provider stops the run before later imports are reported as complete; already committed snapshots remain unchanged. Use `--skip-icons` when only metadata/build snapshots are needed.

### Game-data refresh and patch research

The compact unit snapshot is generated from the same `aoe4world/data` source used by the War Room project. The refresh retains local raw copies of units, buildings, technologies, upgrades and civilization data under the ignored research directory, while bundling only the 205 military-unit projection needed by the app:

```bash
python scripts/sync_aoe4world_data.py --dry-run
python scripts/sync_aoe4world_data.py
```

The source commit and fetch timestamp are written to `src/data/vendor/aoe4world-data/SOURCE.md` and exposed to Production Calculator as its data version. AOEMods.Essence/attrib exports can be compared against the raw research copy in a separate patch review; they are not loaded into the renderer as untrusted executable content.

The projection also retains non-fire weapon profiles (damage, attack cadence,
range and target-class bonus groups). Open **Civ Meta → Counter Lab → Contextual
Matchup Lab** to compare a concrete unit pair by equal resources or equal count,
terrain, micro and relative upgrades. The result is deliberately labeled as
explainable model evidence, not a combat-simulator outcome.

### Offline icon catalogue

The renderer uses one generated, offline-first icon resolver for Guides and the in-game overlay. It bundles all unique unit/building/technology/upgrade icon URLs present in the AoE4World snapshot, normalizes imported RTS_Overlay tokens such as `@unit_infantry/spearman-1.webp@`, and includes native resource, age and civilization icons decoded from `UIArt.sga` with [AOEMods.Essence](https://github.com/aoemods/AOEMods.Essence). CDN URLs remain only as a last-resort fallback for newly introduced slugs:

```bash
npm run sync:icons
node scripts/sync_aoe4_icons.mjs --native-png-root path/to/decoded/native-pngs
```

The generated catalogue and provenance report live in `src/data/vendor/aoe4-icons/`; the current snapshot contains 976 entity icons, 112 native UI icons and 4,398 normalized aliases. The source orchestrator rebuilds it automatically after refreshing the AoE4World data snapshot; run `node scripts/sync_aoe4_icons.mjs --native-png-root src/data/vendor/aoe4-icons/native` manually only when working on the icon pipeline itself.

### Meta snapshots

`scripts/distill_tincture.py` fetches the four AoE4World queue slices, writes the current normalized snapshot, and appends a bounded history archive. It uses atomic writes and preserves the previous files when an upstream response is invalid:

```bash
python scripts/distill_tincture.py --dry-run
python scripts/distill_tincture.py
```

The scheduled workflow runs the same distiller every six hours and commits only `src/data/tinctureMeta.json` and `src/data/tinctureHistory.json` when they change. Both files use snapshot envelopes with `schemaVersion`, `source`, `capturedAt`, and patch coverage.

### Video evidence harvest

`scripts/harvest_aoe4_videos.py` searches the 23 canonical civilizations, keeps videos inside a recent window, fetches available captions, and distills them into provenance-linked build-order evidence. Full captions stay in the ignored `data/research/raw-transcripts/` directory; the app receives only derived actions, resource signals, analysis topics, opponent-civilization context, military mentions, timings, confidence, and source links. These are evidence signals, not a claimed exact build order unless a timestamp or caption supports it. A one-civilization run writes its slice immediately, so interrupted monthly jobs can be resumed without losing completed factions.

```bash
# Pilot one civilization (metadata + captions where YouTube permits them)
python scripts/harvest_aoe4_videos.py --civ english --limit 10 --days 30 --transcripts

# Full monthly harvest: up to 100 recent videos per civilization
python scripts/harvest_aoe4_videos.py --all --limit 100 --days 30 --transcripts

# Faster resumable batches; repeat for a selected civilization if necessary
python scripts/harvest_aoe4_videos.py --civ english --limit 100 --candidates 120 --days 30 --transcripts

# Retry only captions for videos already stored in the local snapshot
python scripts/harvest_aoe4_videos.py --transcripts-only --limit 100

# Import manually exported captions without making any YouTube request
python scripts/harvest_aoe4_videos.py --local-transcripts-only --transcripts-dir path\to\captions --limit 100

# Regenerate a human-readable coverage report from the existing snapshot
python scripts/harvest_aoe4_videos.py --report-only --limit 100
```

Local caption files must be named `<youtube-video-id>.txt`, `.vtt`, `.srt`, or `.ttml`. They are normalized into the ignored raw-transcript cache and only derived signals are imported into the app. If YouTube challenges the current IP or returns `429` for metadata/captions, the script stops the current batch cleanly after saving completed civilization slices; rerun it later with a valid browser profile, an exported Netscape cookie file (`--cookies-file path\to\cookies.txt`), or `--proxy`. Each source exposes `transcriptStatus` (`available`, `missing`, `rate-limited`, or `not-requested`) so the UI can distinguish absent captions from a temporary block. The script records short derived observations and links rather than reproducing full third-party transcripts.

The generated `data/research/aoe4-video-report.md` is a compact audit of per-civilization coverage, caption availability, common topics, opponent context, and source samples.

## Download

Use the latest portable Windows release:

https://github.com/alesxxxx/AOE4-Analytics/releases/latest

Download `RTSLytics-*-portable.exe` and run it. No installer is required.

## Requirements

- Windows for the full overlay and local-file features.
- Node.js 22 (see [`.nvmrc`](.nvmrc)) and npm for development.

## Development

```bash
npm install
npm run dev
```

The Explorer online search works without keys through AoE4World's public data. To add direct provider results, set these variables before starting the app:

```powershell
$env:RTSLYTICS_YOUTUBE_API_KEY = '...'
$env:RTSLYTICS_TWITCH_CLIENT_ID = '...'
$env:RTSLYTICS_TWITCH_ACCESS_TOKEN = '...'
npm run dev
```

Keys stay in the Electron main process and are never exposed to the renderer.

Useful commands:

```bash
npm run typecheck
npm run lint
npm test
npm run verify
npm run pack
npm run dist
```

`npm run dist` builds the portable `.exe` in `release/`.

### Full-game forensic report

After syncing the account and connecting Steam (for ranked summaries), generate one evidence-first report for every cached match. It includes each player's observed opening and end-game totals; only the active player's compatible pinned build receives a plan score.

```powershell
$env:ELECTRON_RUN_AS_NODE='1'
.\node_modules\electron\dist\electron.exe scripts\generate_forensics_report.mjs `
  --profile <AoE4World-profile-id> `
  --out data\research\reports\forensics.md
```

The report names every game without a cached summary rather than fabricating its build order.

## Overlay

Run AoE4 in Borderless or Windowed Fullscreen. The overlay appears when RTSLytics detects a live match.

Hotkeys (defaults — rebindable in Settings → Overlay):

```text
Alt + O           show / hide overlay
Ctrl + Alt + O    move overlay widgets (placement mode)
Ctrl + Alt + C    cycle the active counter target civ
```

## Local Data

On Windows, RTSLytics reads files under:

```text
Documents\My Games\Age of Empires IV
```

Used files include logs, session data, match history, and replay headers. This data stays on your machine. RTSLytics makes network requests only to AoE4World, the Relic community API, and — if you connect Steam — Steam and its stat-summary blob host. See [Privacy & security](#privacy--security).

## Data Sources

- Relic community API for scouting, match data, signed replay URLs, and replay-summary availability.
- AoE4World API for search, ladder data, tier lists, matchups, and maps.
- Vendored AoE4World data and flags.
- Local AoE4 files for live detection and post-game stats.

Replay files downloaded from Relic are stored in the Electron user-data directory under `replay-cache`; datatype-1 post-game summaries are stored under `summaries`. History metadata can be loaded without Steam, but a replay or summary is cacheable only while Relic exposes the corresponding upload and Steam authentication can obtain its signed URL; old matches may therefore have complete history metadata without a downloadable replay or summary.

## Steam sign-in (optional)

Connecting Steam is optional and only used to download your own ranked post-game stat summaries (exact economy, age-up timings) from Relic. QR approval is the recommended method. If you use password sign-in, your password is sent only to Steam for that one login and is never stored; the saved session token is encrypted with your OS keychain.

## Privacy & security

RTSLytics is read-only and keeps your game data on your machine.

## Architecture

RTSLytics is an Electron app with three windows across two processes: a Node **main** process (`electron/`) that owns all IO and the API clients, a typed **preload** bridge (`electron/ipc/contract.ts`), and two React **renderers** — the dashboard (`src/renderer/main/`) and the transparent overlay (`src/renderer/overlay/`). The real logic lives in a pure, Vitest-tested domain layer (`src/domain/`); the renderer only talks to the main process through IPC. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full map.

## Contributing

Contributions are welcome — code, build orders, and guides. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first (especially the read-only rule), and run `npm run verify` before opening a PR.

## Docs

- [CONTRIBUTING.md](CONTRIBUTING.md) — build instructions, the architecture map, and how to contribute

## License

RTSLytics' own source code is licensed under the [MIT License](LICENSE). Bundled Age of Empires IV game data and civilization flag images are © Microsoft and used for non-commercial purposes under Microsoft's Game Content Usage Rules — they are not covered by MIT. See [NOTICE](NOTICE) for details.

## Legal

RTSLytics is not affiliated with Microsoft, Relic Entertainment, or World's Edge. Age of Empires IV and related assets belong to Microsoft and are used under Microsoft's Game Content Usage Rules.
