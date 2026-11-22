import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getCatalog } from '../lib/content';
import { useAsync } from '../lib/hooks';
import BookCover from '../components/BookCover';
import SyllabusView from '../components/SyllabusView';
import { ErrorNote, PageTitle, Spinner, cx } from '../components/ui';

type Tab = 'syllabus' | 'books';
const TAB_KEY = 'library-tab';

export default function Library() {
  const [tab, setTabState] = useState<Tab>(() => {
    try { return (sessionStorage.getItem(TAB_KEY) as Tab | null) ?? 'syllabus'; } catch { return 'syllabus'; }
  });
  const setTab = (t: Tab) => {
    setTabState(t);
    try { sessionStorage.setItem(TAB_KEY, t); } catch { /* ignore */ }
  };

  return (
    <div>
      <PageTitle title="Library" subtitle="TNPSC syllabus and Tamil Nadu SCERT textbooks, Classes 6 to 12" />

      <div className="mb-4 grid grid-cols-2 rounded-xl bg-surface-2 p-1 text-sm font-semibold">
        {(['syllabus', 'books'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx('rounded-lg py-2', tab === t ? 'bg-surface text-ink shadow-sm' : 'text-muted')}>
            {t === 'syllabus' ? 'Syllabus' : 'Books'}
          </button>
        ))}
      </div>

      {tab === 'syllabus' ? <SyllabusView /> : <Books />}
    </div>
  );
}

function Books() {
  const { data: catalog, loading, error } = useAsync(getCatalog, []);
  if (loading) return <Spinner />;
  if (error || !catalog) return <ErrorNote>{error ?? 'Library unavailable'}</ErrorNote>;
  const books = [...catalog.books].sort((a, b) => a.std - b.std);
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
      {books.map((b) => (
        <Link key={b.id} to={`/learn/book/${b.id}`} className="group block">
          <BookCover book={b} />
          <p className="mt-2 text-sm font-semibold leading-snug">Class {b.std} · {b.title}</p>
          <p className="text-xs text-muted">{b.chapters.length} chapters</p>
        </Link>
      ))}
    </div>
  );
}
