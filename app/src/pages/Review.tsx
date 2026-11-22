import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { chapterIndex } from '../lib/content';
import { useAsync } from '../lib/hooks';
import type { Question } from '../lib/types';
import { unitByCode, UNITS } from '../shared/syllabus';
import { Button, Card, Empty, ErrorNote, PageTitle, Pill, Spinner, cx, inputCls } from '../components/ui';

type Status = 'draft' | 'approved' | 'rejected';
const LETTERS = ['A', 'B', 'C', 'D'];

export default function Review() {
  const [status, setStatus] = useState<Status>('draft');
  const [unit, setUnit] = useState('');
  const { data, loading, error, reload } = useAsync(async () => {
    const [questions, chapters] = await Promise.all([
      api.listForReview({ status, unit: unit || undefined, limit: 30 }),
      chapterIndex().catch(() => new Map()),
    ]);
    return { questions, chapters };
  }, [status, unit]);
  const [done, setDone] = useState<Set<string>>(new Set());

  return (
    <div>
      <PageTitle title="Review questions" subtitle="Nothing reaches students until it's approved here" />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="flex rounded-xl bg-surface-2 p-1 text-sm font-semibold">
          {(['draft', 'approved', 'rejected'] as const).map((s) => (
            <button key={s} onClick={() => { setStatus(s); setDone(new Set()); }}
              className={cx('rounded-lg px-3 py-1.5 capitalize', status === s ? 'bg-surface text-ink shadow-sm' : 'text-muted')}>{s}</button>
          ))}
        </div>
        <select className={cx(inputCls, 'w-auto py-2')} value={unit} onChange={(e) => { setUnit(e.target.value); setDone(new Set()); }}>
          <option value="">All units</option>
          {UNITS.map((u) => <option key={u.code} value={u.code}>{u.code}: {u.short}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : error ? <ErrorNote>{error}</ErrorNote> : !data?.questions.length ? (
        <Card><Empty title={`No ${status} questions`}>{status === 'draft' ? 'Run the question pipeline to add new drafts.' : ''}</Empty></Card>
      ) : (
        <div className="space-y-3">
          {data.questions.filter((q) => !done.has(q.id)).map((q) => (
            <ReviewCard key={q.id} q={q} chapter={q.chapter_id ? data.chapters.get(q.chapter_id) : undefined}
              onDone={() => setDone((s) => new Set(s).add(q.id))} />
          ))}
          {data.questions.every((q) => done.has(q.id)) && (
            <div className="text-center"><Button variant="secondary" onClick={() => { setDone(new Set()); reload(); }}>Load more</Button></div>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ q, chapter, onDone }: { q: Question; chapter?: { title: string; std: number; bookTitle: string }; onDone: () => void }) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(q);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function act(next: 'approved' | 'rejected') {
    setBusy(true);
    setErr(null);
    try {
      const edits = edit ? { question: draft.question, options: draft.options, answer_index: draft.answer_index, explanation: draft.explanation, unit_code: draft.unit_code } : undefined;
      await api.reviewQuestion(q.id, next, edits);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <Pill tone="brand">{unitByCode(q.unit_code)?.short ?? q.unit_code}</Pill>
        <Pill>{q.source}</Pill>
        {q.difficulty ? <Pill>Difficulty {q.difficulty}</Pill> : null}
        {chapter && (
          <Link to={`/read/${q.chapter_id}`} target="_blank" className="text-brand underline">
            Class {chapter.std} · {chapter.title}{q.source_page ? ` · p.${q.source_page}` : ''}
          </Link>
        )}
      </div>

      {edit ? (
        <div className="space-y-2">
          <textarea className={inputCls} rows={3} value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} />
          {draft.options.map((o, i) => (
            <label key={i} className="flex items-center gap-2">
              <input type="radio" name={`ans-${q.id}`} checked={draft.answer_index === i} onChange={() => setDraft({ ...draft, answer_index: i })} />
              <span className="w-5 text-sm font-semibold">{LETTERS[i]}</span>
              <input className={inputCls} value={o} onChange={(e) => setDraft({ ...draft, options: draft.options.map((x, j) => (j === i ? e.target.value : x)) })} />
            </label>
          ))}
          <textarea className={inputCls} rows={2} placeholder="Explanation" value={draft.explanation ?? ''} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })} />
          <select className={inputCls} value={draft.unit_code} onChange={(e) => setDraft({ ...draft, unit_code: e.target.value })}>
            {UNITS.map((u) => <option key={u.code} value={u.code}>{u.code}: {u.title}</option>)}
          </select>
        </div>
      ) : (
        <>
          <p className="mb-2 whitespace-pre-line font-medium leading-snug">{q.question}</p>
          <ul className="mb-2 space-y-1 text-sm">
            {q.options.map((o, i) => (
              <li key={i} className={i === q.answer_index ? 'font-semibold text-good' : ''}>{LETTERS[i]}. {o}{i === q.answer_index ? ' ✓' : ''}</li>
            ))}
          </ul>
          {q.explanation && <p className="text-sm text-muted">{q.explanation}</p>}
        </>
      )}

      {err && <div className="mt-2"><ErrorNote>{err}</ErrorNote></div>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => act('approved')}>{edit ? 'Save & approve' : 'Approve'}</Button>
        <Button variant="secondary" disabled={busy} onClick={() => setEdit((e) => !e)}>{edit ? 'Cancel edit' : 'Edit'}</Button>
        <Button variant="danger" disabled={busy} onClick={() => act('rejected')}>Reject</Button>
      </div>
    </Card>
  );
}
