// Daily job (Vercel Cron, 06:00 IST): Tamil Nadu political news -> summaries,
// draft current-affairs questions, and today's daily quiz.
//
// Env: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET
//      OPENAI_NEWS_MODEL (optional, default gpt-5.4-mini)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { istDate, pickDaily } from '../../src/shared/syllabus.js';

const FEEDS = [
  { source: 'The Hindu', url: 'https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss' },
  { source: 'DT Next', url: 'https://www.dtnext.in/stories.rss' },
  { source: 'Dinamani', url: 'https://www.dinamani.com/stories.rss' },
  { source: 'Google News', url: 'https://news.google.com/rss/search?q=Tamil+Nadu+government+OR+assembly+OR+scheme&hl=en-IN&gl=IN&ceid=IN:en' },
];
const MAX_AGE_HOURS = 36;
const MAX_ITEMS_TO_AI = 80;

interface FeedItem { source: string; title: string; url: string; published_at: string | null; snippet: string }

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ').trim();

const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]) : '';
};

async function fetchFeed(feed: { source: string; url: string }): Promise<FeedItem[]> {
  try {
    const res = await fetch(feed.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TNPSCPrepBot/1.0)' }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    const xml = await res.text();
    const cutoff = Date.now() - MAX_AGE_HOURS * 3600_000;
    return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => m[0]).map((item) => {
      const pub = tag(item, 'pubDate');
      const date = pub ? new Date(pub) : null;
      return {
        source: feed.source,
        title: tag(item, 'title'),
        url: tag(item, 'link'),
        published_at: date && !isNaN(+date) ? date.toISOString() : null,
        snippet: tag(item, 'description').slice(0, 300),
      };
    }).filter((i) => i.title && i.url.startsWith('http') && (!i.published_at || +new Date(i.published_at) > cutoff));
  } catch {
    return [];
  }
}

const AI_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          relevant: { type: 'boolean' },
          summary: { type: 'string' },
          exam_angle: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['index', 'relevant', 'summary', 'exam_angle', 'tags'],
        additionalProperties: false,
      },
    },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          news_index: { type: 'integer' },
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          answer_index: { type: 'integer', enum: [0, 1, 2, 3] },
          explanation: { type: 'string' },
        },
        required: ['news_index', 'question', 'options', 'answer_index', 'explanation'],
        additionalProperties: false,
      },
    },
  },
  required: ['items', 'questions'],
  additionalProperties: false,
};

const SYSTEM = `You prepare the daily current-affairs digest for students of the TNPSC Group 1 exam (Tamil Nadu).
You get a numbered list of news headlines with short snippets (some in Tamil).
For EVERY item return: relevant (true only for Tamil Nadu politics, governance, government schemes and orders, the Assembly, Governor, courts on state matters, elections, state economy, or national policy with a Tamil Nadu angle; false for crime, accidents, cinema, sport, gossip and duplicates of an earlier item),
summary (2-3 sentences in English, written in your own words using only what the headline and snippet say; do not copy text),
exam_angle (one sentence: the constitutional article, scheme, body or concept a student should connect it to; empty string if none),
tags (1-3 short lowercase tags).
Then write 5 multiple-choice questions from the most exam-worthy relevant items. Use only facts present in the headline/snippet; 4 options, exactly one correct.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const report: Record<string, unknown> = {};

  // 1. Fetch + de-duplicate news
  const all = (await Promise.all(FEEDS.map(fetchFeed))).flat();
  const seenTitles = new Set<string>();
  let items = all.filter((i) => {
    const k = i.title.toLowerCase().replace(/[^a-z0-9஀-௿]/g, '').slice(0, 60);
    if (seenTitles.has(k)) return false;
    seenTitles.add(k);
    return true;
  });
  if (items.length) {
    const { data: existing } = await db.from('news_items').select('url').in('url', items.map((i) => i.url));
    const known = new Set((existing ?? []).map((r) => r.url));
    items = items.filter((i) => !known.has(i.url)).slice(0, MAX_ITEMS_TO_AI);
  }
  report.fetched = all.length;
  report.new = items.length;

  // 2. Summarise + draft questions with OpenAI (structured output = guaranteed JSON shape)
  if (items.length && process.env.OPENAI_API_KEY) {
    const client = new OpenAI();
    const list = items.map((i, n) => `${n}. [${i.source}] ${i.title}${i.snippet ? ' — ' + i.snippet : ''}`).join('\n');
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_NEWS_MODEL || 'gpt-5.4-mini',
      reasoning_effort: 'low',
      max_completion_tokens: 16000,
      response_format: { type: 'json_schema', json_schema: { name: 'news_digest', strict: true, schema: AI_SCHEMA } },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Today's items (${istDate()}):\n${list}` },
      ],
    });
    const choice = completion.choices[0];
    if (choice.message.refusal || choice.finish_reason !== 'stop' || !choice.message.content) {
      report.ai = `skipped: ${choice.message.refusal ?? choice.finish_reason}`;
    } else {
      const out = JSON.parse(choice.message.content) as { items: any[]; questions: any[] };
      const rows = out.items
        .filter((a) => items[a.index])
        .map((a) => {
          const { source, title, url, published_at } = items[a.index]; // snippet is prompt-only, not stored
          return { source, title, url, published_at, summary: a.summary, exam_angle: a.exam_angle, tags: a.tags, is_relevant: a.relevant };
        });
      const { data: inserted, error } = await db.from('news_items').upsert(rows, { onConflict: 'url', ignoreDuplicates: true }).select('id,url');
      if (error) report.newsError = error.message;
      const idByUrl = new Map((inserted ?? []).map((r) => [r.url, r.id]));
      const qs = out.questions
        .filter((q) => q.options.length === 4 && items[q.news_index])
        .map((q) => ({
          unit_code: 'CA', source: 'news', status: 'draft',
          news_id: idByUrl.get(items[q.news_index].url) ?? null,
          question: q.question, options: q.options, answer_index: q.answer_index, explanation: q.explanation,
        }));
      if (qs.length) await db.from('questions').insert(qs);
      report.relevant = rows.filter((r) => r.is_relevant).length;
      report.draftQuestions = qs.length;
    }
  }

  // 3. Build today's daily quiz from approved questions
  const today = istDate();
  const { data: exists } = await db.from('daily_quiz').select('quiz_date').eq('quiz_date', today).maybeSingle();
  if (!exists) {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const caSince = new Date(Date.now() - 3 * 86400_000).toISOString();
    const [{ data: pool }, { data: ca }, { data: recent }] = await Promise.all([
      db.from('questions').select('id,unit_code').eq('status', 'approved').neq('unit_code', 'CA').limit(20000),
      db.from('questions').select('id,unit_code').eq('status', 'approved').eq('unit_code', 'CA').gte('reviewed_at', caSince),
      db.from('daily_quiz').select('question_ids').gte('quiz_date', since),
    ]);
    const used = new Set((recent ?? []).flatMap((r) => r.question_ids as string[]));
    const ids = pickDaily([...(pool ?? []), ...(ca ?? [])], today, used);
    if (ids.length) {
      await db.from('daily_quiz').insert({ quiz_date: today, question_ids: ids });
      report.dailyQuiz = ids.length;
    } else {
      report.dailyQuiz = 'no approved questions yet';
    }
  }

  return res.status(200).json({ ok: true, date: today, ...report });
}
