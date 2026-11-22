import { Link, useParams } from 'react-router-dom';
import { chapterIndex } from '../lib/content';
import { getBookBackIndex } from '../lib/bookback';
import { useAsync } from '../lib/hooks';
import { Card, ErrorNote, PageTitle, Pill, Spinner, cx } from '../components/ui';
import { ChevronRight } from '../components/icons';

interface Topic { no: number; text: string; chapters: string[] }
interface Section { title: string | null; topics: Topic[] }
interface Unit { code: string; title: string; sections: Section[] }

/** Book back questions for one syllabus unit: every topic with its chapters and question counts. */
export default function BookBack() {
  const { unit = 'I' } = useParams();
  const { data, loading, error } = useAsync(async () => {
    const [syllabus, index, chapters] = await Promise.all([
      fetch('/content/syllabus.json', { cache: 'no-cache' }).then((r) => r.json() as Promise<{ units: Unit[] }>),
      getBookBackIndex(),
      chapterIndex(),
    ]);
    return { unit: syllabus.units.find((u) => u.code === unit), counts: index.units[unit]?.chapters ?? {}, chapters };
  }, [unit]);

  if (loading) return <Spinner />;
  if (error || !data?.unit) return <ErrorNote>{error ?? 'Unit not found'}</ErrorNote>;
  const { counts, chapters } = data;
  const all = Array.from(new Set(data.unit.sections.flatMap((s) => s.topics.flatMap((t) => t.chapters))));
  const ready = all.filter((id) => counts[id]);
  const total = ready.reduce((n, id) => n + counts[id].n, 0);
  const asked = ready.reduce((n, id) => n + counts[id].pyq, 0);

  return (
    <div>
      <PageTitle title="Book back questions" subtitle={`Unit ${unit} · ${data.unit.title}`} />
      <Card className="mb-4 text-sm">
        <p>
          Every textbook exercise with answers, plus more questions from each chapter. Questions asked in TNPSC papers since 2019 are tagged with the exam and year.
        </p>
        <p className="mt-2 text-muted">
          <b className="text-ink">{ready.length}</b> of {all.length} chapters ready · <b className="text-ink">{total}</b> questions
          {asked ? <> · <b className="text-ink">{asked}</b> asked before</> : null}
        </p>
        <p className="mt-2 text-xs text-muted">Open a chapter to study the Q&A, take it as an online quiz, or print a pen test.</p>
      </Card>

      <div className="space-y-5">
        {data.unit.sections.map((sec, si) => (
          <section key={si}>
            {sec.title && <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-brand">{sec.title}</h2>}
            <div className="space-y-3">
              {sec.topics.filter((t) => t.chapters.length).map((t) => {
                const ids = t.chapters.filter((id) => counts[id]);
                return (
                  <Card key={t.no} className="p-0">
                    <div className="flex items-start gap-3 px-4 pb-2 pt-3.5">
                      <span className="w-5 shrink-0 pt-0.5 text-right text-sm font-semibold tabular-nums text-muted">{t.no}.</span>
                      <p className="min-w-0 flex-1 text-[15px] font-medium leading-snug">{t.text}</p>
                      {ids.length > 1 && (
                        <Link to={`/bookback/qa?ch=${ids.join(',')}`} className="shrink-0 text-xs font-semibold text-brand">All {ids.length} →</Link>
                      )}
                    </div>
                    <ul className="divide-y divide-line border-t border-line">
                      {t.chapters.map((id) => {
                        const c = chapters.get(id);
                        const n = counts[id];
                        if (!c) return null;
                        const body = (
                          <>
                            <span className="w-7 shrink-0 text-xs font-bold tabular-nums text-muted">{c.std}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm">{c.title}</span>
                              <span className="block text-xs text-muted">
                                {n ? `${n.n} questions · ${n.book} book back` : 'Being prepared'}
                              </span>
                            </span>
                            {n?.pyq ? <Pill tone="accent">{n.pyq} asked</Pill> : null}
                            {n ? <ChevronRight size={18} className="shrink-0 text-muted" /> : null}
                          </>
                        );
                        return (
                          <li key={id}>
                            {n ? (
                              <Link to={`/bookback/qa?ch=${id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">{body}</Link>
                            ) : (
                              <div className={cx('flex items-center gap-3 px-4 py-2.5 opacity-55')}>{body}</div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">The number before each chapter is the class (standard).</p>
    </div>
  );
}
