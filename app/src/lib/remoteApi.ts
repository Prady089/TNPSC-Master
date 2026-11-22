import type { Api } from './api';
import type { AppUser, ChapterSummary, Member, Question } from './types';
import { supabase } from './supabase';
import { pickDaily } from '../shared/syllabus';
import { DEFAULT_EXAM_EVENTS, type ExamEvent } from '../shared/exam';

const db = () => {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
};
const must = <T,>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message);
  return r.data;
};
const toUser = (u: { id: string; email?: string | null } | null | undefined): AppUser | null =>
  u ? { id: u.id, email: u.email ?? null } : null;

const Q_COLS = 'id,unit_code,chapter_id,question,options,answer_index,explanation,source_page,difficulty,source,status';

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export const remoteApi: Api = {
  mode: 'live',

  async currentUser() {
    const { data } = await db().auth.getUser();
    return toUser(data.user);
  },
  onAuthChange(cb) {
    const { data } = db().auth.onAuthStateChange((_e, session) => cb(toUser(session?.user)));
    return () => data.subscription.unsubscribe();
  },
  async signIn(email, password) {
    const { error } = await db().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  },
  async signUp(email, password, fullName) {
    const { data, error } = await db().auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) throw new Error(error.message);
    return { needsConfirmation: !data.session };
  },
  async signInWithGoogle() {
    const { error } = await db().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) throw new Error(error.message);
  },
  async signOut() {
    await db().auth.signOut();
  },
  async getAccessToken() {
    const { data } = await db().auth.getSession();
    return data.session?.access_token ?? null;
  },

  async getProfile() {
    const user = await this.currentUser();
    if (!user) return null;
    return must(await db().from('profiles').select('*').eq('id', user.id).maybeSingle());
  },
  async saveProfile(p) {
    const user = await this.currentUser();
    if (!user) throw new Error('Not signed in');
    const { role: _ignored, id: _id, chat_muted_until: _m, ...rest } = p;
    must(await db().from('profiles').update(rest).eq('id', user.id));
  },

  async getDailyQuiz(date) {
    const row = must(await db().from('daily_quiz').select('question_ids').eq('quiz_date', date).maybeSingle());
    if (row?.question_ids?.length) return this.getQuestionsByIds(row.question_ids);
    // Cron hasn't built today's quiz yet: build it client-side from the approved pool.
    const pool = must(await db().from('questions').select('id,unit_code').eq('status', 'approved').limit(5000)) ?? [];
    return this.getQuestionsByIds(pickDaily(pool, date));
  },
  async getPractice({ unit, chapter, count }) {
    let q = db().from('questions').select('id').eq('status', 'approved');
    if (unit) q = q.eq('unit_code', unit);
    if (chapter) q = q.eq('chapter_id', chapter);
    const ids = (must(await q.limit(2000)) ?? []).map((r: { id: string }) => r.id);
    return this.getQuestionsByIds(shuffle(ids).slice(0, count));
  },
  async getQuestionsByIds(ids) {
    if (!ids.length) return [];
    const rows = must(await db().from('questions').select(Q_COLS).in('id', ids)) as Question[];
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)).filter(Boolean) as Question[];
  },

  async saveAttempt(a, answers) {
    const attempt = must(await db().from('quiz_attempts').insert(a).select('id').single()) as { id: string };
    if (answers.length) {
      must(await db().from('attempt_answers').insert(answers.map((x) => ({ ...x, attempt_id: attempt.id }))));
    }
  },
  async getAttempts(limit = 50) {
    return must(await db().from('quiz_attempts').select('*').order('created_at', { ascending: false }).limit(limit)) ?? [];
  },
  async getUnitStats() {
    return must(await db().from('my_unit_stats').select('*')) ?? [];
  },
  async getWrongQuestionIds(limit = 30) {
    const rows = must(
      await db().from('attempt_answers').select('question_id, quiz_attempts!inner(created_at)').eq('is_correct', false)
        .order('created_at', { referencedTable: 'quiz_attempts', ascending: false }).limit(limit * 2),
    ) as { question_id: string }[];
    return [...new Set(rows.map((r) => r.question_id))].slice(0, limit);
  },

  async getReading() {
    return must(await db().from('reading_progress').select('chapter_id,progress,bookmarked,updated_at')) ?? [];
  },
  async setReading(chapterId, patch) {
    must(await db().from('reading_progress').upsert({ chapter_id: chapterId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id,chapter_id' }));
  },

  async getNews(limit = 40) {
    return must(await db().from('news_items').select('id,source,title,url,published_at,summary,exam_angle,tags').order('published_at', { ascending: false, nullsFirst: false }).limit(limit)) ?? [];
  },

  async listForReview({ status, unit, limit = 50 }) {
    let q = db().from('questions').select(Q_COLS).eq('status', status);
    if (unit) q = q.eq('unit_code', unit);
    return (must(await q.order('created_at', { ascending: false }).limit(limit)) ?? []) as Question[];
  },
  async reviewQuestion(id, status, edits = {}) {
    const user = await this.currentUser();
    const { id: _id, ...fields } = edits;
    must(await db().from('questions').update({ ...fields, status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', id));
  },
  async getChapterSummary(chapterId) {
    return (must(await db().from('chapter_summaries').select('chapter_id,summary,key_points,key_facts,created_at').eq('chapter_id', chapterId).maybeSingle()) ?? null) as ChapterSummary | null;
  },
  async createChapterSummary(chapterId) {
    const token = await this.getAccessToken();
    if (!token) throw new Error('Please sign in again');
    const r = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ chapterId }),
    }).catch(() => null);
    if (!r) throw new Error('You seem to be offline. Connect to the internet and try again.');
    const body = await r.json().catch(() => null);
    if (!r.ok || !body) throw new Error(body?.error ?? (r.status === 404 ? 'AI summaries work on the deployed site only.' : 'Could not create the summary'));
    return body as ChapterSummary;
  },

  async getExamEvents() {
    const rows = must(await db().from('exam_events').select('code,label,event_date,is_approx,sort').order('sort')) as ExamEvent[] | null;
    return rows?.length ? rows : DEFAULT_EXAM_EVENTS;
  },
  async saveExamEvent(e) {
    must(await db().from('exam_events').upsert({ ...e, updated_at: new Date().toISOString() }, { onConflict: 'code' }));
  },
  async deleteExamEvent(code) {
    must(await db().from('exam_events').delete().eq('code', code));
  },

  async listMembers() {
    return (must(await db().rpc('admin_list_members')) ?? []) as Member[];
  },
  async setMemberRole(id, role) {
    must(await db().rpc('admin_set_role', { target: id, new_role: role }));
  },
};
