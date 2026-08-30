#!/usr/bin/env python3
"""Resume AoE4 caption downloads + lesson distill for Valdemar / Beastyqt.

The 3-year metadata catalogs are already on disk (reuse --reuse-raw). This
script continues auto-sub download for remaining AoE4-relevant guides/builds/
match analysis, skips members-only and previously failed ids, then regenerates
creatorVideoLessons.generated.ts from on-disk transcripts only.

Examples:
  python scripts/resume_creator_transcripts.py
  python scripts/resume_creator_transcripts.py --subs-limit 25 --creator valdemar
  python scripts/resume_creator_transcripts.py --distill-only
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(args: list[str]) -> int:
    print('+', ' '.join(args), flush=True)
    completed = subprocess.run(args, cwd=ROOT)
    return completed.returncode


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--subs-limit', type=int, default=25)
    parser.add_argument('--subs-sleep', type=float, default=2.0)
    parser.add_argument('--creator', choices=('valdemar', 'beastyqt', 'both'), default='both')
    parser.add_argument('--distill-only', action='store_true')
    args = parser.parse_args()

    if not args.distill_only:
        code = run([
            sys.executable,
            str(ROOT / 'scripts' / 'harvest_channel_catalogs.py'),
            '--reuse-raw',
            '--fetch-subs',
            '--subs-limit',
            str(args.subs_limit),
            '--subs-sleep',
            str(args.subs_sleep),
            '--creator',
            args.creator,
        ])
        if code != 0:
            return code

    return run([sys.executable, str(ROOT / 'scripts' / 'distill_creator_videos.py')])


if __name__ == '__main__':
    raise SystemExit(main())
