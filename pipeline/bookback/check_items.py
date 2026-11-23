"""Validate pipeline/bookback/items/<chapter>.json files.  Usage: python pipeline/bookback/check_items.py c9-sci-02 [more ids]"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent
KINDS = {"mcq", "ar", "tf", "fill", "match", "short", "long", "hot", "num"}


def check(cid: str) -> list[str]:
    errs = []
    f = HERE / "items" / f"{cid}.json"
    if not f.exists():
        return [f"{cid}: file missing"]
    try:
        items = json.loads(f.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        return [f"{cid}: invalid JSON: {e}"]
    if not isinstance(items, list) or not items:
        return [f"{cid}: must be a non-empty list"]
    seen = set()
    for n, it in enumerate(items, 1):
        w = f"{cid} #{n}"
        k = it.get("k")
        if k not in KINDS:
            errs.append(f"{w}: bad kind {k!r}")
            continue
        if not str(it.get("q", "")).strip():
            errs.append(f"{w}: empty question")
        key = re.sub(r"\W+", " ", str(it.get("q", "")).lower()).strip()
        if key in seen:
            errs.append(f"{w}: duplicate question")
        seen.add(key)
        if it.get("src", "book") not in ("book", "extra"):
            errs.append(f"{w}: src must be book or extra")
        if k in ("mcq", "ar"):
            o = it.get("o")
            if not isinstance(o, list) or len(o) != 4 or not all(str(x).strip() for x in o):
                errs.append(f"{w}: needs exactly 4 non-empty options")
            elif not (isinstance(it.get("a"), int) and not isinstance(it.get("a"), bool) and 0 <= it["a"] < 4):
                errs.append(f"{w}: answer must be option index 0-3")
            elif len(set(o)) != 4:
                errs.append(f"{w}: duplicate options")
        elif k == "tf":
            if not isinstance(it.get("a"), bool):
                errs.append(f"{w}: tf answer must be true/false")
            elif it["a"] is False and not it.get("x"):
                errs.append(f"{w}: false statement needs the correct statement in x")
        elif k == "match":
            p = it.get("p")
            if not isinstance(p, list) or len(p) < 2 or not all(isinstance(x, list) and len(x) == 2 for x in p):
                errs.append(f"{w}: needs pairs [[left, right], ...]")
        elif not (isinstance(it.get("a"), str) and it["a"].strip()):
            errs.append(f"{w}: needs a text answer")
    book = sum(1 for i in items if i.get("src", "book") == "book")
    extra = len(items) - book
    has_pack = (HERE.parent / "out" / "packs" / f"{cid}.json").exists()
    if extra < 10 and not has_pack:
        errs.append(f"{cid}: only {extra} extra questions (want 15+)")
    if not errs:
        print(f"OK {cid}: {book} book back + {extra} extra")
    return errs


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    all_errs = [e for cid in sys.argv[1:] for e in check(cid)]
    for e in all_errs:
        print("ERROR", e)
    sys.exit(1 if all_errs else 0)
