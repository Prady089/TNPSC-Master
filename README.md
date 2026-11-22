# TNPSC Group 1 Prep (PWA)

Study app for TNPSC Group 1 aspirants:
- **Learn**: 16 Tamil Nadu SCERT books (Class 6–12, English medium), split into 355 chapters and mapped to the Prelims syllabus units.
- **Quiz**: a 20-question daily quiz weighted like the real exam, plus practice by unit or chapter and a "revise mistakes" mode.
- **Progress**: streak, accuracy per unit, reading progress.
- **News**: daily Tamil Nadu politics and governance digest with an "exam angle" for each story.

```
app/        React + Vite PWA (also the Vercel project: static site + /api cron)
pipeline/   Python: PDFs -> chapters -> AI notes & draft questions -> Supabase
supabase/   schema.sql (tables, row-level security, triggers)
```

The app runs in **demo mode** (data kept in the browser, 47 sample questions) until Supabase keys are set.

## 1. Run locally

```bash
cd app
npm install
npm run dev            # http://localhost:5173
```

## 2. Database: Supabase

1. Create a project at supabase.com, then open **SQL Editor** and run `supabase/schema.sql`.
2. Copy `app/.env.example` to `app/.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
3. Optional: enable Google sign-in under Authentication → Providers.
4. Sign up in the app, then make yourself an admin (SQL editor):
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'YOUR_EMAIL');
   ```

## 3. Content pipeline

```bash
pip install -r pipeline/requirements.txt          # needs poppler's pdftotext on PATH (Git Bash has it)

python pipeline/extract_chapters.py               # PDFs -> app/public/content (already done)

# AI notes + 25 draft MCQs per chapter (OpenAI Batch API, 50% cheaper).
# Keys are read from app/.env.local: OPENAI_API_KEY (+ optional OPENAI_MODEL, default gpt-5.5)
python pipeline/generate_questions.py estimate     # token estimate for the selected chapters
python pipeline/generate_questions.py submit --books c12-pol,c11-pol   # start small, check quality
python pipeline/generate_questions.py status
python pipeline/generate_questions.py collect      # usually within an hour

python pipeline/upload_questions.py               # needs SUPABASE_SERVICE_ROLE_KEY in app/.env.local               # uploads as status = draft
```

Then open **Profile → Review questions** in the app to approve, edit or reject each draft. Students only see approved questions.

## 4. Deploy: Vercel

- Import the repo with **Root Directory = `app`** (Framework: Vite).
- Environment variables:
  | Name | Used by |
  |---|---|
  | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | browser app |
  | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | news cron (server only) |
  | `OPENAI_API_KEY` (optional `OPENAI_NEWS_MODEL`, default gpt-5.4-mini) | news cron |
  | `CRON_SECRET` | any random string; Vercel sends it to the cron |
- `vercel.json` runs `/api/cron/news` daily at 06:00 IST. Each run:
  1. Fetches the feeds (The Hindu TN, DT Next, Dinamani, Google News).
  2. Keeps only exam-relevant stories, with an AI summary and exam angle.
  3. Drafts 5 current-affairs questions.
  4. Builds that day's quiz from approved questions.

## Content notes

- **Excluded on purpose**:
  - *Indian Polity* by M. Laxmikanth: copyrighted (McGraw Hill), so it can't be redistributed.
  - The English-literature readers: not part of the Group 1 syllabus.
  - *Polity (1 to 4) – Part I*: scanned and of unknown source.
- **Tamil-medium books**: their PDFs use legacy font encoding, so the text extracts as garbage. They need OCR (Tesseract `tam` or Google Vision) before they can be added. This is planned with the Tamil UI.
- `pipeline/make_demo_questions.py` holds the hand-checked demo set; `pipeline/make_icons.py` generates the PWA icons.
