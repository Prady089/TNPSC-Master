import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useAsync } from '../lib/hooks';
import type { Member, Role } from '../lib/types';
import { fmtEventDate, type ExamEvent } from '../shared/exam';
import ExamTimeline from '../components/ExamTimeline';
import { Button, Card, ErrorNote, PageTitle, Pill, Spinner, cx, inputBase, inputCls } from '../components/ui';
import { CalendarIcon, ChevronRight, ShieldIcon, UsersIcon } from '../components/icons';

const ROLES: { value: Role; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'admin', label: 'Moderator (review + chat)' },
  { value: 'superadmin', label: 'Super admin' },
];

export default function Admin() {
  const [tab, setTab] = useState<'dates' | 'members'>('dates');
  const [stamp, setStamp] = useState(0); // remounts the timeline preview after a save
  return (
    <div className="space-y-4">
      <PageTitle title="Admin" subtitle="Super admin tools" />
      <Link to="/admin/review" className="block">
        <Card className="flex items-center gap-3 hover:border-brand">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><ShieldIcon size={20} /></div>
          <div className="flex-1"><p className="font-semibold">Review questions</p><p className="text-sm text-muted">Approve, edit or reject AI drafts</p></div>
          <ChevronRight className="text-muted" />
        </Card>
      </Link>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-1">
        {([['dates', 'Exam dates', CalendarIcon], ['members', 'Members', UsersIcon]] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cx('flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold', tab === k ? 'bg-surface text-ink shadow-sm' : 'text-muted')}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>
      {tab === 'dates' ? (
        <>
          <ExamTimeline key={stamp} />
          <ExamDates onSaved={() => setStamp((s) => s + 1)} />
        </>
      ) : <Members />}
    </div>
  );
}

function ExamDates({ onSaved }: { onSaved: () => void }) {
  const { data, loading, error, reload } = useAsync(() => api.getExamEvents(), []);
  const [rows, setRows] = useState<ExamEvent[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (loading) return <Spinner />;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  const list = rows ?? data ?? [];
  const edit = (i: number, patch: Partial<ExamEvent>) => setRows(list.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      for (const r of list) {
        if (!r.code || !r.label || !/^\d{4}-\d{2}-\d{2}$/.test(r.event_date)) throw new Error('Every stage needs a name and a date.');
      }
      const removed = (data ?? []).filter((d) => !list.some((r) => r.code === d.code));
      for (const r of removed) await api.deleteExamEvent(r.code);
      for (const [i, r] of list.entries()) await api.saveExamEvent({ ...r, sort: i + 1 });
      setRows(null);
      reload();
      onSaved();
      setMsg({ ok: true, text: 'Saved. Everyone sees the new dates now.' });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <p className="font-semibold">Exam stages</p>
      <p className="mb-4 text-sm text-muted">Untick "approx." once TNPSC announces the exact date.</p>
      <div className="space-y-3">
        {list.map((r, i) => (
          <div key={r.code} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_10rem_auto_auto] sm:items-center">
            <input className={inputCls} value={r.label} onChange={(e) => edit(i, { label: e.target.value })} aria-label="Stage name" />
            <button onClick={() => setRows(list.filter((_, j) => j !== i))} className="rounded-lg px-2 text-sm text-bad hover:bg-bad-soft sm:order-last" aria-label={`Remove ${r.label}`}>Remove</button>
            <input type="date" className={inputCls} value={r.event_date} onChange={(e) => edit(i, { event_date: e.target.value })} aria-label="Date" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={r.is_approx} onChange={(e) => edit(i, { is_approx: e.target.checked })} className="h-4 w-4 accent-[var(--brand)]" />
              approx.
            </label>
            <p className="col-span-2 text-xs text-muted sm:hidden">Shows as {fmtEventDate(r)}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setRows([...list, { code: `stage-${Date.now().toString(36)}`, label: 'New stage', event_date: new Date().toISOString().slice(0, 10), is_approx: true, sort: list.length + 1 }])}>
          Add stage
        </Button>
        <Button onClick={save} disabled={busy || !rows}>{busy ? 'Saving…' : 'Save dates'}</Button>
      </div>
      {msg && <p className={cx('mt-3 text-sm', msg.ok ? 'text-good' : 'text-bad')}>{msg.text}</p>}
    </Card>
  );
}

function Members() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.listMembers(), []);
  const [q, setQ] = useState('');
  const [err, setErr] = useState<string | null>(null);
  if (loading) return <Spinner />;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  const members = (data ?? []).filter((m) => !q || `${m.full_name} ${m.email} ${m.district}`.toLowerCase().includes(q.toLowerCase()));

  const setRole = async (m: Member, role: Role) => {
    if (!window.confirm(`Make ${m.full_name ?? m.email} a ${ROLES.find((r) => r.value === role)?.label}?`)) return;
    try { await api.setMemberRole(m.id, role); setErr(null); reload(); } catch (e) { setErr((e as Error).message); }
  };

  return (
    <Card className="p-0">
      <div className="border-b border-line p-4">
        <p className="font-semibold">{data?.length ?? 0} members</p>
        <input className={cx(inputCls, 'mt-3')} placeholder="Search name, email or district" value={q} onChange={(e) => setQ(e.target.value)} />
        {err && <div className="mt-3"><ErrorNote>{err}</ErrorNote></div>}
      </div>
      <ul className="divide-y divide-line">
        {members.map((m) => {
          const muted = m.chat_muted_until && new Date(m.chat_muted_until) > new Date();
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{m.full_name ?? '(no name yet)'} {m.id === user?.id && <span className="text-xs font-normal text-muted">(you)</span>}</p>
                <p className="truncate text-xs text-muted">{m.email} · {m.district ?? 'district not set'} · joined {new Date(m.created_at).toLocaleDateString('en-IN')}</p>
                {muted && <Pill tone="bad">Muted until {new Date(m.chat_muted_until!).toLocaleDateString('en-IN')}</Pill>}
              </div>
              <select className={cx(inputBase, 'py-1.5')} value={m.role ?? 'student'} disabled={m.id === user?.id}
                onChange={(e) => setRole(m, e.target.value as Role)} aria-label={`Role for ${m.full_name ?? m.email}`}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
