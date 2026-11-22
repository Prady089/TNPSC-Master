import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { chapterIndex } from '../lib/content';
import { chatAvailable, chatSocket, emitAck, quizRoom, roomTitle, STATIC_ROOMS, type RoomInfo } from '../lib/chat';
import { useAsync } from '../lib/hooks';
import { istDate } from '../shared/syllabus';
import { Card, Empty, PageTitle, Pill } from '../components/ui';
import { ChatIcon, ChevronRight } from '../components/icons';

interface Activity { room_id: string; last_at: string; messages: number }

const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
};

export default function Chat() {
  const today = istDate();
  const [activity, setActivity] = useState<Activity[]>([]);
  const [online, setOnline] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const { data: chapters } = useAsync(() => chapterIndex().catch(() => new Map()), []);

  useEffect(() => {
    if (!chatAvailable) return;
    const s = chatSocket();
    const load = () => emitAck<{ rooms: Activity[]; online: Record<string, number> }>('rooms', {})
      .then((r) => { setActivity(r.rooms); setOnline(r.online); setStatus('online'); })
      .catch(() => setStatus('offline'));
    const onErr = () => setStatus('offline');
    if (s.connected) load();
    s.on('connect', load);
    s.on('connect_error', onErr);
    const t = setInterval(() => s.connected && load(), 30_000);
    return () => { s.off('connect', load); s.off('connect_error', onErr); clearInterval(t); };
  }, []);

  if (!chatAvailable) {
    return (
      <div>
        <PageTitle title="Discuss" />
        <Card><Empty title="Chat isn't switched on here" icon={<ChatIcon size={32} />}>
          Discussion rooms work in the live app with a signed-in account. They aren't available in demo mode.
        </Empty></Card>
      </div>
    );
  }

  const act = new Map(activity.map((a) => [a.room_id, a]));
  const chapterTitle = (id: string) => chapters?.get(id)?.title;
  const todayQuiz: RoomInfo = { id: quizRoom(today), ...roomTitle(quizRoom(today)), group: 'Lobby' };
  const staticIds = new Set([...STATIC_ROOMS.map((r) => r.id), todayQuiz.id]);
  const busy = activity.filter((a) => !staticIds.has(a.room_id)).slice(0, 12);

  const row = ({ id, title, subtitle }: { id: string; title: string; subtitle: string }) => {
    const a = act.get(id);
    const n = online[id] ?? 0;
    return (
      <Link key={id} to={`/chat/${id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{title}</p>
          <p className="truncate text-sm text-muted">{subtitle}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted">
          {a && <span>{a.messages} msgs · {ago(a.last_at)}</span>}
          {n > 0 && <Pill tone="good">{n} here</Pill>}
        </div>
        <ChevronRight size={18} className="text-muted" />
      </Link>
    );
  };

  const groups: RoomInfo['group'][] = ['Lobby', 'Units', 'Exam stages'];

  return (
    <div className="space-y-4">
      <PageTitle title="Discuss" subtitle="Talk through topics, doubts and today's quiz with other aspirants"
        action={<Pill tone={status === 'online' ? 'good' : status === 'offline' ? 'bad' : 'muted'}>{status}</Pill>} />

      {groups.map((g) => (
        <section key={g}>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted">{g}</p>
          <Card className="divide-y divide-line overflow-hidden p-0">
            {g === 'Lobby' && row(todayQuiz)}
            {STATIC_ROOMS.filter((r) => r.group === g).map(row)}
          </Card>
        </section>
      ))}

      {busy.length > 0 && (
        <section>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted">Active chapter & quiz rooms</p>
          <Card className="divide-y divide-line overflow-hidden p-0">
            {busy.map((a) => row({ id: a.room_id, ...roomTitle(a.room_id, chapterTitle) }))}
          </Card>
        </section>
      )}

      <p className="px-1 text-xs text-muted">Be kind and stay on topic. Don't share phone numbers or paid material. Moderators can remove messages and mute members.</p>
    </div>
  );
}
