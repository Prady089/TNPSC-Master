import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { chapterIndex } from '../lib/content';
import { useAsync } from '../lib/hooks';
import { CheckIcon, ChevronRight } from './icons';
import { Card, ErrorNote, Spinner, cx } from './ui';

interface Topic { no: number; text: string; chapters: string[]; other: string[] }
interface Section { title: string | null; topics: Topic[] }
interface Unit { code: string; title: string; sections: Section[] }
interface Syllabus { exam: string; stage: string; units: Unit[] }

type Stage = 'prelims' | 'mains';
const OPEN_KEY = 'syllabus-open';

/** The TNPSC syllabus, topic by topic, with the textbook chapters to study for each (from "where to study"). */
export default function SyllabusView() {
  const [stage, setStage] = useState<Stage>('prelims');
  const [open, setOpen] = useState<string | null>(() => {
    try { return sessionStorage.getItem(OPEN_KEY) ?? 'I'; } catch { return 'I'; }
  });
  const { data, loading, error } = useAsync(async () => {
    const [syllabus, chapters, reading] = await Promise.all([
      fetch('/content/syllabus.json', { cache: 'no-cache' }).then((r) => r.json() as Promise<Syllabus>),
      chapterIndex(),
      api.getReading().catch(() => []),
    ]);
    const done = new Set(reading.filter((r) => (r.progress ?? 0) >= 0.9).map((r) => r.chapter_id));
    return { syllabus, chapters, done };
  }, []);

  const toggle = (code: string) => {
    const next = open === code ? null : code;
    setOpen(next);
    try { sessionStorage.setItem(OPEN_KEY, next ?? ''); } catch { /* ignore */ }
  };

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 rounded-xl bg-surface-2 p-1 text-sm font-semibold" role="tablist" aria-label="Exam stage">
        {(['prelims', 'mains'] as const).map((s) => (
          <button key={s} role="tab" aria-selected={stage === s} onClick={() => setStage(s)}
            className={cx('rounded-lg py-2', stage === s ? 'bg-surface text-ink shadow-sm' : 'text-muted')}>
            {s === 'prelims' ? 'Preliminary exam' : 'Main exam'}
          </button>
        ))}
      </div>

      {stage === 'mains' ? (
        <Card className="text-sm text-muted">
          <p className="font-semibold text-ink">Main exam syllabus is coming</p>
          <p className="mt-1">We are mapping the Group I and Group II / II-A Main exam syllabus to the textbooks. Until then, the Preliminary syllabus covers the same textbook chapters.</p>
        </Card>
      ) : loading ? <Spinner /> : error || !data ? <ErrorNote>{error ?? 'Syllabus unavailable'}</ErrorNote> : (
        <>
          <p className="mb-3 text-sm text-muted">
            <b className="text-ink">{data.syllabus.exam} · Preliminary</b> · where to study each topic in the Tamil Nadu SCERT books.
          </p>
          <div className="space-y-2.5">
            {data.syllabus.units.map((u) => {
              const all = u.sections.flatMap((s) => s.topics.flatMap((t) => t.chapters));
              const uniq = Array.from(new Set(all));
              const read = uniq.filter((id) => data.done.has(id)).length;
              const isOpen = open === u.code;
              return (
                <Card key={u.code} className="p-0">
                  <button onClick={() => toggle(u.code)} aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 p-4 text-left">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-sm font-bold text-brand">
                      {u.code === 'B' ? 'B' : u.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted">{u.code === 'B' ? 'Part B' : `Unit ${u.code}`}</span>
                      <span className="block font-semibold leading-snug">{u.title}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {u.sections.reduce((n, s) => n + s.topics.length, 0)} topics · {uniq.length} chapters{read ? ` · ${read} read` : ''}
                      </span>
                    </span>
                    <ChevronRight className={cx('shrink-0 text-muted transition-transform', isOpen && 'rotate-90')} />
                  </button>
                  {isOpen && (
                    <div className="space-y-5 border-t border-line px-4 pb-4 pt-3">
                      {u.sections.map((sec, si) => (
                        <section key={si}>
                          {sec.title && <h3 className="mb-2 text-sm font-bold text-brand">{sec.title}</h3>}
                          <ol className="space-y-3">
                            {sec.topics.map((t) => (
                              <li key={t.no} className="flex gap-3">
                                <span className="w-6 shrink-0 pt-0.5 text-right text-sm font-semibold tabular-nums text-muted">{t.no}.</span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[15px] font-medium leading-snug">{t.text}</p>
                                  {t.chapters.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {t.chapters.map((id) => {
                                        const c = data.chapters.get(id);
                                        if (!c) return null;
                                        const done = data.done.has(id);
                                        return (
                                          <Link key={id} to={`/read/${id}`}
                                            className={cx('inline-flex max-w-full items-center gap-1 rounded-lg border px-2 py-1 text-xs',
                                              done ? 'border-good/40 bg-good-soft text-good' : 'border-line bg-surface-2 text-ink hover:border-brand')}>
                                            {done && <CheckIcon size={12} />}
                                            <span className="font-semibold tabular-nums">{c.std}</span>
                                            <span className="truncate">{c.title}</span>
                                          </Link>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {t.other.length > 0 && (
                                    <ul className="mt-1.5 space-y-0.5 text-xs text-muted">
                                      {t.other.map((o) => <li key={o}>• {o}</li>)}
                                    </ul>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ol>
                        </section>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted">Numbers on each chapter are the class (standard). Tap a chapter to read it.</p>
        </>
      )}
    </div>
  );
}
