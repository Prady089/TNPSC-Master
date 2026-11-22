import { io, type Socket } from 'socket.io-client';
import { api } from './api';
import type { ChatMessage, Role } from './types';
import { unitByCode, UNITS } from '../shared/syllabus';

export const CHAT_URL = (import.meta.env.VITE_CHAT_URL as string | undefined)?.replace(/\/$/, '') ?? '';
/** Chat needs a real account (live mode) and a deployed chat server. */
export const chatAvailable = api.mode === 'live' && Boolean(CHAT_URL);

interface Ack { ok: boolean; error?: string }
export interface JoinResult { messages: ChatMessage[]; hasMore: boolean; me: { id: string; role: Role; muted_until: string | null } }

let socket: Socket | null = null;

export function chatSocket(): Socket {
  socket ??= io(CHAT_URL, {
    transports: ['websocket', 'polling'],
    // Called on every (re)connect, so an expired token is replaced by a fresh one.
    auth: (cb) => { api.getAccessToken().then((token) => cb({ token })); },
  });
  return socket;
}

export function disconnectChat() {
  socket?.disconnect();
  socket = null;
}

export function emitAck<T>(event: string, payload: unknown, timeoutMs = 10_000): Promise<T> {
  return new Promise((resolve, reject) => {
    chatSocket().timeout(timeoutMs).emit(event, payload, (err: Error | null, res: Ack & T) => {
      if (err) return reject(new Error('The chat server did not respond. Check your connection.'));
      if (!res?.ok) return reject(new Error(res?.error || 'Something went wrong'));
      resolve(res);
    });
  });
}

// ── rooms ──
export interface RoomInfo { id: string; title: string; subtitle: string; group: 'Lobby' | 'Units' | 'Exam stages' }

export const STATIC_ROOMS: RoomInfo[] = [
  { id: 'general', title: 'General', subtitle: 'Introductions, strategy and anything Group 1', group: 'Lobby' },
  { id: 'doubts', title: 'Doubts', subtitle: 'Ask anything you are stuck on', group: 'Lobby' },
  ...UNITS.map((u): RoomInfo => ({ id: `unit-${u.code.toLowerCase()}`, title: u.short, subtitle: u.title, group: 'Units' })),
  { id: 'mains', title: 'Mains preparation', subtitle: 'Answer writing, papers and schedules', group: 'Exam stages' },
  { id: 'interview', title: 'Interview', subtitle: 'Personality test preparation', group: 'Exam stages' },
];

export const quizRoom = (date: string) => `quiz-${date}`;
export const chapterRoom = (chapterId: string) => `ch-${chapterId}`;
export const unitRoom = (code: string) => `unit-${code.toLowerCase()}`;

/** Human title for any room id; chapter titles come from the catalog. */
export function roomTitle(id: string, chapterTitle?: (chapterId: string) => string | undefined): { title: string; subtitle: string } {
  const s = STATIC_ROOMS.find((r) => r.id === id);
  if (s) return s;
  const quiz = /^quiz-(\d{4}-\d{2}-\d{2})$/.exec(id);
  if (quiz) {
    const d = new Date(`${quiz[1]}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    return { title: `Daily quiz · ${d}`, subtitle: 'Discuss answers and explanations' };
  }
  if (id.startsWith('ch-')) {
    const chId = id.slice(3);
    return { title: chapterTitle?.(chId) ?? 'Chapter discussion', subtitle: 'Chapter discussion' };
  }
  if (id.startsWith('unit-')) {
    const u = unitByCode(id.slice(5).toUpperCase());
    if (u) return { title: u.short, subtitle: u.title };
  }
  return { title: id, subtitle: '' };
}
