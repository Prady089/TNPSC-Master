"""Load KEY=VALUE pairs from app/.env.local (and a root .env) into os.environ,
so pipeline scripts pick up OPENAI_API_KEY / SUPABASE_* without exporting them.
Existing environment variables win."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load_env() -> None:
    for path in (ROOT / "app" / ".env.local", ROOT / ".env"):
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            value = value.strip().strip('"').strip("'")
            if value and key.strip() not in os.environ:
                os.environ[key.strip()] = value
    # the app's public URL doubles as the server URL
    if "SUPABASE_URL" not in os.environ and os.environ.get("VITE_SUPABASE_URL"):
        os.environ["SUPABASE_URL"] = os.environ["VITE_SUPABASE_URL"]
