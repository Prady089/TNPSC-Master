"""Pull the end-of-chapter exercises ("book back" questions) out of the textbook PDFs.

The reading text in app/public/content/chapters/*.json deliberately drops the
exercises, so this goes back to the PDF: for every chapter of a syllabus unit it
finds the line where the exercises start (EVALUATION / EXERCISE / Choose the
correct answer ...) and writes the raw text up to the next end-matter heading.

Output: pipeline/bookback/raw/<chapter>.txt   (input for writing the question bank)

Usage:  python pipeline/bookback/extract_exercises.py [--unit I]
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))
from catalog import BOOKS  # noqa: E402

CONTENT = ROOT / "app" / "public" / "content"
OUT = Path(__file__).parent / "raw"

START_RE = re.compile(
    r"^\s*(?:textbook\s+)?(?:evaluation|exercises?|assessment|questions)\s*$"
    r"|^\s*(?:textbook\s+)?evaluation\b"
    r"|^\s*(?:I\.?|A\.?|1\.)?\s*choose the (?:correct|best|right|appropriate)",
    re.I,
)
STOP_RE = re.compile(r"^\s*(ict corner|reference books?|references?|internet resources|web ?links|glossary|concept map)\b", re.I)


def pdf_text(pdf: Path, first: int, last: int) -> str:
    # Some PDFs contain stray form feeds, so the text is handled as one stream, not split by page.
    res = subprocess.run(["pdftotext", "-enc", "UTF-8", "-f", str(first), "-l", str(last), str(pdf), "-"],
                         capture_output=True, check=True)
    return res.stdout.decode("utf-8", errors="replace").replace("\r", "").replace("\f", "\n")


def find_file(name: str) -> Path:
    for p in (ROOT / name, ROOT / "books" / name):
        if p.exists():
            return p
    raise FileNotFoundError(name)


def extract(chapter_id: str) -> str | None:
    ch = json.loads((CONTENT / "chapters" / f"{chapter_id}.json").read_text(encoding="utf-8"))
    book = next(b for b in BOOKS if b["id"] == ch["bookId"])
    first, last = ch["pages"]
    lines = pdf_text(find_file(book["file"]), first, last).splitlines()
    skip = len(lines) // 3  # exercises sit at the end of the chapter
    start = next((i for i, l in enumerate(lines) if i >= skip and START_RE.match(l)), None)
    if start is None:
        return None
    out, size = [], 0
    for line in lines[start:]:
        if size > 600 and STOP_RE.match(line):
            break
        out.append(line)
        size += len(line)
    body = re.sub(r"www\.tntextbooks\.in", "", "\n".join(out), flags=re.I)
    body = re.sub(r"\n{3,}", "\n\n", body)
    return f"# {chapter_id} | Class {book['std']} {book['title']} | {ch['title']}\n\n{body}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--unit", default="I")
    args = ap.parse_args()
    syl = json.loads((CONTENT / "syllabus.json").read_text(encoding="utf-8"))
    unit = next(u for u in syl["units"] if u["code"] == args.unit)
    ids = sorted({c for s in unit["sections"] for t in s["topics"] for c in t["chapters"]})
    OUT.mkdir(parents=True, exist_ok=True)
    missing = []
    for cid in ids:
        r = extract(cid)
        if not r:
            missing.append(cid)
            continue
        (OUT / f"{cid}.txt").write_text(r, encoding="utf-8")
    print(f"{len(ids) - len(missing)}/{len(ids)} chapters with exercises; missing: {missing}")


if __name__ == "__main__":
    main()
