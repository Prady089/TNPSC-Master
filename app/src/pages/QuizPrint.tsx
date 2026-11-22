import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { chapterIndex } from '../lib/content';
import { useAsync } from '../lib/hooks';
import type { Question, QuizMode } from '../lib/types';
import { istDate, unitByCode } from '../shared/syllabus';
import { Button, Empty, ErrorNote, Spinner, cx } from '../components/ui';
import { ChevronLeft, PrintIcon } from '../components/icons';

const LETTERS = ['A', 'B', 'C', 'D'];
const SEC_PER_Q = 54; // Prelims pace: 200 questions in 3 hours

/** Printable quiz (question paper + OMR answer sheet + answer key). Uses the browser's "Save as PDF". */
export default function QuizPrint() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const mode = (params.get('mode') ?? 'unit') as QuizMode;
  const unit = params.get('unit');
  const chapter = params.get('chapter');
  const count = Math.min(100, Math.max(5, Number(params.get('count') ?? 20)));
  const today = istDate();

  const [withKey, setWithKey] = useState(true);
  const [withExplanations, setWithExplanations] = useState(true);
  const [withSheet, setWithSheet] = useState(true);

  const { data, loading, error } = useAsync(async () => {
    const [chapters, attempts] = await Promise.all([chapterIndex().catch(() => new Map()), api.getAttempts(20)]);
    let questions: Question[];
    if (mode === 'daily') questions = await api.getDailyQuiz(today);
    else if (mode === 'revise') questions = await api.getQuestionsByIds(await api.getWrongQuestionIds(count));
    else questions = await api.getPractice({ unit: unit ?? undefined, chapter: chapter ?? undefined, count });
    const dailyDone = attempts.some((a) => a.mode === 'daily' && a.quiz_date === today);
    return { questions, chapters, dailyDone };
  }, [mode, unit, chapter, count]);

  const title =
    mode === 'daily' ? "Daily quiz" :
    mode === 'revise' ? 'Revision: questions I got wrong' :
    mode === 'chapter' ? (data?.chapters.get(chapter ?? '')?.title ?? 'Chapter practice') :
    `${unitByCode(unit ?? '')?.title ?? 'Practice'}`;
  const dateLabel = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const qs = data?.questions ?? [];
  const minutes = Math.max(5, Math.round((qs.length * SEC_PER_Q) / 60));

  // Gives the saved PDF a sensible file name.
  useEffect(() => {
    const prev = document.title;
    const slug = (mode === 'unit' ? unit : mode === 'chapter' ? chapter : mode) ?? 'quiz';
    document.title = `TNPSC-Master-${slug}-${qs.length}Q-${today}`;
    return () => { document.title = prev; };
  }, [mode, unit, chapter, qs.length, today]);

  const toolbar = (
    <div className="no-print sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-3 py-2">
        <button onClick={() => (window.history.length > 1 ? nav(-1) : nav('/quiz'))} className="rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Back"><ChevronLeft /></button>
        <p className="mr-auto font-semibold">Pen & paper</p>
        <Button onClick={() => window.print()} disabled={!qs.length}><PrintIcon size={18} /> Print / Save PDF</Button>
      </div>
      <div className="mx-auto flex max-w-3xl flex-wrap gap-x-5 gap-y-1 px-4 pb-2 text-sm">
        {([['Answer sheet', withSheet, setWithSheet], ['Answer key', withKey, setWithKey], ['Explanations', withExplanations, setWithExplanations]] as const).map(([label, on, set]) => (
          <label key={label} className={cx('flex items-center gap-2', label === 'Explanations' && !withKey && 'opacity-50')}>
            <input type="checkbox" checked={on} disabled={label === 'Explanations' && !withKey} onChange={(e) => set(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
            {label}
          </label>
        ))}
      </div>
    </div>
  );

  if (loading) return <>{toolbar}<Spinner label="Preparing your paper…" /></>;
  if (error || !data) return <>{toolbar}<div className="p-4"><ErrorNote>{error ?? 'Could not load questions'}</ErrorNote></div></>;
  if (!qs.length) return <>{toolbar}<Empty title="No questions to print yet">Questions appear here once they are reviewed and published.</Empty></>;

  return (
    <div className="min-h-dvh bg-surface-2 print:bg-white">
      {toolbar}
      {mode === 'daily' && !data.dailyDone && withKey && (
        <p className="no-print mx-auto mt-3 max-w-3xl px-4 text-sm text-accent">
          The answer key shows today's answers. Only your first online attempt is scored, so take the quiz in the app first if you want it to count.
        </p>
      )}
      <p className="no-print mx-auto mt-3 max-w-3xl px-4 text-xs text-muted">
        Tip: in the print window choose "Save as PDF" to download, and A4 paper size.
      </p>

      <div className="paper mx-auto my-4 max-w-3xl bg-white p-8 text-[13.5px] leading-snug text-black shadow-sm print:my-0 print:max-w-none print:p-0 print:shadow-none">
        {/* Header */}
        <header className="border-b-2 border-black pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">TNPSC Master · Group 1 practice paper</p>
              <h1 className="mt-1 text-xl font-bold leading-tight">{title}</h1>
              <p className="mt-0.5 text-neutral-700">{dateLabel} · {qs.length} questions · {minutes} minutes</p>
            </div>
            <div className="shrink-0 text-right text-[12px]">
              <p>Name: ______________________</p>
              <p className="mt-2">Score: ______ / {qs.length}</p>
            </div>
          </div>
          <p className="mt-3 text-[12px] text-neutral-700">
            Choose the one best answer for each question. Mark it on the answer sheet{withSheet ? ' at the end' : ''}. Each question carries equal marks; there is no negative marking.
          </p>
        </header>

        {/* Questions */}
        <ol className="mt-4 space-y-4">
          {qs.map((q, i) => {
            const short = q.options.every((o) => o.length <= 38);
            return (
              <li key={q.id} className="avoid-break">
                <p className="font-medium"><span className="mr-1.5 font-bold">{i + 1}.</span>{q.question}</p>
                <ol className={cx('mt-1.5 gap-x-6 gap-y-1 pl-5', short ? 'grid grid-cols-2' : 'space-y-1')}>
                  {q.options.map((o, j) => (
                    <li key={j}><span className="mr-1.5 font-semibold">({LETTERS[j]})</span>{o}</li>
                  ))}
                </ol>
              </li>
            );
          })}
        </ol>

        {/* OMR-style answer sheet */}
        {withSheet && (
          <section className="break-before mt-8 print:mt-0">
            <h2 className="border-b-2 border-black pb-2 text-lg font-bold">Answer sheet</h2>
            <p className="mt-1 text-[12px] text-neutral-700">Shade one circle per question.</p>
            <div className="mt-4 grid grid-cols-2 gap-x-10 gap-y-2 sm:grid-cols-3 print:grid-cols-3">
              {qs.map((q, i) => (
                <div key={q.id} className="flex items-center gap-2">
                  <span className="w-7 text-right font-semibold tabular-nums">{i + 1}</span>
                  {LETTERS.map((l) => (
                    <span key={l} className="flex h-5 w-5 items-center justify-center rounded-full border border-black text-[10px]">{l}</span>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Answer key */}
        {withKey && (
          <section className="break-before mt-8 print:mt-0">
            <h2 className="border-b-2 border-black pb-2 text-lg font-bold">Answer key</h2>
            <div className="mt-3 grid grid-cols-5 gap-x-4 gap-y-1 tabular-nums sm:grid-cols-8 print:grid-cols-10">
              {qs.map((q, i) => (
                <span key={q.id}><span className="font-semibold">{i + 1}.</span> {LETTERS[q.answer_index]}</span>
              ))}
            </div>
            {withExplanations && (
              <ol className="mt-5 space-y-2.5 text-[12.5px]">
                {qs.map((q, i) => (
                  <li key={q.id} className="avoid-break">
                    <span className="font-bold">{i + 1}. ({LETTERS[q.answer_index]}) {q.options[q.answer_index]}</span>
                    {q.explanation && <span className="text-neutral-800"> — {q.explanation}</span>}
                    {q.chapter_id && data.chapters.get(q.chapter_id) && (
                      <span className="text-neutral-600"> [Class {data.chapters.get(q.chapter_id)!.std}: {data.chapters.get(q.chapter_id)!.title}{q.source_page ? `, p. ${q.source_page}` : ''}]</span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        <footer className="mt-8 border-t border-neutral-300 pt-2 text-center text-[10.5px] text-neutral-500">
          Questions are drafted from Tamil Nadu SCERT textbooks and reviewed before publishing. For practice only. TNPSC Master is not affiliated with TNPSC.
        </footer>
      </div>
    </div>
  );
}
