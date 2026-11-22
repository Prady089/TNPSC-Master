"""Step 3 - upload draft questions to Supabase (status = 'draft').

Admins then approve / edit / reject them in the app's Review screen.
Re-running is safe: question ids are deterministic, existing rows are not
overwritten (so approvals and edits are kept).

Needs env (read from app/.env.local): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (service key: keep it secret,
never put it in the app's VITE_* variables).

  python pipeline/upload_questions.py [--books c12-pol,c11-pol] [--approve]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from env import load_env  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
Q_DIR = ROOT / "pipeline" / "out" / "questions"


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    load_env()
    ap = argparse.ArgumentParser()
    ap.add_argument("--books")
    ap.add_argument("--approve", action="store_true", help="upload as approved (live for students) instead of draft")
    args = ap.parse_args()
    url = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1/questions?on_conflict=id"
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    prefixes = tuple(b + "-" for b in args.books.split(",")) if args.books else None

    files = sorted(Q_DIR.glob("*.json"))
    total = 0
    for f in files:
        if prefixes and not f.stem.startswith(prefixes):
            continue
        rows = json.loads(f.read_text(encoding="utf-8"))
        if not rows:
            continue
        if args.approve:
            rows = [{**r, "status": "approved"} for r in rows]
        req = urllib.request.Request(
            url,
            data=json.dumps(rows).encode(),
            method="POST",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Prefer": "resolution=ignore-duplicates,return=minimal",
            },
        )
        with urllib.request.urlopen(req) as resp:
            if resp.status >= 300:
                raise SystemExit(f"{f.name}: HTTP {resp.status}")
        total += len(rows)
        print(f"  {f.stem}: {len(rows)}")
    print(f"Uploaded {total} {'approved' if args.approve else 'draft'} questions.")


if __name__ == "__main__":
    main()
