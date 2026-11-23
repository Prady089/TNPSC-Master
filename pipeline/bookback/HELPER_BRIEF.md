# Brief: writing "Book back questions" for TNPSC Master

TNPSC Master is a free exam-prep app for Tamil Nadu Public Service Commission exams. It is built from the
Tamil Nadu SCERT textbooks (English medium). For each chapter we publish:

1. **Book back questions:** every question from the textbook's end-of-chapter exercises (Evaluation /
   Exercise section), with a correct answer. `src: "book"`.
2. **More questions:** additional TNPSC-Prelims-style MCQs written from the chapter content. `src: "extra"`.

Paths are relative to the repo root: `c:\Users\prade\OneDrive\D drive\Automations\TNPSC APP`.

## Inputs for chapter `<id>`

- `pipeline/bookback/raw/<id>.txt`: the raw exercise text pulled from the PDF. Column layout can scramble the
  order: options can be split across lines, and numbering can jump between sections. Rebuild each question
  faithfully. The file may run past the exercises (activities, the next chapter's opening, page headers,
  timestamps like `10th_Science_Unit-7.indd 102`). Ignore anything that is not an exercise question.
- `app/public/content/chapters/<id>.json`: the chapter itself (`title`, `summary`, `keyFacts`, `blocks[].text`).
  Use it to check answers and to write the extra questions.
- If `raw/<id>.txt` is missing or has no real exercises, run
  `pdftotext -enc UTF-8 -f <first> -l <last> "<pdf>" -` yourself. Take the pages from the chapter JSON's `pages`
  field and the PDF file name from `pipeline/catalog.py` (BOOKS, matching `bookId`). The PDF is in the repo
  root or in `books/`. Look for the exercises; they may sit 1–3 pages after `last`. If the chapter truly
  has no exercises, write only extra questions (25+).

## Output: `pipeline/bookback/items/<id>.json`

A JSON list. Study `pipeline/bookback/items/c10-sci-08.json` and `c10-sci-09.json` first as models of tone,
length and format. Every item has these fields:

| field | meaning |
|---|---|
| `k` | kind: `mcq`, `ar` (assertion-reason), `tf` (true/false), `fill`, `match`, `short`, `long`, `hot` (higher order thinking), `num` (numerical problem) |
| `q` | question text. Use Unicode sub/superscripts (CO₂, 10²³, cm³, Fe³⁺, °C). Use `\n` between Assertion and Reason. |
| `o` | `mcq`/`ar` only: exactly 4 options, in the book's order (a, b, c, d) |
| `a` | `mcq`/`ar`: index 0–3 of the correct option. `tf`: `true` or `false`. Other kinds: answer text. |
| `p` | `match` only: `[[left, right], ...]` with each left matched to its correct right. The app shuffles the right column. |
| `x` | optional explanation (one or two sentences). **Required** for a false `tf`: give the corrected statement. |
| `src` | `"book"` or `"extra"` (default is book) |

Order: book items first, in the textbook's order of sections. Then the extra items.

## Rules for book back items

- Include **every** exercise question: MCQ, fill in the blanks, true/false, match, assertion-reason,
  very short, short, long, HOT, problems/numericals, and "give reasons"/"distinguish" questions.
  - "Give reasons" questions are `short`. "Distinguish/differentiate" questions are `short` or `long` by size.
  - Skip only activities, projects, "draw the diagram"-only tasks with nothing to say in words, and anything
    pointing to a figure you cannot see. A diagram question can be kept if it can be answered by naming the
    parts or labels.
- Questions with sub-parts stay as one item.
- Fix obvious OCR and spacing glitches ("A toms" → "Atoms"), but do not change the meaning.
- "Correct the statement" true/false questions: `k: "tf"`, with `x` holding the corrected statement.
- Assertion-reason: put the book's four choices in `o` in the book's order. Common forms are
  "(a) both true, R explains A / (b) both true, R does not explain A / (c) A true, R false / (d) A false, R true".
- **Answers must be correct.** Work them out from the chapter and your own knowledge. For numericals show
  the working briefly with units. Where the textbook's intended answer differs from strict science, give the
  book's answer and say so in `x`.
- Answer length:
  - fill: the word or phrase
  - short: 1–3 sentences
  - long and HOT: 60–160 words of key points, as numbered points where natural
  - num: the working plus the result
- The textbook sometimes prints an answer list ("Answers: 1) c 2) a ..."). Use it, but check it.

## Rules for extra items (`src: "extra"`)

- 15–25 per chapter (25+ if the chapter has no exercises), written from the chapter content.
- Mostly `mcq`, TNPSC Prelims style:
  - Four plausible options with exactly one correct answer.
  - Include some statement-based questions ("Consider the following statements... Which of the above is/are
    correct?"), some "Which of the following is NOT ...", and pairs-matching MCQs with coded options.
  - Cover facts likely to be asked: definitions, scientists and discoveries, units, examples, numbers,
    functions, diseases and causes, everyday applications.
- Add `x` with a short explanation to each extra item.
- No duplicates of book back questions, and no trivial "According to the chapter..." wording. Questions
  must stand on their own.
- Chapters `c10-sci-10` … `c10-sci-22` already have 40 extra MCQs elsewhere, so write at most 5 extras there.

## Checking

Run `python pipeline/bookback/check_items.py <id> [<id> ...]`, then fix every ERROR until each chapter prints
`OK`. Do not run `build_bookback.py`. Do not edit any other file. Do not use git.

## Report back

For each chapter: book back count, extra count, any exercise questions you skipped and why, and any answer
you are unsure of (quote the question).
