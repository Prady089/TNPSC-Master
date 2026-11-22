import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { pct, useAsync } from '../lib/hooks';
import { DAILY_SIZE, istDate, unitByCode, UNITS } from '../shared/syllabus';
import { Card, LinkButton, PageTitle, Pill, Spinner, cx, inputBase } from '../components/ui';
import { BookIcon, ChevronRight, PrintIcon, RefreshIcon } from '../components/icons';

const MODE_LABEL: Record<string, string> = { daily: 'Daily quiz', unit: 'Unit practice', chapter: 'Chapter practice', revise: 'Revision', mock: 'Mock test' };

export default function QuizHub() {
  const [count, setCount] = useState(10);
  const [printUnit, setPrintUnit] = useState('daily');
  const [printCount, setPrintCount] = useState(25);
  const today = istDate();
  const { data, loading } = useAsync(async () => {
    const [attempts, stats, wrong, counts] = await Promise.all([api.getAttempts(15), api.getUnitStats(), api.getWrongQuestionIds(50), api.getUnitQuestionCounts().catch(() => ({} as Record<string, number>))]);
    return { attempts, stats, wrong, counts };
  }, []);

  if (loading || !data) return <Spinner />;
  const daily = data.attempts.find((a) => a.mode === 'daily' && a.quiz_date === today);
  const statFor = (code: string) => data.stats.find((s) => s.unit_code === code);

  return (
    <div className="space-y-5">
      <PageTitle title="Quiz" subtitle="Prelims-style MCQs with instant explanations" />

      <Card className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Daily quiz · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
          <p className="text-sm text-muted">{daily ? `Scored ${daily.correct}/${daily.total}. A new set arrives tomorrow.` : `${DAILY_SIZE} questions across all units, plus current affairs`}</p>
        </div>
        <LinkButton to={daily ? '/quiz/play?mode=daily&review=1' : '/quiz/play?mode=daily'} variant={daily ? 'secondary' : 'primary'} className="shrink-0">
          {daily ? 'Review' : 'Start'}
        </LinkButton>
      </Card>

      <Link to="/bookback/I" className="block">
        <Card className="flex items-center gap-3 hover:border-brand">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><BookIcon size={20} /></div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Book back questions</p>
            <p className="text-sm text-muted">Textbook exercises with answers, tagged with past TNPSC papers. Q&A, online quiz and pen test.</p>
          </div>
          <ChevronRight className="shrink-0 text-muted" />
        </Card>
      </Link>

      {data.wrong.length > 0 && (
        <Link to={`/quiz/play?mode=revise&count=20`} className="block">
          <Card className="flex items-center gap-3 hover:border-brand">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><RefreshIcon size={20} /></div>
            <div className="flex-1">
              <p className="font-semibold">Revise your mistakes</p>
              <p className="text-sm text-muted">{data.wrong.length} questions you got wrong</p>
            </div>
            <ChevronRight className="text-muted" />
          </Card>
        </Link>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Practise by unit</h2>
          <div className="flex rounded-lg bg-surface-2 p-0.5 text-xs font-semibold">
            {[10, 20, 30].map((n) => (
              <button key={n} onClick={() => setCount(n)} className={cx('rounded-md px-2.5 py-1', count === n ? 'bg-surface text-ink shadow-sm' : 'text-muted')}>{n} Qs</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {UNITS.map((u) => {
            const s = statFor(u.code);
            const n = data.counts[u.code] ?? 0;
            if (!n) {
              return (
                <Card key={u.code} className="h-full border-dashed bg-transparent p-3.5 opacity-70">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-snug">{u.short}</p>
                    <Pill>Coming soon</Pill>
                  </div>
                  <p className="mt-1 text-xs text-muted">{u.weight ? `${u.weight} Qs in Prelims · ` : ''}questions being prepared</p>
                </Card>
              );
            }
            return (
              <Link key={u.code} to={`/quiz/play?mode=unit&unit=${u.code}&count=${Math.min(count, n)}`} className="block">
                <Card className="h-full p-3.5 hover:border-brand">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-snug">{u.short}</p>
                    <Pill tone="brand">{u.code}</Pill>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {n} questions{u.weight ? ` · ${u.weight} Qs in Prelims` : ''}
                    {s ? ` · ${pct(s.correct, s.answered)}% of ${s.answered} correct` : ''}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <Card>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><PrintIcon size={20} /></div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Pen & paper</p>
            <p className="text-sm text-muted">Download a question paper with an OMR answer sheet and answer key, then practise offline.</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <select className={cx(inputBase, 'min-w-0 flex-1')} value={printUnit} onChange={(e) => setPrintUnit(e.target.value)} aria-label="What to print">
            <option value="daily">Today's daily quiz</option>
            {UNITS.filter((u) => data.counts[u.code]).map((u) => <option key={u.code} value={u.code}>{u.short} ({data.counts[u.code]} Qs)</option>)}
          </select>
          {printUnit !== 'daily' && (
            <select className={inputBase} value={printCount} onChange={(e) => setPrintCount(Number(e.target.value))} aria-label="Number of questions">
              {[25, 50, 100].map((n) => <option key={n} value={n}>{n} questions</option>)}
            </select>
          )}
          <LinkButton to={printUnit === 'daily' ? '/quiz/print?mode=daily' : `/quiz/print?mode=unit&unit=${printUnit}&count=${printCount}`}>
            <PrintIcon size={18} /> Download
          </LinkButton>
        </div>
      </Card>

      <Card className="border-dashed bg-transparent">
        <p className="font-semibold">Full mock test <Pill tone="accent">Coming soon</Pill></p>
        <p className="mt-1 text-sm text-muted">200 questions in 3 hours, scored like the real Prelims. It will open once the question bank is large enough.</p>
      </Card>

      {data.attempts.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Recent attempts</h2>
          <Card className="divide-y divide-line p-0">
            {data.attempts.slice(0, 8).map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <div className="flex-1">
                  <p className="font-medium">{MODE_LABEL[a.mode]}{a.unit_code ? ` · ${unitByCode(a.unit_code)?.short}` : ''}</p>
                  <p className="text-xs text-muted">{new Date(a.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
                </div>
                <span className={cx('font-semibold', a.correct / a.total >= 0.6 ? 'text-good' : 'text-accent')}>{a.correct}/{a.total}</span>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
