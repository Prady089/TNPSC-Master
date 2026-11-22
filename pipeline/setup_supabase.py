"""One-time Supabase setup through the Supabase Management API.

  1. Runs supabase/schema.sql on the project (safe to re-run).
  2. Fetches the project's anon + service_role keys and writes them into
     app/.env.local (only fills empty values; never prints the keys).
  3. Verifies the tables exist.

Needs in app/.env.local:
  VITE_SUPABASE_URL=https://<ref>.supabase.co
  SUPABASE_ACCESS_TOKEN=<personal access token from supabase.com/dashboard/account/tokens>

  python pipeline/setup_supabase.py
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from env import load_env  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / "app" / ".env.local"
API = "https://api.supabase.com/v1"


def call(method: str, path: str, token: str, body: dict | None = None):
    req = urllib.request.Request(
        API + path,
        data=json.dumps(body).encode() if body is not None else None,
        method=method,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json", "User-Agent": "tnpsc-setup/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            raw = r.read().decode()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path} -> HTTP {e.code}: {e.read().decode()[:400]}")


def set_env_value(key: str, value: str) -> bool:
    """Fill KEY= in app/.env.local if it's missing or empty. Returns True if written."""
    text = ENV_FILE.read_text(encoding="utf-8") if ENV_FILE.exists() else ""
    m = re.search(rf"^{re.escape(key)}=(.*)$", text, flags=re.M)
    if m and m.group(1).strip():
        return False
    if m:
        text = text[: m.start()] + f"{key}={value}" + text[m.end():]
    else:
        text = text.rstrip("\n") + f"\n{key}={value}\n"
    ENV_FILE.write_text(text, encoding="utf-8")
    return True


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    load_env()
    token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    url = os.environ.get("VITE_SUPABASE_URL", "")
    m = re.match(r"https://([a-z0-9]+)\.supabase\.co", url)
    if not token or not m:
        raise SystemExit("Set SUPABASE_ACCESS_TOKEN and VITE_SUPABASE_URL in app/.env.local first.")
    ref = m.group(1)

    print(f"Project {ref}: running schema.sql …")
    sql = (ROOT / "supabase" / "schema.sql").read_text(encoding="utf-8")
    call("POST", f"/projects/{ref}/database/query", token, {"query": sql})
    print("  schema applied")

    keys = call("GET", f"/projects/{ref}/api-keys?reveal=true", token) or []
    by_name = {k.get("name"): k.get("api_key") for k in keys}
    for env_key, name in (("VITE_SUPABASE_ANON_KEY", "anon"), ("SUPABASE_SERVICE_ROLE_KEY", "service_role")):
        if by_name.get(name):
            print(f"  {env_key}: {'written to app/.env.local' if set_env_value(env_key, by_name[name]) else 'already set, left as is'}")
        else:
            print(f"  {env_key}: not returned by the API; copy it from Project Settings -> API")

    rows = call("POST", f"/projects/{ref}/database/query", token, {
        "query": "select table_name from information_schema.tables where table_schema='public' order by 1"
    })
    print("  public tables:", ", ".join(r["table_name"] for r in rows or []))
    print("Done. Restart `npm run dev` so the app picks up the new keys.")


if __name__ == "__main__":
    main()
