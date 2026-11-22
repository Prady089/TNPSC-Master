import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getCatalog } from '../lib/content';
import { useAsync } from '../lib/hooks';
import { UNITS } from '../shared/syllabus';
import { Card, ErrorNote, PageTitle, Pill, Spinner, cx } from '../components/ui';
import { ChevronRight } from '../components/icons';

export default function Learn() {
  const [tab, setTab] = useState<'units' | 'books'>('units');
  const { data: catalog, loading, error } = useAsync(getCatalog, []);

  if (loading) return <Spinner />;
  if (error || !catalog) return <ErrorNote>{error ?? 'Library unavailable'}</ErrorNote>;

  const chapters = catalog.books.flatMap((b) => b.chapters.filter((c) => c.relevant !== false));
  const countFor = (code: string) => chapters.filter((c) => c.units.includes(code)).length;

  return (
    <div>
      <PageTitle title="Learn" subtitle="Tamil Nadu SCERT textbooks, organised by the Group 1 syllabus" />
      <div className="mb-4 grid grid-cols-2 rounded-xl bg-surface-2 p-1 text-sm font-semibold">
        {(['units', 'books'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx('rounded-lg py-2', tab === t ? 'bg-surface text-ink shadow-sm' : 'text-muted')}>
            {t === 'units' ? 'By syllabus unit' : 'By book'}
          </button>
        ))}
      </div>

      {tab === 'units' ? (
        <div className="space-y-2.5">
          {UNITS.filter((u) => u.code !== 'CA').map((u) => {
            const n = countFor(u.code);
            return (
              <Link key={u.code} to={`/learn/unit/${u.code}`} className="block">
                <Card className="flex items-center gap-3 hover:border-brand">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-sm font-bold text-brand">{u.code}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{u.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {u.weight} of 200 Prelims questions · {n ? `${n} chapters` : 'practice questions only'}
                    </p>
                  </div>
                  <ChevronRight className="shrink-0 text-muted" />
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {catalog.books.map((b) => (
            <Link key={b.id} to={`/learn/book/${b.id}`} className="block">
              <Card className="flex h-full items-center gap-3 hover:border-brand">
                <div className="flex h-14 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <span className="text-[10px] font-semibold uppercase">Class</span>
                  <span className="text-lg font-bold leading-none">{b.std}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{b.title}</p>
                  <div className="mt-1 flex gap-2"><Pill>{b.chapters.length} chapters</Pill><Pill tone="brand">{b.source}</Pill></div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
