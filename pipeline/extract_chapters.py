"""Step 1 - split SCERT PDFs into clean, readable chapters.

Reads the PDF bookmarks to find chapter page ranges, extracts text with
`pdftotext`, cleans it into headings + paragraphs, and writes:

  app/public/content/books.json           catalog the app loads
  app/public/content/chapters/<id>.json   one file per chapter (reader view)
  pipeline/out/text/<id>.txt              plain text, input for the AI step

Usage:  python pipeline/extract_chapters.py [--books c10-ss,c11-his]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import pypdf

sys.path.insert(0, str(Path(__file__).parent))
from catalog import BOOKS, SUBJECT_UNIT, UNITS  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "app" / "public" / "content"
TEXT_OUT = ROOT / "pipeline" / "out" / "text"
PDFTOTEXT = os.environ.get("PDFTOTEXT", "pdftotext")
# Hand-checked chapter titles (id -> title) for chapters whose first page can't be parsed.
TITLES_FILE = Path(__file__).parent / "titles.json"
TITLES: dict[str, str] = json.loads(TITLES_FILE.read_text(encoding="utf-8")) if TITLES_FILE.exists() else {}

# (?<![a-z]) instead of \b because bookmark names use underscores ("_Chap 1").
CHAPTER_RE = re.compile(
    r"(unit|(?<![a-z])uni(?![a-z])|lesson|chapter|(?<![a-z])chap|(?<![a-z])chp|(?<![a-z])cha[-_ ]|(?<![a-z])U\d"
    r"|(?<![a-z])CH\s*\d|^\s*\d{1,2}\s*[-_ ]\s*[A-Za-z])", re.I
)
SKIP_RE = re.compile(
    r"(content|index|front|glos|acknowledg|author|answer|practical|notes pages|timeline|"
    r"key terms|annexure|introduction|credits|mathematical terms|untitled)",
    re.I,
)
SUBJECT_KEYWORDS = [
    ("history", "history"),
    ("geograph", "geography"),
    ("civics", "civics"),
    ("economics", "economics"),
    ("maths", "maths"),
    ("science", "science"),
    ("sci_", "science"),
]
# Lines that are print artefacts, not content.
NOISE_RE = re.compile(
    r"(\.indd\s*\d*|^\s*\d{1,3}\s*$|^\s*[ivxlc]+\s*$|^\s*(science|history|geography|civics|economics|mathematics)\s*$|"
    r"\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}|www\.|^\s*\(?\d+\)?\s*\(?\s*$|"
    r"^\s*(\d{1,2}(th|st|nd|rd)\s+(standard|std)|(class|std)\s+([ivx]+|\d{1,2}))\s*$)",  # running headers
    re.I,
)
HEADING_RE = re.compile(r"^\s*(\d{1,2}(\.\d{1,2}){1,2})\s+([A-Z].{2,90})$")
TITLE_STOP_RE = re.compile(r"\s*(learning objectives|chapter outline|introduction|learning outcomes|objectives)", re.I)


def flatten_outline(reader: pypdf.PdfReader):
    """Return leaf bookmarks as (page_1_based, title), sorted by page."""
    out = []

    def walk(items):
        for i, item in enumerate(items):
            if isinstance(item, list):
                walk(item)
                continue
            has_children = i + 1 < len(items) and isinstance(items[i + 1], list)
            try:
                page = reader.get_destination_page_number(item) + 1
            except Exception:
                continue
            out.append((page, item.title.strip(), has_children))

    walk(reader.outline)
    out.sort(key=lambda x: x[0])
    return out


def detect_subject(title: str, default: str | None) -> str:
    if default:
        return default
    low = title.lower()
    for kw, subj in SUBJECT_KEYWORDS:
        if kw in low:
            return subj
    return "science"


def page_text(pdf: Path, first: int, last: int) -> list[str]:
    """Text of each page in [first, last], one string per page."""
    res = subprocess.run(
        [PDFTOTEXT, "-enc", "UTF-8", "-f", str(first), "-l", str(last), str(pdf), "-"],
        capture_output=True,
        check=True,
    )
    return res.stdout.decode("utf-8", errors="replace").split("\f")[: last - first + 1]


# Bullet glyphs from the textbook fonts: C1 control bytes (\x84 \x99 \x8b ...), doubled
# symbols ("¾¾", "●●", "■■") and arrow bullets. They become list items instead of boxes.
BULLET = "\u2022"
BULLET_RE = re.compile("\\s*(?:[\x80-\x9f]{1,2}|\u00be\u00be|[\u25cf\u25a0]{1,2}|[\u27a2\u25b6\u25ba\u2756\u2713\u2714\u2022])\\s*")
TAMIL_RE = re.compile("[\u0b80-\u0bff][\u0b80-\u0bff\\s,\\-\u2013.()]*")
# End-of-chapter material that pdftotext scrambles (two-column glossary, exercises, web links).
END_RE = re.compile(r"^(glossary|exercise\b(?!\s*\d)|evaluation\b|ict corner|references?\b|reference books|internet resources|web ?links)", re.I)
TIMESTAMP_RE = re.compile(r"\d{1,2}[/-]\d{1,2}[/-]\d{4}\s+\d{1,2}[:.]\d{2}([:.]\d{2})?\s*(AM|PM)?|\bLeanpub\b", re.I)


def clean_line(line: str) -> str:
    for ch in ("\u00ad", "\ufeff", "\u200b"):
        line = line.replace(ch, "")
    line = re.sub("[\u00a0\u2000-\u200a\u202f]", " ", line)  # nbsp, thin/en/em spaces
    line = re.sub(r"`\s?(?=\d)", "\u20b9", line)  # the Rupee font maps the rupee sign to a backtick
    line = TAMIL_RE.sub(" ", line)
    line = BULLET_RE.sub(f" {BULLET} ", line)
    line = line.replace("\ufffd", "-")
    line = re.sub("[\ue000-\uf8ff]", "", line)  # private-use glyphs (icons)
    line = re.sub("[\x00-\x08\x0b-\x1f\x7f]", "", line)  # control chars (e.g. BEL inside headings)
    line = TIMESTAMP_RE.sub("", line)
    line = re.sub(r"\s+", " ", line).strip()
    return line.lstrip(BULLET + " ") if line.strip(BULLET + " ") == "" else line


def guess_title(first_page: str) -> str:
    parts = []
    for raw in first_page.splitlines()[:12]:
        line = clean_line(raw).replace(BULLET, "").strip()
        if not line:
            continue
        if TITLE_STOP_RE.match(line):
            break
        if re.fullmatch(r"(unit|lesson|chapter)?\s*-?\s*\d{0,2}", line, re.I) or len(line) > 90:
            continue
        line = re.sub(r"^(\d+\s*)?((unit|lesson|chapter)\s*-?\s*[\dIVX]*\s*)?", "", line, flags=re.I).strip()
        chars = line.replace(" ", "")
        letters = sum(c.isalpha() for c in chars)
        # skip formula / figure-label lines like "x1 = x2 y1 y2" or "Y 28 26 24"
        if not chars or letters / len(chars) < 0.85 or "=" in line or re.search(r"\b\w\b.*\b\w\b.*\b\w\b", line):
            continue
        if line:
            parts.append(line)
        if len(" ".join(parts)) > 70:
            break
    title = " ".join(parts).strip(" -:")
    return title.title() if title.isupper() else title


def to_blocks(pages: list[str], start_page: int, title: str = "", cut_end_matter: bool = True) -> list[dict]:
    """Turn raw page text into heading/paragraph/list blocks, tagged with source page."""
    blocks: list[dict] = []
    para: list[str] = []
    para_page = start_page
    kind = "p"
    title_key = re.sub(r"\W", "", title.lower())
    end_from = start_page + len(pages) // 2  # only cut end matter in the second half

    def flush():
        nonlocal para, kind
        text = " ".join(para).strip()
        text = re.sub(r"(\w)- (\w)", r"\1\2", text)  # re-join hyphenated words
        if text:
            blocks.append({"t": kind, "text": text, "page": para_page})
        para, kind = [], "p"

    for offset, page in enumerate(pages):
        pno = start_page + offset
        for raw in page.splitlines():
            line = clean_line(raw)
            if not line or NOISE_RE.search(line):
                if not line:
                    flush()
                continue
            if offset and title_key and re.sub(r"\W", "", line.lower()) == title_key:
                continue  # running header repeating the chapter title
            if cut_end_matter and pno >= end_from and END_RE.match(line):
                flush()
                return finish(blocks)
            m = HEADING_RE.match(line)
            if m:
                flush()
                # "1.2.1 Types of Inertia a) Inertia of rest: The" -> heading + start of the next paragraph
                parts = re.split(r"\s(?=(?:[a-h]|i{1,3}|\d)\)\s)", m.group(3), maxsplit=1)
                head, rest = parts[0], (parts[1] if len(parts) > 1 else "")
                blocks.append({"t": "h", "text": f"{m.group(1)} {head}", "page": pno})
                if rest:
                    para, para_page = [rest], pno
                continue
            pieces = [x.strip() for x in line.split(BULLET)]
            for j, piece in enumerate(pieces):
                if j > 0:
                    flush()
                    kind, para_page = "li", pno
                if not piece:
                    continue
                if not para:
                    para_page = pno
                para.append(piece)
            if kind == "p" and re.search(r"[.?!:]\s*$", line) and len(line) < 60:
                flush()
        flush()
    return finish(blocks)


INLINE_BULLET_RE = re.compile(r"(?:^|(?<=[.:;?!]))\s*-\s+(?=[A-Z])")


def split_inline_bullets(blocks: list[dict]) -> list[dict]:
    """Some books print bullets as ' - ' inside a paragraph ("...able to: - Understand x. - Explain y.")."""
    out: list[dict] = []
    for b in blocks:
        if b["t"] != "p" or len(INLINE_BULLET_RE.findall(b["text"])) < 2:
            out.append(b)
            continue
        parts = [x.strip() for x in INLINE_BULLET_RE.split(b["text"])]
        if parts[0]:
            out.append({**b, "text": parts[0]})
        out.extend({**b, "t": "li", "text": x} for x in parts[1:] if x)
    return out


def finish(blocks: list[dict]) -> list[dict]:
    merged = split_inline_bullets(merge_broken_paragraphs(blocks))
    for b in merged:  # drop capitals split from their word: "1.2 G ross", "L ight is"
        b["text"] = re.sub(r"(^|^[\d.]+ |[.!?:] )([B-HJ-Z]) ([a-z]{2,})", r"\1\2\3", b["text"])
    return [b for b in merged if b["t"] == "h" or len(b["text"]) > (3 if b["t"] == "li" else 25)]


def merge_broken_paragraphs(blocks: list[dict]) -> list[dict]:
    """PDF column/page breaks split sentences into separate paragraphs; re-join them."""
    out: list[dict] = []
    for b in blocks:
        prev = out[-1] if out else None
        if (
            prev and prev["t"] in ("p", "li") and b["t"] == "p"
            and (re.match(r"^[a-z(,;]", b["text"]) or (prev["t"] == "p" and not re.search(r"[.?!:;\"”')\]]\s*$", prev["text"])))
        ):
            prev["text"] = f"{prev['text']} {b['text']}"
        else:
            out.append(dict(b))
    return out


def process_book(book: dict) -> dict | None:
    pdf = ROOT / book["file"]
    if not pdf.exists():
        print(f"  missing file: {pdf.name}")
        return None
    reader = pypdf.PdfReader(str(pdf))
    n_pages = len(reader.pages)
    marks = flatten_outline(reader)
    boundaries = sorted({p for p, _, _ in marks} | {n_pages + 1})

    chapters = []
    for page, title, has_children in marks:
        if has_children or not CHAPTER_RE.search(title) or SKIP_RE.search(title):
            continue
        end = next((b for b in boundaries if b > page), n_pages + 1) - 1
        pages = page_text(pdf, page, end)
        subject = detect_subject(title, book["subject"])
        order = len(chapters) + 1
        ch_id = f"{book['id']}-{order:02d}"
        ch_title = TITLES.get(ch_id) or guess_title(pages[0]) or title
        blocks = to_blocks(pages, page, ch_title, cut_end_matter=subject != "maths")
        words = sum(len(b["text"].split()) for b in blocks)
        if words < 150:  # empty or image-only chapter
            continue
        chapter = {
            "id": ch_id,
            "bookId": book["id"],
            "order": order,
            "title": ch_title,
            "subject": subject,
            "units": [SUBJECT_UNIT[subject]],
            "pages": [page, end],
            "words": words,
        }
        path = CONTENT / "chapters" / f"{ch_id}.json"
        # keep the AI study pack (summary, highlights) from an earlier run
        old = json.loads(path.read_text(encoding="utf-8") or "{}") if path.exists() else {}
        pack = {k: old[k] for k in ("units", "relevant", "summary", "keyFacts", "highlights", "enriched") if k in old and old.get("enriched")}
        chapter.update({k: v for k, v in pack.items() if k in ("units", "relevant", "enriched")})
        if pack.get("highlights"):  # blocks may have moved: re-point each highlight at its passage
            norm = [re.sub(r"[^a-z0-9]+", " ", b["text"].lower()) for b in blocks]
            for h in pack["highlights"]:
                q = re.sub(r"[^a-z0-9]+", " ", h["quote"].lower()).strip()
                h["block"] = next((i for i, t in enumerate(norm) if q and q in t), -1)
        path.write_text(json.dumps({**chapter, **pack, "blocks": blocks}, ensure_ascii=False), encoding="utf-8")
        plain = "\n\n".join({"h": "## ", "li": "- "}.get(b["t"], "") + b["text"] + f"  [p{b['page']}]" for b in blocks)
        (TEXT_OUT / f"{ch_id}.txt").write_text(plain, encoding="utf-8")
        chapters.append(chapter)
        print(f"  {ch_id:14} p{page}-{end:<4} {words:6} words  {subject:17} {ch_title[:60]}")

    return {**{k: book[k] for k in ("id", "std", "title")}, "source": "TN SCERT", "chapters": chapters}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--books", help="comma-separated book ids (default: all)")
    args = ap.parse_args()
    wanted = set(args.books.split(",")) if args.books else None

    (CONTENT / "chapters").mkdir(parents=True, exist_ok=True)
    TEXT_OUT.mkdir(parents=True, exist_ok=True)

    catalog_path = CONTENT / "books.json"
    existing = json.loads(catalog_path.read_text(encoding="utf-8")) if catalog_path.exists() else {"books": []}
    by_id = {b["id"]: b for b in existing.get("books", [])}

    for book in BOOKS:
        if wanted and book["id"] not in wanted:
            continue
        print(f"== {book['id']}  {book['file']}")
        result = process_book(book)
        if result:
            by_id[book["id"]] = result

    order = [b["id"] for b in BOOKS]
    books = sorted(by_id.values(), key=lambda b: order.index(b["id"]) if b["id"] in order else 999)
    catalog_path.write_text(
        json.dumps({"units": UNITS, "books": books}, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    total = sum(len(b["chapters"]) for b in books)
    print(f"\nWrote {len(books)} books, {total} chapters -> {catalog_path}")


if __name__ == "__main__":
    main()
