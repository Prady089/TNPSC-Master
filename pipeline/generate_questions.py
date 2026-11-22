"""Step 2 - AI enrichment: revision notes + draft MCQs for every chapter.

Uses the OpenAI Batch API (50% cheaper than live calls, results within 24h,
usually much sooner) with Structured Outputs so every reply is valid JSON.

  python pipeline/generate_questions.py estimate [--books ...] [--limit N]
  python pipeline/generate_questions.py submit   [--books ...] [--limit N]
  python pipeline/generate_questions.py status
  python pipeline/generate_questions.py collect
  python pipeline/generate_questions.py run      --books c10-ss   (live calls, done in minutes, full price)

`collect` writes:
  pipeline/out/questions/<chapter>.json   draft questions (upload with upload_questions.py)
  app/public/content/chapters/<id>.json   + summary / keyFacts / cleaned title
  app/public/content/books.json           + cleaned titles, unit mapping, relevance

Every generated question is a DRAFT. Nothing reaches students until an admin
approves it in the app's Review screen.

Env (read from app/.env.local automatically):
  OPENAI_API_KEY   required
  OPENAI_MODEL     optional, default gpt-5.5
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from openai import OpenAI

sys.path.insert(0, str(Path(__file__).parent))
from catalog import UNITS  # noqa: E402
from env import load_env  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "app" / "public" / "content"
OUT = ROOT / "pipeline" / "out"
TEXT_DIR = OUT / "text"
Q_DIR = OUT / "questions"
BATCH_LOG = OUT / "batches.json"

WORDS_PER_QUESTION = 150  # ~1 question per 150 words, so long chapters get more


def question_count(words: int) -> int:
    return max(15, min(40, round(words / WORDS_PER_QUESTION)))

# Namespace for deterministic question ids, so re-uploads update instead of duplicating.
QID_NS = uuid.UUID("6f1c2a52-6f5e-4c1b-9a43-2b7d1f0e8a11")

UNIT_LIST = "\n".join(f"- {u['code']}: {u['title']}" for u in UNITS)

SYSTEM = f"""You are a senior question setter for the TNPSC Group 1 (Tamil Nadu Public Service Commission) Preliminary Examination.
You read one chapter of a Tamil Nadu SCERT school textbook and produce study material and exam-style multiple choice questions from it.

Prelims syllabus units:
{UNIT_LIST}

Rules:
- Use ONLY facts stated in the chapter text. Never invent dates, names or numbers. If the text is ambiguous, skip that fact.
- Questions must be at the level of TNPSC Group 1 Prelims (degree standard): test understanding and precise facts, not trivia about textbook activities, pictures or exercises.
- Mix question styles the way TNPSC does: direct factual, "Which of the following is correct/incorrect", match-the-following written inline (e.g. "Match: A. x  B. y ... with 1. p  2. q ..."), assertion-reason, and chronological ordering.
- Exactly 4 options per question, exactly one correct. Distractors must be plausible and from the same category.
- Vary the position of the correct answer across questions.
- The explanation (1-3 sentences) must say why the answer is right, citing the chapter.
- `page` is the source page number shown in the text as [pN] closest to the fact.
- difficulty: 1 = easy recall, 2 = moderate, 3 = hard (fine distinctions, multi-statement).
- `units`: the 1-2 syllabus unit codes this chapter serves best. Tamil Nadu history/culture/social movements -> GS6; Tamil Nadu economy, welfare schemes, administration -> GS5.
- `relevant`: false if the chapter has little value for TNPSC Group 1 (e.g. computer software tutorials, lab practicals). For irrelevant chapters return an empty questions list.
- COVERAGE: the questions must cover the WHOLE chapter from start to end. Walk through the chapter section by section,
  in order, and give every section with real content at least one question; spread the rest by importance. Do not
  bunch questions on the first pages.
- `title`: the chapter's real title in clean Title Case, without unit numbers or stray caption text.
- `summary`: a 150-250 word revision summary in plain English, covering the chapter's main ideas in order.
- `highlights`: 12-25 points a student would underline while studying: dates and years, people, places, firsts,
  definitions, numbers, acts/treaties/schemes, causes and results. Each has:
  - `text`: the point as one short line (max ~25 words), written to be memorised.
  - `kind`: date | person | place | term | number | event | fact.
  - `quote`: the exact words from the chapter text that this point comes from, copied character for character
    (5-25 words, from a single sentence, without the [pN] page markers). It is used to underline the passage.
  Order highlights as they appear in the chapter.
