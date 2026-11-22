// Demo mode: everything lives in this browser's localStorage. Used until
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set. Lets you try the whole app offline.
import type { Api } from './api';
import type { AnswerRecord, AppUser, Attempt, Profile, Question, ReadingState } from './types';
import { pickDaily } from '../shared/syllabus';
import { DEFAULT_EXAM_EVENTS, type ExamEvent } from '../shared/exam';

const KEY = 'tnpsc-demo-v1';

interface Store {
  user: AppUser | null;
  profile: Profile | null;
  attempts: (Attempt & { answers: AnswerRecord[] })[];
  reading: ReadingState[];
  reviews: Record<string, { status: 'approved' | 'rejected'; edits?: Partial<Question> }>;
  examEvents?: ExamEvent[];
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* storage blocked or corrupt */ }
  return { user: null, profile: null, attempts: [], reading: [], reviews: {} };
}
function save(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

const listeners = new Set<(u: AppUser | null) => void>();
const emit = (u: AppUser | null) => listeners.forEach((l) => l(u));

let bank: Promise<Question[]> | null = null;
function allQuestions(): Promise<Question[]> {
  bank ??= fetch('/content/demo-questions.json').then((r) => (r.ok ? r.json() : [])).catch(() => []);
  return bank.then((qs) => {
    const { reviews } = load();
    return qs.map((q) => {
      const r = reviews[q.id];
      return r ? { ...q, ...r.edits, status: r.status } : { ...q, status: q.status ?? 'approved' };
    });
  });
}
// The demo user is a super admin so the admin screens can be tried out.
function demoSignIn(email: string, fullName?: string) {
  const s = load();
  s.user = { id: 'demo-user', email };
  s.profile ??= { id: 'demo-user', full_name: null, phone: null, district: null, education: null, target_year: null, attempt_number: 1, preferred_lang: 'en', daily_goal: 20, target_group: null, role: 'superadmin' };
  if (s.profile.role === 'admin') s.profile.role = 'superadmin';
  if (fullName) s.profile.full_name = fullName;
  save(s);
  emit(s.user);
}

const approved = async () => (await allQuestions()).filter((q) => q.status === 'approved');

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

export const localApi: Api = {
  mode: 'demo',

  async currentUser() { return load().user; },
  onAuthChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  async signIn(email) {
    demoSignIn(email);
  },
  async signUp(email, _password, fullName) {
    demoSignIn(email, fullName);
    return { needsConfirmation: false };
  },
  async signInWithGoogle() { await this.signIn('demo@student.local', ''); },
  async signOut() { const s = load(); s.user = null; save(s); emit(null); },
  async getAccessToken() { return null; },

  async getProfile() { return load().profile; },
  async saveProfile(p) { const s = load(); s.profile = { ...s.profile!, ...p }; save(s); },

  async getDailyQuiz(date) {
    const pool = await approved();
    const ids = pickDaily(pool, date);
    const byId = new Map(pool.map((q) => [q.id, q]));
    return ids.map((id) => byId.get(id)!).filter(Boolean);
  },
  async getPyqPapers() { return []; },
  async getPaperQuestions() { return []; },
  async getUnitQuestionCounts() {
    const out: Record<string, number> = {};
    for (const q of await approved()) out[q.unit_code] = (out[q.unit_code] ?? 0) + 1;
    return out;
  },
  async getPractice({ unit, chapter, count }) {
    const pool = (await approved()).filter((q) => (!unit || q.unit_code === unit) && (!chapter || q.chapter_id === chapter));
    return shuffle(pool).slice(0, count);
  },
  async getQuestionsByIds(ids) {
    const byId = new Map((await allQuestions()).map((q) => [q.id, q]));
    return ids.map((id) => byId.get(id)!).filter(Boolean);
  },

  async saveAttempt(a, answers) {
    const s = load();
    if (a.mode === 'daily' && s.attempts.some((x) => x.mode === 'daily' && x.quiz_date === a.quiz_date)) {
      throw new Error("Today's daily quiz is already submitted.");
    }
    s.attempts.unshift({
      id: crypto.randomUUID(), created_at: new Date().toISOString(),
      quiz_date: a.quiz_date ?? null, unit_code: a.unit_code ?? null, chapter_id: a.chapter_id ?? null,
      mode: a.mode, total: a.total, correct: a.correct, duration_sec: a.duration_sec, answers,
    });
    save(s);
  },
  async getAttempts(limit = 50) {
    return load().attempts.slice(0, limit).map(({ answers: _a, ...rest }) => rest);
  },
  async getUnitStats() {
    const unitOf = new Map((await allQuestions()).map((q) => [q.id, q.unit_code]));
    const stats = new Map<string, { answered: number; correct: number }>();
    for (const a of load().attempts) for (const ans of a.answers) {
      const u = unitOf.get(ans.question_id);
      if (!u) continue;
      const st = stats.get(u) ?? { answered: 0, correct: 0 };
      st.answered++;
      if (ans.is_correct) st.correct++;
      stats.set(u, st);
    }
    return [...stats].map(([unit_code, v]) => ({ unit_code, ...v }));
  },
  async getWrongQuestionIds(limit = 30) {
    const ids = load().attempts.flatMap((a) => a.answers.filter((x) => !x.is_correct).map((x) => x.question_id));
    return [...new Set(ids)].slice(0, limit);
  },

  async getReading() { return load().reading; },
  async setReading(chapterId, patch) {
    const s = load();
    const cur = s.reading.find((r) => r.chapter_id === chapterId);
    const next = { chapter_id: chapterId, progress: 0, bookmarked: false, ...cur, ...patch, updated_at: new Date().toISOString() };
    s.reading = [next, ...s.reading.filter((r) => r.chapter_id !== chapterId)];
    save(s);
  },

  async getNews() { return []; },

  async listForReview({ status, unit, limit = 50 }) {
    return (await allQuestions()).filter((q) => q.status === status && (!unit || q.unit_code === unit)).slice(0, limit);
  },
  async reviewQuestion(id, status, edits) {
    const s = load();
    s.reviews[id] = { status, edits };
    save(s);
  },
  async getChapterSummary() { return null; },
  async createChapterSummary() { throw new Error('AI summaries need a signed-in account on the live app.'); },

  async getExamEvents() { return load().examEvents ?? DEFAULT_EXAM_EVENTS; },
  async saveExamEvent(e) {
    const s = load();
    const list = (s.examEvents ?? DEFAULT_EXAM_EVENTS).filter((x) => x.code !== e.code);
    s.examEvents = [...list, e].sort((a, b) => a.sort - b.sort);
    save(s);
  },
  async deleteExamEvent(code) {
    const s = load();
    s.examEvents = (s.examEvents ?? DEFAULT_EXAM_EVENTS).filter((x) => x.code !== code);
    save(s);
  },

  async listMembers() {
    const { user, profile } = load();
    return user && profile ? [{ id: user.id, email: user.email, full_name: profile.full_name, district: profile.district, role: profile.role, chat_muted_until: null, created_at: new Date().toISOString(), last_sign_in_at: null }] : [];
  },
  async setMemberRole() { throw new Error('Not available in demo mode'); },
};
