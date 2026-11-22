// On-demand AI chapter summary. POST { chapterId } with the member's Supabase
// access token as "Authorization: Bearer <token>".
// The first request for a chapter generates the summary; it is cached in
// public.chapter_summaries and every later reader gets the cached copy.
//
// Env: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//      OPENAI_SUMMARY_MODEL (optional, default gpt-5.4-mini)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+){1,4}$/;
const DAILY_LIMIT = 10; // new summaries one member may trigger per day (cached ones are free)
const MAX_CHARS = 90_000;

interface Chapter { id: string; title: string; blocks: { t: 'h' | 'p'; text: string }[] }

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'key_points', 'key_facts'],
  properties: {
    summary: { type: 'string', description: '120-180 word overview of the chapter in plain English.' },
    key_points: { type: 'array', items: { type: 'string' }, description: '6-10 main ideas, one sentence each.' },
    key_facts: { type: 'array', items: { type: 'string' }, description: '8-15 exam-ready facts: names, dates, numbers, articles, places.' },
  },
} as const;

const SYSTEM = `You write revision notes for TNPSC Group 1 aspirants from Tamil Nadu school textbook chapters.
Use only information stated in the chapter text. Do not add outside facts. Write in your own words, in clear English.
Key facts must be short, specific and checkable against the chapter (dates, names, numbers, definitions).`;

async function loadChapter(id: string, host: string | undefined): Promise<Chapter | null> {
  try {
    const file = path.join(process.cwd(), 'public', 'content', 'chapters', `${id}.json`);
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    // Fall back to the deployed static file.
    if (!host) return null;
    const r = await fetch(`https://${host}/content/chapters/${id}.json`);
    return r.ok ? ((await r.json()) as Chapter) : null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const chapterId = String((req.body as { chapterId?: string } | undefined)?.chapterId ?? '');
  if (!token) return res.status(401).json({ error: 'Please sign in' });
  if (!ID_RE.test(chapterId)) return res.status(400).json({ error: 'Unknown chapter' });

  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: auth } = await db.auth.getUser(token);
  const user = auth?.user;
  if (!user) return res.status(401).json({ error: 'Please sign in again' });

  const cols = 'chapter_id, summary, key_points, key_facts, created_at';
  const { data: cached } = await db.from('chapter_summaries').select(cols).eq('chapter_id', chapterId).maybeSingle();
  if (cached) return res.status(200).json({ ...cached, cached: true });

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await db.from('chapter_summaries').select('chapter_id', { count: 'exact', head: true })
    .eq('generated_by', user.id).gte('created_at', since);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return res.status(429).json({ error: `You can create ${DAILY_LIMIT} new summaries a day. Summaries others already made are always available.` });
  }

  const chapter = await loadChapter(chapterId, req.headers.host);
  if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
  const text = chapter.blocks.map((b) => (b.t === 'h' ? `\n## ${b.text}\n` : b.text)).join('\n').slice(0, MAX_CHARS);

  try {
    const client = new OpenAI();
    const model = process.env.OPENAI_SUMMARY_MODEL || 'gpt-5.4-mini';
    const completion = await client.chat.completions.create({
      model,
      reasoning_effort: 'low',
      max_completion_tokens: 8000,
      response_format: { type: 'json_schema', json_schema: { name: 'chapter_notes', strict: true, schema: SCHEMA } },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Chapter: ${chapter.title}\n\n${text}` },
      ],
    });
    const choice = completion.choices[0];
    if (choice.message.refusal || choice.finish_reason !== 'stop' || !choice.message.content) {
      return res.status(502).json({ error: 'The summary could not be created. Try again later.' });
    }
    const out = JSON.parse(choice.message.content) as { summary: string; key_points: string[]; key_facts: string[] };
    const row = { chapter_id: chapterId, ...out, model, generated_by: user.id };
    const { data: saved, error } = await db.from('chapter_summaries')
      .upsert(row, { onConflict: 'chapter_id', ignoreDuplicates: true }).select(cols).maybeSingle();
    if (error) console.error('save summary', error.message);
    return res.status(200).json({ ...(saved ?? row), cached: false });
  } catch (e) {
    console.error('summarize', e);
    return res.status(502).json({ error: 'The AI service is busy. Try again in a minute.' });
  }
}
