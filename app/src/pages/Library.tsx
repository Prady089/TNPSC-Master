import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getCatalog } from '../lib/content';
import { useAsync } from '../lib/hooks';
import { UNITS } from '../shared/syllabus';
import BookCover from '../components/BookCover';
import { Card, ErrorNote, PageTitle, Spinner, cx } from '../components/ui';
import { ChevronRight } from '../components/icons';

export default function Library() {
  const [tab, setTab] = useState<'books' | 'units'>('books');
  const { data: catalog, loading, error } = useAsync(getCatalog, []);

  if (loading) return <Spinner />;
  if (error || !catalog) return <ErrorNote>{error ?? 'Library unavailable'}</ErrorNote>;

  const books = catalog.books;
  const chapters = books.flatMap((b) => b.chapters.filter((c) => c.relevant !== false));
  const countFor = (code: string) => chapters.filter((c) => c.units.includes(code)).length;

  return (
    <div>
      <PageTitle title="Library" subtitle="Tamil Nadu SCERT textbooks, Classes 6 to 12" />

      <div className="mb-4 grid grid-cols-2 rounded-xl bg-surface-2 p-1 text-sm font-semibold">
        {(['books', 'units'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx('rounded-lg py-2', tab === t ? 'bg-surface text-ink shadow-sm' : 'text-muted')}>
            {t === 'books' ? 'Books' : 'By syllabus unit'}
          </button>
        ))}
      </div>

      {tab === 'books' ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
          {books.map((b) => (
            <Link key={b.id} to={`/learn/book/${b.id}`} className="group block">
              <BookCover book={b} />
              <p className="mt-2 text-sm font-semibold leading-snug">Class {b.std} · {b.title}</p>
              <p className="text-xs text-muted">{b.chapters.length} chapters</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {UNITS.filter((u) => u.code !== 'CA').map((u) => {
            const n = countFor(u.code);
            return (
              <Link key={u.code} to={`/learn/unit/${u.code}`} className="block">
                <Card className="flex items-center gap-3 hover:border-brand">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-sm font-bold text-brand">{u.code}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{u.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{n ? `${n} chapters` : 'practice questions only'}</p>
                  </div>
                  <ChevronRight className="shrink-0 text-muted" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
