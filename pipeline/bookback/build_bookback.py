"""Build the "Book back questions" bank the app reads.

Inputs
  pipeline/bookback/items/<chapter>.json   textbook exercises with answers (hand-written, see README below)
  pipeline/out/packs/<chapter>.json        extra MCQs already written for the chapter (added as "More questions")
  pipeline/bookback/pyq_tags.json          {item_id: [{"paper": "G4_2022", "qno": 57}]}  previous-year matches

Outputs
  app/public/content/bookback/index.json        per-unit chapter list with counts
  app/public/content/bookback/<chapter>.json    the questions of one chapter

Item format (items/<chapter>.json is a list):
  k  kind: mcq | ar | tf | fill | match | short | long | hot | num
  q  question text ("\n" allowed)
  o  options (mcq, ar)          a  answer: option index (mcq, ar), true/false (tf), text (others)
  p  pairs [[left, right], ...] in the correct order (match)
  x  explanation / correct statement (optional)
  src "book" (default, textbook exercise) or "extra" (additional question written from the chapter)

Usage: python pipeline/bookback/build_bookback.py [--unit I]
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).parent
CONTENT = ROOT / "app" / "public" / "content"
OUT = CONTENT / "bookback"
PACKS = ROOT / "pipeline" / "out" / "packs"

KINDS = {"mcq", "ar", "tf", "fill", "match", "short", "long", "hot", "num"}
PAPERS = {  # paper id -> label shown on the tag
    "G1_2019": ("Group I", 2019), "G1_2021": ("Group I", 2021), "G1_2022": ("Group I", 2022),
    "G1_2024": ("Group I", 2024), "G1_2025": ("Group I", 2025),
    "G2_2022": ("Group II", 2022), "G2_2024": ("Group II", 2024), "G2_2025": ("Group II", 2025),
    "G3A_2023": ("Group III-A", 2023),
    "G4_2019_GS": ("Group IV", 2019), "G4_2022": ("Group IV", 2022), "G4_2024": ("Group IV", 2024), "G4_2025": ("Group IV", 2025),
}


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def item_id(chapter: str, item: dict) -> str:
    key = item["q"] + "|" + "|".join(item.get("o", []))
    return f"{chapter}-{hashlib.sha1(key.encode('utf-8')).hexdigest()[:7]}"


def validate(chapter: str, it: dict, n: int):
    where = f"{chapter} item {n}"
    assert it.get("k") in KINDS, f"{where}: bad kind {it.get('k')}"
    assert it.get("q"), f"{where}: no question"
    k = it["k"]
    if k in ("mcq", "ar"):
        assert len(it.get("o", [])) >= 2, f"{where}: needs options"
        assert isinstance(it.get("a"), int) and 0 <= it["a"] < len(it["o"]), f"{where}: bad answer index"
    elif k == "tf":
        assert isinstance(it.get("a"), bool), f"{where}: tf answer must be true/false"
    elif k == "match":
        assert len(it.get("p", [])) >= 2, f"{where}: needs pairs"
    else:
        assert isinstance(it.get("a"), str) and it["a"].strip(), f"{where}: needs an answer"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--unit", default="I")
    args = ap.parse_args()

    syl = json.loads((CONTENT / "syllabus.json").read_text(encoding="utf-8"))
    books = {b["id"]: b for b in json.loads((CONTENT / "books.json").read_text(encoding="utf-8"))["books"]}
    chapters = {c["id"]: (b, c) for b in books.values() for c in b["chapters"]}
    tags = {}
    tag_file = HERE / "pyq_tags.json"
    if tag_file.exists():
        tags = json.loads(tag_file.read_text(encoding="utf-8"))

    OUT.mkdir(parents=True, exist_ok=True)
    index_path = OUT / "index.json"
    index = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else {"units": {}}
    unit = next(u for u in syl["units"] if u["code"] == args.unit)
    ids = sorted({c for s in unit["sections"] for t in s["topics"] for c in t["chapters"]})

    counts = {}
    for cid in ids:
        src = HERE / "items" / f"{cid}.json"
        if not src.exists():
            continue
        book_items = json.loads(src.read_text(encoding="utf-8"))
        items = []
        for n, it in enumerate(book_items, 1):
            validate(cid, it, n)
            items.append({**it, "src": it.get("src", "book")})
        seen = {norm(it["q"]) for it in items}
        pack = PACKS / f"{cid}.json"
        if pack.exists():
            for q in json.loads(pack.read_text(encoding="utf-8")).get("questions", []):
                if norm(q["question"]) in seen:
                    continue
                seen.add(norm(q["question"]))
                extra = {"k": "mcq", "q": q["question"], "o": q["options"], "a": q["answer_index"], "src": "extra"}
                if q.get("explanation"):
                    extra["x"] = q["explanation"]
                items.append(extra)
        for it in items:
            it["id"] = item_id(cid, it)
            t = tags.get(it["id"])
            if t:
                it["pyq"] = [{"paper": x["paper"], "exam": PAPERS[x["paper"]][0], "year": PAPERS[x["paper"]][1], "qno": x.get("qno")} for x in t]
        ids_seen = [it["id"] for it in items]
        assert len(ids_seen) == len(set(ids_seen)), f"{cid}: duplicate questions"
        b, c = chapters[cid]
        (OUT / f"{cid}.json").write_text(json.dumps({"chapter": cid, "title": c["title"], "std": b["std"], "book": b["title"], "items": items},
                                                    ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        counts[cid] = {
            "n": len(items),
            "book": sum(1 for i in items if i["src"] == "book"),
            "objective": sum(1 for i in items if i["k"] in ("mcq", "ar", "tf")),
            "pyq": sum(1 for i in items if i.get("pyq")),
        }

    index["units"][args.unit] = {"title": unit["title"], "chapters": counts}
    index_path.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    total = sum(c["n"] for c in counts.values())
    print(f"Unit {args.unit}: {len(counts)}/{len(ids)} chapters ready, {total} questions "
          f"({sum(c['book'] for c in counts.values())} book back, {sum(c['pyq'] for c in counts.values())} asked before)")


if __name__ == "__main__":
    main()