"""

# OpenAI strict structured outputs: every property listed in `required`,
# additionalProperties false on every object.
SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "relevant": {"type": "boolean"},
        "units": {"type": "array", "items": {"type": "string", "enum": [u["code"] for u in UNITS]}},
        "summary": {"type": "string"},
        "highlights": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "kind": {"type": "string", "enum": ["date", "person", "place", "term", "number", "event", "fact"]},
                    "quote": {"type": "string"},
                },
                "required": ["text", "kind", "quote"],
                "additionalProperties": False,
            },
        },
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "question": {"type": "string"},
                    "options": {"type": "array", "items": {"type": "string"}},
                    "answer_index": {"type": "integer", "enum": [0, 1, 2, 3]},
                    "explanation": {"type": "string"},
                    "page": {"type": "integer"},
                    "difficulty": {"type": "integer", "enum": [1, 2, 3]},
                },
                "required": ["question", "options", "answer_index", "explanation", "page", "difficulty"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["title", "relevant", "units", "summary", "highlights", "questions"],
    "additionalProperties": False,
}


def model() -> str:
    return os.environ.get("OPENAI_MODEL", "gpt-5.5")


def load_catalog() -> dict:
    return json.loads((CONTENT / "books.json").read_text(encoding="utf-8"))


def select_chapters(books_arg: str | None, limit: int | None, skip_done: bool = True) -> list[dict]:
    wanted = set(books_arg.split(",")) if books_arg else None
    pending = pending_chapter_ids()
    chapters = []
    for book in load_catalog()["books"]:
        if wanted and book["id"] not in wanted:
            continue
        for ch in book["chapters"]:
            if skip_done and ((Q_DIR / f"{ch['id']}.json").exists() or ch["id"] in pending):
                continue
            chapters.append(ch)
    return chapters[:limit] if limit else chapters


def read_log() -> list[dict]:
    return json.loads(BATCH_LOG.read_text()) if BATCH_LOG.exists() else []


def pending_chapter_ids() -> set[str]:
    """Chapters already in a submitted-but-not-collected batch (avoid paying twice)."""
    return {c for e in read_log() if not e["collected"] for c in e["chapters"]}


def request_body(ch: dict) -> dict:
    text = (TEXT_DIR / f"{ch['id']}.txt").read_text(encoding="utf-8")
    user = (
        f"Chapter id: {ch['id']} (Class {ch['bookId'].split('-')[0][1:]}, subject: {ch['subject']}, "
        f"title: {ch['title']})\n\n<chapter>\n{text}\n</chapter>\n\n"
        f"Produce the study material and {question_count(ch['words'])} questions covering the whole chapter."
    )
    return {
            "model": model(),
            "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}],
            "reasoning_effort": "medium",
            "max_completion_tokens": 32000,
            "response_format": {"type": "json_schema", "json_schema": {"name": "chapter_pack", "strict": True, "schema": SCHEMA}},
    }


def build_line(ch: dict) -> dict:
    return {"custom_id": ch["id"], "method": "POST", "url": "/v1/chat/completions", "body": request_body(ch)}


def cmd_estimate(args):
    chapters = select_chapters(args.books, args.limit)
    words = sum(ch["words"] for ch in chapters)
    in_tok = int(words * 1.4) + 900 * len(chapters)
    out_tok = sum(4000 + 450 * question_count(ch["words"]) for ch in chapters)  # JSON + reasoning, rough  # JSON answer + reasoning tokens, rough upper estimate
    print(f"{len(chapters)} chapters, ~{words:,} words, model {model()}")
    print(f"~{in_tok/1e6:.1f}M input + ~{out_tok/1e6:.1f}M output tokens (Batch API = half the normal per-token price).")
    print("Multiply by your model's current prices at https://openai.com/api/pricing to get the cost.")


def cmd_submit(args):
    chapters = select_chapters(args.books, args.limit)
    if not chapters:
        print("Nothing to do: every selected chapter already has questions or is in a pending batch.")
        return
    client = OpenAI()
    jsonl = "\n".join(json.dumps(build_line(ch), ensure_ascii=False) for ch in chapters).encode("utf-8")
    upload = client.files.create(file=("chapters.jsonl", io.BytesIO(jsonl)), purpose="batch")
    batch = client.batches.create(input_file_id=upload.id, endpoint="/v1/chat/completions", completion_window="24h")
    log = read_log()
    log.append({"id": batch.id, "chapters": [c["id"] for c in chapters], "collected": False})
    BATCH_LOG.write_text(json.dumps(log, indent=1))
    print(f"Submitted batch {batch.id} with {len(chapters)} chapters ({model()}). Run `status`, then `collect`.")


def cmd_status(_args):
    client = OpenAI()
    for entry in read_log():
        b = client.batches.retrieve(entry["id"])
        rc = b.request_counts
        counts = f"done={rc.completed} failed={rc.failed} total={rc.total}" if rc else ""
        print(f"{b.id}  {b.status:12} {counts} collected={entry['collected']}")


def apply_enrichment(ch_id: str, data: dict, catalog: dict):
    for book in catalog["books"]:
        for ch in book["chapters"]:
            if ch["id"] == ch_id:
                ch.update(units=data["units"] or ch["units"], relevant=data["relevant"], enriched=True)
    path = CONTENT / "chapters" / f"{ch_id}.json"
    chapter = json.loads(path.read_text(encoding="utf-8"))
    # Titles are hand-checked (pipeline/titles.json), so the AI title is not used.
    chapter.update(units=data["units"] or chapter["units"], relevant=data["relevant"], summary=data["summary"],
                   highlights=locate_highlights(chapter["blocks"], data["highlights"]),
                   keyFacts=[h["text"] for h in data["highlights"]], enriched=True)
    path.write_text(json.dumps(chapter, ensure_ascii=False), encoding="utf-8")


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def locate_highlights(blocks: list[dict], highlights: list[dict]) -> list[dict]:
    """Attach the block index of each quote so the reader can underline it. Quotes not found verbatim
    are kept as highlights but without an underline (`block` = -1)."""
    norm_blocks = [_norm(b["text"]) for b in blocks]
    out = []
    for h in highlights:
        q = _norm(h["quote"])
        idx = next((i for i, t in enumerate(norm_blocks) if q and q in t), -1)
        out.append({"text": h["text"], "kind": h["kind"], "quote": h["quote"].strip(), "block": idx})
    return out


def save_pack(ch_id: str, data: dict, catalog: dict):
    (Q_DIR / f"{ch_id}.json").write_text(json.dumps(to_rows(ch_id, data), ensure_ascii=False, indent=1), encoding="utf-8")
    apply_enrichment(ch_id, data, catalog)


def cmd_run(args):
    """Live (non-batch) calls, a few chapters at a time. Good for doing one book and checking it."""
    chapters = select_chapters(args.books, args.limit)
    if not chapters:
        print("Nothing to do: every selected chapter already has a study pack.")
        return
    client = OpenAI()
    catalog = load_catalog()
    Q_DIR.mkdir(parents=True, exist_ok=True)

    def one(ch):
        resp = client.chat.completions.create(**request_body(ch))
        choice = resp.choices[0]
        if choice.message.refusal or choice.finish_reason != "stop":
            raise RuntimeError(f"{ch['id']}: {choice.message.refusal or choice.finish_reason}")
        return ch, json.loads(choice.message.content), resp.usage

    tok_in = tok_out = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(one, ch) for ch in chapters]
        for fut in as_completed(futures):
            try:
                ch, data, usage = fut.result()
            except Exception as e:  # noqa: BLE001
                print(f"  failed: {e}", flush=True)
                continue
            save_pack(ch["id"], data, catalog)
            (CONTENT / "books.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=1), encoding="utf-8")
            tok_in += usage.prompt_tokens
            tok_out += usage.completion_tokens
            saved = json.loads((CONTENT / "chapters" / f"{ch['id']}.json").read_text(encoding="utf-8"))
            found = sum(1 for h in saved["highlights"] if h["block"] >= 0)
            print(f"  {ch['id']:14} {len(data['questions']):3} questions, {len(data['highlights']):2} highlights "
                  f"({found} underlined)  {ch['title'][:50]}", flush=True)
    print(f"Tokens used: {tok_in:,} in, {tok_out:,} out")


PACK_DIR = OUT / "packs"


def cmd_import(args):
    """Load hand-written packs (pipeline/out/packs/<chapter id>.json, same shape as SCHEMA)."""
    catalog = load_catalog()
    Q_DIR.mkdir(parents=True, exist_ok=True)
    wanted = set(args.books.split(",")) if args.books else None
    for path in sorted(PACK_DIR.glob("*.json")):
        ch_id = path.stem
        if wanted and ch_id.rsplit("-", 1)[0] not in wanted:
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        missing = [k for k in SCHEMA["required"] if k not in data]
        bad = [i for i, q in enumerate(data["questions"]) if len(q["options"]) != 4 or not 0 <= q["answer_index"] < 4]
        if missing or bad:
            print(f"  {ch_id}: skipped (missing {missing}, bad questions {bad})")
            continue
        save_pack(ch_id, data, catalog)
        saved = json.loads((CONTENT / "chapters" / f"{ch_id}.json").read_text(encoding="utf-8"))
        found = sum(1 for h in saved["highlights"] if h["block"] >= 0)
        print(f"  {ch_id:14} {len(data['questions']):3} questions, {len(data['highlights']):2} highlights ({found} underlined)")
    (CONTENT / "books.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=1), encoding="utf-8")


def to_rows(ch_id: str, data: dict) -> list[dict]:
    rows = []
    for i, q in enumerate(data["questions"]):
        if len(q["options"]) != 4:
            continue
        rows.append({
            "id": str(uuid.uuid5(QID_NS, f"{ch_id}:{i}")),
            "chapter_id": ch_id,
            "unit_code": data["units"][0] if data["units"] else None,
            "question": q["question"],
            "options": q["options"],
            "answer_index": q["answer_index"],
            "explanation": q["explanation"],
            "source_page": q["page"],
            "difficulty": q["difficulty"],
            "source": "book",
            "status": "draft",
        })
    return rows


def cmd_collect(_args):
    client = OpenAI()
    Q_DIR.mkdir(parents=True, exist_ok=True)
    log = read_log()
    catalog = load_catalog()
    for entry in log:
        if entry["collected"]:
            continue
        batch = client.batches.retrieve(entry["id"])
        if batch.status not in ("completed", "expired", "cancelled", "failed"):
            print(f"{batch.id} still {batch.status}; try again later")
            continue
        ok = failed = 0
        if batch.output_file_id:
            for line in client.files.content(batch.output_file_id).text.splitlines():
                if not line.strip():
                    continue
                rec = json.loads(line)
                ch_id = rec["custom_id"]
                resp = rec.get("response") or {}
                if resp.get("status_code") != 200:
                    print(f"  {ch_id}: HTTP {resp.get('status_code')} - will be retried on next submit")
                    failed += 1
                    continue
                choice = resp["body"]["choices"][0]
                msg = choice["message"]
                if msg.get("refusal") or choice.get("finish_reason") != "stop":
                    print(f"  {ch_id}: {msg.get('refusal') or choice.get('finish_reason')} - skipped")
                    failed += 1
                    continue
                save_pack(ch_id, json.loads(msg["content"]), catalog)
                ok += 1
        if batch.error_file_id:
            errs = client.files.content(batch.error_file_id).text.splitlines()
            failed += len([e for e in errs if e.strip()])
            for e in errs[:5]:
                print("  error:", e[:200])
        entry["collected"] = True
        print(f"{batch.id} ({batch.status}): {ok} chapters collected, {failed} failed (failed ones are re-sent by the next submit)")
    (CONTENT / "books.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=1), encoding="utf-8")
    BATCH_LOG.write_text(json.dumps(log, indent=1))


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    load_env()
    ap = argparse.ArgumentParser()
    ap.add_argument("command", choices=["estimate", "submit", "status", "collect", "run", "import"])
    ap.add_argument("--books")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    {"estimate": cmd_estimate, "submit": cmd_submit, "status": cmd_status, "collect": cmd_collect, "run": cmd_run, "import": cmd_import}[args.command](args)


if __name__ == "__main__":
    main()
