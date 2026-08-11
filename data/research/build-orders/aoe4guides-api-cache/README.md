# AoE4Guides API cache

This directory contains the raw JSON responses captured from the public
`https://aoe4guides.com/api/builds` endpoint.

The provider currently returns at most 10 records per request and exposes no
pagination. The cache therefore covers every configured civilization and every
reachable discovery slice (`default`, `score`, `timeCreated`, `views`, and
`likes`), but it is **not** a claim that the complete AoE4Guides collection was
downloaded.

- `_manifest.json` records the request matrix, timestamps, counts, failures,
  and the explicit API limitation.
- `<civ>--<slice>.json` files are the unmodified array responses.
- Normalized builds are imported into `src/data/buildOrders/imported/` and
  bundled through `src/data/buildOrderArchive.json`.

Refresh the local snapshots with:

```powershell
python scripts/sync_aoe4guides.py --refresh-cache
python scripts/create_build_archive.py
```

Validate or re-import strictly from disk without contacting the provider:

```powershell
python scripts/sync_aoe4guides.py --offline --dry-run
```
