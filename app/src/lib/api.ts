import type { AnswerRecord, AppUser, Attempt, ChapterSummary, Member, NewsItem, Profile, Question, QuizMode, ReadingState, Role, UnitStat } from './types';
import type { ExamEvent } from '../shared/exam';
import { localApi } from './localApi';
import { remoteApi } from './remoteApi';
import { hasSupabase } from './supabase';

export interface NewAttempt {
  mode: QuizMode;
  quiz_date?: string | null;
  unit_code?: string | null;
  chapter_id?: string | null;
  total: number;
  correct: number;
  duration_sec: number;
}

export interface Api {
  mode: 'live' | 'demo';
  // auth
  currentUser(): Promise<AppUser | null>;
  onAuthChange(cb: (u: AppUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, fullName: string): Promise<{ needsConfirmation: boolean }>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  /** Session token for the chat server (null in demo mode). */
  getAccessToken(): Promise<string | null>;
  // profile
  getProfile(): Promise<Profile | null>;
  saveProfile(p: Partial<Profile>): Promise<void>;
  // questions
  getDailyQuiz(date: string): Promise<Question[]>;
  getPractice(opts: { unit?: string; chapter?: string; count: number }): Promise<Question[]>;
  getQuestionsByIds(ids: string[]): Promise<Question[]>;
  /** Number of published questions per syllabus unit. */
  getUnitQuestionCounts(): Promise<Record<string, number>>;
  // scores
  saveAttempt(a: NewAttempt, answers: AnswerRecord[]): Promise<void>;
  getAttempts(limit?: number): Promise<Attempt[]>;
  getUnitStats(): Promise<UnitStat[]>;
  getWrongQuestionIds(limit?: number): Promise<string[]>;
  // reading
  getReading(): Promise<ReadingState[]>;
  setReading(chapterId: string, patch: Partial<Pick<ReadingState, 'progress' | 'bookmarked'>>): Promise<void>;
  // news
  getNews(limit?: number): Promise<NewsItem[]>;
  // admin review
  listForReview(opts: { status: 'draft' | 'approved' | 'rejected'; unit?: string; limit?: number }): Promise<Question[]>;
  reviewQuestion(id: string, status: 'approved' | 'rejected', edits?: Partial<Question>): Promise<void>;
  // AI chapter summaries (live mode only)
  getChapterSummary(chapterId: string): Promise<ChapterSummary | null>;
  createChapterSummary(chapterId: string): Promise<ChapterSummary>;
  // exam timeline (everyone reads, super admin edits)
  getExamEvents(): Promise<ExamEvent[]>;
  saveExamEvent(e: ExamEvent): Promise<void>;
  deleteExamEvent(code: string): Promise<void>;
  // members (super admin)
  listMembers(): Promise<Member[]>;
  setMemberRole(id: string, role: Role): Promise<void>;
}

export const api: Api = hasSupabase ? remoteApi : localApi;
