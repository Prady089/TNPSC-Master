import { useState } from 'react';
import { api } from '../lib/api';
import { pct, useAsync } from '../lib/hooks';
import type { PyqPaper } from '../lib/types';
import { Card, Empty, ErrorNote, LinkButton, PageTitle, Pill, Spinner, cx } from '../components/ui';
import { ClockIcon, PrintIcon } from '../components/icons';

const GROUP_LABEL: Record<PyqPaper['grp'], string> = { g1: 'Group 1', g2: 'Group 2 / 2A', g3: 'Group 3', g4: 'Group 4' };
type Filter = PyqPaper['grp'] | 'all';

/** Previous year question papers: official TNPSC papers, newest first. */
export default function Pyq() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data, loading, error } = useAsync(async () => {
    const [papers, attempts] = await Promise.all([api.getPyqPapers(), api.getAttempts(200)]);
    return { papers, attempts };
  }, []);

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote>{error ?? 'Could not load papers'}</ErrorNote>;

  const groups = Array.from(new Set(data.papers.map((p) => p.grp))).sort();
  const papers = data.papers.filter((p) => filter === 'all' || p.grp === filter);
  const years = Array.from(new Set(papers.map((p) => p.year))).sort((a, b) => b - a);
  const best = (id: string) => {
    const tries = data.attempts.filter((a) => a.mode === 'pyq' && a.paper_id === id);
    if (!tries.length) return null;
    return tries.reduce((b, a) => (a.correct / a.total > b.correct / b.total ? a : b));
  };

  return (
    <div>
      <PageTitle title="Previous year questions" subtitle="Official TNPSC question papers with answers, newest first" />

      {groups.length > 1 && (
        <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
          {(['all', ...groups] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cx('shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold',
                filter === f ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-muted hover:text-ink')}>
              {f === 'all' ? 'All exams' : GROUP_LABEL[f]}
            </button>
          ))}
        </div>
      )}

      {!papers.length ? (
        <Empty title="Papers are being added">Previous year papers will appear here soon.</Empty>
      ) : (
        <div className="space-y-6">
          {years.map((y) => (
            <section key={y}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">{y}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {papers.filter((p) => p.year === y).map((p) => {
                  const b = best(p.id);
                  return (
                    <Card key={p.id} className="flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <Pill tone="brand">{GROUP_LABEL[p.grp]}</Pill>
                        {b && <span className="text-xs font-semibold text-good">Best: {pct(b.correct, b.total)}%</span>}
                      </div>
                      <p className="mt-2 font-semibold leading-snug">{p.title}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                        {new Date(p.exam_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        <span>·</span>{p.total} questions<span>·</span><ClockIcon size={13} />{p.duration_min} min
                      </p>
                      <div className="mt-3 flex gap-2">
                        <LinkButton to={`/quiz/play?mode=pyq&paper=${p.id}`} className="flex-1">{b ? 'Try again' : 'Start paper'}</LinkButton>
                        <LinkButton to={`/quiz/print?mode=pyq&paper=${p.id}`} variant="secondary" className="px-3"><PrintIcon size={18} /></LinkButton>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
          <p className="text-xs text-muted">
            Questions and answers are from TNPSC's published question booklets and answer keys (English version).
            Questions TNPSC later withdrew are left out.
          </p>
        </div>
      )}
    </div>
  );
}
