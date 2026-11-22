import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { chapterIndex } from '../lib/content';
import { chatAvailable, chatSocket, emitAck, roomTitle, type JoinResult } from '../lib/chat';
import { useAsync } from '../lib/hooks';
import type { ChatMessage, Role } from '../lib/types';
import { istDate } from '../shared/syllabus';
import { Button, Empty, ErrorNote, LinkButton, Pill, Spinner, cx } from '../components/ui';
import { ChatIcon, ChevronLeft, MuteIcon, SendIcon, TrashIcon } from '../components/icons';

const MAX = 1000;
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const ROLE_LABEL: Partial<Record<Role, string>> = { admin: 'Moderator', superadmin: 'Admin' };

export default function ChatRoom() {
  const { roomId = 'general' } = useParams();
  const nav = useNavigate();
  const today = istDate();
  const isTodayQuiz = roomId === `quiz-${today}`;

  const { data: meta } = useAsync(async () => {
    const [chapters, attempts] = await Promise.all([
      chapterIndex().catch(() => new Map()),
      isTodayQuiz ? api.getAttempts(20) : Promise.resolve([]),
    ]);
    return { chapters, quizDone: attempts.some((a) => a.mode === 'daily' && a.quiz_date === today) };
  }, [roomId]);
  const [spoilerOk, setSpoilerOk] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [me, setMe] = useState<JoinResult['me'] | null>(null);
  const [online, setOnline] = useState(0);
  const [state, setState] = useState<'connecting' | 'ready' | 'offline'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);

  const list = useRef<HTMLDivElement>(null);
  const stick = useRef(true); // keep pinned to the bottom unless the reader scrolled up
  const keepOffset = useRef<number | null>(null);

  const join = useCallback(async () => {
    try {
      const r = await emitAck<JoinResult>('join', { room: roomId });
      setMessages(r.messages);
      setHasMore(r.hasMore);
      setMe(r.me);
      setState('ready');
      setError(null);
      stick.current = true;
    } catch (e) {
      setState('offline');
      setError((e as Error).message);
    }
  }, [roomId]);

  useEffect(() => {
    if (!chatAvailable) return;
    const s = chatSocket();
    setMessages([]);
    setState('connecting');
    const onMessage = (m: ChatMessage) => {
      if (m.room_id !== roomId) return;
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    };
    const onDeleted = ({ id }: { id: string }) => setMessages((prev) => prev.filter((m) => m.id !== id));
    const onPresence = ({ room, online: n }: { room: string; online: number }) => room === roomId && setOnline(n);
    const onConnectError = (e: Error) => {
      setState('offline');
      setError(e.message === 'profile_incomplete' ? 'Complete your profile to join the discussion.' : e.message === 'unauthorized' ? 'Please sign in again.' : 'Cannot reach the chat server. Retrying…');
    };
    const onDisconnect = () => setState('offline');
    s.on('connect', join);
    s.on('message', onMessage);
    s.on('deleted', onDeleted);
    s.on('presence', onPresence);
    s.on('connect_error', onConnectError);
    s.on('disconnect', onDisconnect);
    if (s.connected) join();
    return () => {
      s.off('connect', join);
      s.off('message', onMessage);
      s.off('deleted', onDeleted);
      s.off('presence', onPresence);
      s.off('connect_error', onConnectError);
      s.off('disconnect', onDisconnect);
    };
  }, [roomId, join]);

  // Scroll handling: pin to bottom for new messages, keep position when loading older ones.
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    if (keepOffset.current !== null) {
      el.scrollTop = el.scrollHeight - keepOffset.current;
      keepOffset.current = null;
    } else if (stick.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const loadOlder = async () => {
    if (!messages.length) return;
    try {
      const r = await emitAck<{ messages: ChatMessage[]; hasMore: boolean }>('history', { room: roomId, before: messages[0].created_at });
      keepOffset.current = list.current ? list.current.scrollHeight - list.current.scrollTop : null;
      setMessages((prev) => [...r.messages.filter((m) => !prev.some((p) => p.id === m.id)), ...prev]);
      setHasMore(r.hasMore);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const r = await emitAck<{ message: ChatMessage }>('send', { room: roomId, body });
      setMessages((prev) => (prev.some((x) => x.id === r.message.id) ? prev : [...prev, r.message]));
      setText('');
      stick.current = true;
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const remove = async (id: string) => {
    setMenu(null);
    if (!window.confirm('Delete this message for everyone?')) return;
    try { await emitAck('delete', { id }); } catch (e) { setError((e as Error).message); }
  };
  const mute = async (m: ChatMessage, hours: number) => {
    setMenu(null);
    if (!window.confirm(`Mute ${m.author_name} for ${hours === 24 ? '24 hours' : '7 days'}?`)) return;
    try { await emitAck('mute', { userId: m.user_id, hours }); setError(null); } catch (e) { setError((e as Error).message); }
  };

  const { title, subtitle } = roomTitle(roomId, (id) => meta?.chapters.get(id)?.title);
  const staff = me?.role === 'admin' || me?.role === 'superadmin';
  const muted = me?.muted_until && new Date(me.muted_until) > new Date();
  const chapterId = roomId.startsWith('ch-') ? roomId.slice(3) : null;

  const header = (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-2">
        <button onClick={() => (window.history.length > 1 ? nav(-1) : nav('/chat'))} className="rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Back">
          <ChevronLeft />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="truncate text-xs text-muted">
            {state === 'ready' ? `${online} online` : state === 'connecting' ? 'Connecting…' : 'Offline'}{subtitle ? ` · ${subtitle}` : ''}
          </p>
        </div>
        {chapterId && <LinkButton to={`/read/${chapterId}`} variant="ghost" className="px-2 py-1.5">Read</LinkButton>}
        <Link to="/chat" className="rounded-lg px-2 py-1.5 text-sm font-semibold text-brand hover:bg-surface-2">Rooms</Link>
      </div>
    </header>
  );

  if (!chatAvailable) {
    return <div className="mx-auto max-w-2xl">{header}<Empty title="Chat isn't available in demo mode" icon={<ChatIcon size={32} />} /></div>;
  }

  if (isTodayQuiz && meta && !meta.quizDone && !spoilerOk) {
    return (
      <div className="mx-auto max-w-2xl">
        {header}
        <Empty title="This room discusses today's answers" icon={<ChatIcon size={32} />}>
          Take today's quiz first so nothing is spoiled. Only your first attempt counts.
        </Empty>
        <div className="flex justify-center gap-2">
          <LinkButton to="/quiz/play?mode=daily">Take today's quiz</LinkButton>
          <Button variant="secondary" onClick={() => setSpoilerOk(true)}>Enter anyway</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col">
      {header}

      <div ref={list} className="flex-1 overflow-y-auto px-3 py-3"
        onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
        onClick={() => setMenu(null)}>
        {state === 'connecting' && !messages.length && <Spinner label="Joining room…" />}
        {hasMore && (
          <div className="mb-3 text-center"><Button variant="ghost" onClick={loadOlder}>Load older messages</Button></div>
        )}
        {state === 'ready' && !messages.length && (
          <Empty title="No messages yet" icon={<ChatIcon size={32} />}>Start the discussion: ask a doubt or share a tip.</Empty>
        )}
        <ul className="space-y-1">
          {messages.map((m, i) => {
            const mine = m.user_id === me?.id;
            const prev = messages[i - 1];
            const newDay = !prev || day(prev.created_at) !== day(m.created_at);
            const grouped = !newDay && prev?.user_id === m.user_id && Date.parse(m.created_at) - Date.parse(prev.created_at) < 5 * 60_000;
            const canDelete = mine || staff;
            const canMute = staff && !mine && m.author_role !== 'superadmin' && (me?.role === 'superadmin' || m.author_role !== 'admin');
            return (
              <li key={m.id}>
                {newDay && <p className="my-3 text-center text-xs font-medium text-muted">{day(m.created_at)}</p>}
                <div className={cx('group flex', mine ? 'justify-end' : 'justify-start', !grouped && 'mt-2')}>
                  <div className="relative max-w-[85%]">
                    {!grouped && !mine && (
                      <p className="mb-0.5 flex items-center gap-1.5 px-1 text-xs font-semibold text-muted">
                        {m.author_name}
                        {ROLE_LABEL[m.author_role] && <Pill tone="brand">{ROLE_LABEL[m.author_role]}</Pill>}
                      </p>
                    )}
                    <div
                      onClick={(e) => { if (canDelete) { e.stopPropagation(); setMenu(menu === m.id ? null : m.id); } }}
                      className={cx('whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] leading-snug',
                        mine ? 'rounded-br-md bg-brand text-brand-ink' : 'rounded-bl-md border border-line bg-surface',
                        canDelete && 'cursor-pointer')}>
                      {m.body}
                      <span className={cx('ml-2 inline-block translate-y-0.5 text-[10px]', mine ? 'opacity-75' : 'text-muted')}>{time(m.created_at)}</span>
                    </div>
                    {menu === m.id && (
                      <div className={cx('absolute z-10 mt-1 flex gap-1 rounded-xl border border-line bg-surface p-1 shadow-lg', mine ? 'right-0' : 'left-0')}
                        onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => remove(m.id)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-bad hover:bg-bad-soft">
                          <TrashIcon size={16} /> Delete
                        </button>
                        {canMute && (
                          <>
                            <button onClick={() => mute(m, 24)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-surface-2"><MuteIcon size={16} /> Mute 24h</button>
                            <button onClick={() => mute(m, 168)} className="rounded-lg px-2.5 py-1.5 text-sm hover:bg-surface-2">7 days</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-t border-line bg-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        {error && <div className="mb-2"><ErrorNote>{error}</ErrorNote></div>}
        {muted ? (
          <p className="py-2 text-center text-sm text-muted">You are muted until {new Date(me!.muted_until!).toLocaleString('en-IN')}.</p>
        ) : (
          <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX))}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder={state === 'ready' ? 'Write a message…' : 'Connecting…'}
              disabled={state !== 'ready'}
              aria-label="Message"
              className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[15px] focus:border-brand focus:outline-none"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
            <Button type="submit" disabled={!text.trim() || sending || state !== 'ready'} className="h-[42px] px-3" aria-label="Send">
              <SendIcon size={18} />
            </Button>
          </form>
        )}
        {text.length > MAX * 0.8 && <p className="mt-1 text-right text-xs text-muted">{text.length}/{MAX}</p>}
      </div>
    </div>
  );
}
