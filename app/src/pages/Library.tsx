import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { getCatalog } from '../lib/content';
import { useAsync } from '../lib/hooks';
import { UNITS } from '../shared/syllabus';
import { GROUPS, bookFitsGroup, groupByCode, type GroupCode } from '../shared/groups';
import BookCover from '../components/BookCover';
import { Card, ErrorNote, PageTitle, Spinner, cx } from '../components/ui';
import { ChevronRight } from '../components/icons';

type Filter = GroupCode | 'all';
const FILTER_KEY = 'library-group';
const savedFilter = (): Filter | null => {
  try { return (sessionStorage.getItem(FILTER_KEY) as Filter | null) ?? null; } catch { return null; }
};

export default function Library() {
  const { profile } = useAuth();
  const myGroup = groupByCode(profile?.target_group)?.code;
  const [filter, setFilterState] = useState<Filter>(() => savedFilter() ?? myGroup ?? 'all');
  const [tab, setTab] = useState<'books' | 'units'>('books');
  const { data: catalog, loading, error } = useAsync(getCatalog, []);

  const setFilter = (f: Filter) => {
    setFilterState(f);
    try { sessionStorage.setItem(FILTER_KEY, f); } catch { /* ignore */ }
  };

  if (loading) return <Spinner />;
  if (error || !catalog) return <ErrorNote>{error ?? 'Library unavailable'}</ErrorNote>;

  const books = catalog.books.filter((b) => filter === 'all' || bookFitsGroup(b, filter));
  const chapters = books.flatMap((b) => b.chapters.filter((c) => c.relevant !== false));
  const countFor = (code: string) => chapters.filter((c) => c.units.includes(code)).length;
  const group = filter === 'all' ? null : groupByCode(filter);

  return (
    <div>
      <PageTitle title="Library" subtitle="Tamil Nadu SCERT textbooks, Classes 6 to 12" />

      {/* Group filter */}
      <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1">
        {(['all', ...GROUPS.map((g) => g.code)] as Filter[]).map((f) => {
          const g = f === 'all' ? null : groupByCode(f)!;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={cx('shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold',
                filter === f ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-muted hover:text-ink')}>
              {g ? g.label : 'All books'}{f === myGroup && <span className="ml-1.5 text-[11px] font-medium opacity-80">· yours</span>}
            </button>
          );
        })}
      </div>
      <p className="mb-4 text-sm text-muted">
        {group ? <><b className="text-ink">{group.label}</b> · {group.level}. {group.note}</> : 'All books for every TNPSC group. The same SCERT books are used for Groups 1, 2 and 4; what changes is the depth.'}
      </p>

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
                    <p className="mt-0.5 text-xs text-muted">
                      {filter === 'g1' && `${u.weight} of 200 Group 1 Prelims questions · `}
                      {n ? `${n} chapters` : 'practice questions only'}
                    </p>
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
