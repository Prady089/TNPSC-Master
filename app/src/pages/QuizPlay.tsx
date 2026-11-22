import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { chapterIndex } from '../lib/content';
import { pct, useAsync } from '../lib/hooks';
import type { AnswerRecord, Question, QuizMode } from '../lib/types';
import { istDate, unitByCode } from '../shared/syllabus';
import { chapterRoom, chatAvailable, quizRoom, unitRoom } from '../lib/chat';
import { CheckIcon, ChevronLeft, ClockIcon, XIcon } from '../components/icons';
import { Bar, Button, Card, Empty, ErrorNote, LinkButton, Pill, Spinner, cx } from '../components/ui';

const LETTERS = ['A', 'B', 'C', 'D'];
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const dailyKey = (d: string) => `daily-answers-${d}`;

function title(mode: QuizMode, unit?: string | null, chapterTitle?: string, paperTitle?: string) {
  if (mode === 'pyq') return paperTitle ?? 'Previous year paper';
  if (mode === 'daily') return "Today's quiz";
  if (mode === 'revise') return 'Revise mistakes';
  if (mode === 'chapter') return chapterTitle ?? 'Chapter practice';
  return unitByCode(unit ?? '')?.short ?? 'Practice';
}

export default function QuizPlay() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const mode = (params.get('mode') ?? 'unit') as QuizMode;
  const unit = params.get('unit');
  const chapter = params.get('chapter');
  const paper = params.get('paper');
  const count = Number(params.get('count') ?? 10);
  const reviewOnly = params.get('review') === '1';
  const today = istDate();

  const { data, loading, error } = useAsync(async () => {
    const [chapters, attempts] = await Promise.all([chapterIndex().catch(() => new Map()), api.getAttempts(20)]);
    const doneToday = mode === 'daily' && attempts.some((a) => a.mode === 'daily' && a.quiz_date === today);
    let questions: Question[] = [];
    let paperTitle: string | undefined;
    if (mode === 'pyq' && paper) {
      const [qs, papers] = await Promise.all([api.getPaperQuestions(paper), api.getPyqPapers().catch(() => [])]);
      questions = qs;
      paperTitle = papers.find((p) => p.id === paper)?.title;
    } else if (mode === 'daily') questions = await api.getDailyQuiz(today);
    else if (mode === 'revise') questions = await api.getQuestionsByIds(await api.getWrongQuestionIds(count));
    else questions = await api.getPractice({ unit: unit ?? undefined, chapter: chapter ?? undefined, count });
    let saved: Record<string, number | null> = {};
    try { saved = JSON.parse(localStorage.getItem(dailyKey(today)) ?? '{}'); } catch { /* ignore */ }
    return { questions, chapters, doneToday, saved, paperTitle };
  }, [mode, unit, chapter, paper, count]);

  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [finished, setFinished] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const start = useRef(Date.now());

  useEffect(() => {
    if (finished || loading) return;
    start.current = Date.now() - elapsed * 1000;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - start.current) / 1000)), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, loading]);

  const questions = data?.questions ?? [];
  const q = questions[i];
  const chosen = q ? answers[q.id] : undefined;
  const answered = chosen !== undefined;

  const results = useMemo(() => {
    const records: AnswerRecord[] = questions
      .filter((x) => answers[x.id] !== undefined)
      .map((x) => ({ question_id: x.id, selected_index: answers[x.id], is_correct: answers[x.id] === x.answer_index }));
    const byUnit = new Map<string, { n: number; c: number }>();
    for (const x of questions) {
      if (answers[x.id] === undefined) continue;
      const s = byUnit.get(x.unit_code) ?? { n: 0, c: 0 };
      s.n++;
      if (answers[x.id] === x.answer_index) s.c++;
      byUnit.set(x.unit_code, s);
    }
    return { records, correct: records.filter((r) => r.is_correct).length, byUnit };
  }, [answers, questions]);

  async function finish() {
    setFinished(true);
    if (!results.records.length) return;
    try {
      await api.saveAttempt(
        { mode, quiz_date: mode === 'daily' ? today : null, unit_code: unit, chapter_id: chapter, paper_id: mode === 'pyq' ? paper : null, total: results.records.length, correct: results.correct, duration_sec: elapsed },
        results.records,
      );
      if (mode === 'daily') localStorage.setItem(dailyKey(today), JSON.stringify(answers));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save your score');
    }
  }

  const choose = (idx: number | null) => {
    if (!q || answered) return;
    setAnswers((a) => ({ ...a, [q.id]: idx }));
  };
  const nextQ = () => (i < questions.length - 1 ? setI(i + 1) : finish());

  // keyboard: 1-4 / a-d to answer, Enter / → for next
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished || !q) return;
      const k = e.key.toLowerCase();
      const idx = ['1', '2', '3', '4'].indexOf(k) >= 0 ? Number(k) - 1 : ['a', 'b', 'c', 'd'].indexOf(k);
      if (idx >= 0 && !answered) choose(idx);
      else if ((k === 'enter' || k === 'arrowright') && answered) nextQ();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const chTitle = chapter ? data?.chapters.get(chapter)?.title : undefined;
  const heading = title(mode, unit, chTitle, data?.paperTitle);

  const shell = (body: React.ReactNode, top?: React.ReactNode) => (
    <div className="mx-auto min-h-dvh max-w-2xl">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-2">
          <button onClick={() => nav(-1)} className="rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Close"><ChevronLeft /></button>
          <p className="min-w-0 flex-1 truncate font-semibold">{heading}</p>
          {top}
        </div>
      </header>
      <div className="px-4 pb-16 pt-4">{body}</div>
    </div>
  );

  if (loading) return shell(<Spinner label="Preparing questions…" />);
  if (error || !data) return shell(<ErrorNote>{error ?? 'Could not load questions'}</ErrorNote>);
  if (!questions.length) {
    return shell(
      <Card>
        <Empty title={mode === 'revise' ? 'No mistakes to revise' : 'No questions here yet'}>
          {mode === 'revise'
            ? 'Questions you get wrong are collected here. Take a quiz first.'
            : 'Questions for this section are still being prepared and reviewed. Try another unit or the daily quiz.'}
        </Empty>
        <div className="text-center"><LinkButton to="/quiz" variant="secondary">Back to quizzes</LinkButton></div>
      </Card>,
    );
  }

  // Daily quiz already taken -> read-only review
  if (mode === 'daily' && data.doneToday && !finished) {
    if (!reviewOnly) {
      return shell(
        <Card>
          <Empty title="You've already taken today's quiz">Only your first attempt counts. You can still go through the answers.</Empty>
          <div className="flex justify-center gap-2">
            <LinkButton to="/quiz/play?mode=daily&review=1">Review answers</LinkButton>
            {chatAvailable && <LinkButton to={`/chat/${quizRoom(today)}`} variant="secondary">Discuss</LinkButton>}
            <LinkButton to="/quiz" variant="secondary">More practice</LinkButton>
          </div>
        </Card>,
      );
    }
    return shell(<ReviewList questions={questions} answers={data.saved} chapters={data.chapters} />);
  }

  if (finished) {
    const total = results.records.length;
    const score = pct(results.correct, total);
    return shell(
      <div className="space-y-4">
        <Card className="text-center">
          <p className="text-sm text-muted">Your score</p>
          <p className="mt-1 text-4xl font-bold">{results.correct}<span className="text-xl text-muted">/{total}</span></p>
          <p className={cx('mt-1 text-sm font-semibold', score >= 70 ? 'text-good' : score >= 40 ? 'text-accent' : 'text-bad')}>
            {score}% · {score >= 70 ? 'Excellent!' : score >= 40 ? 'Good effort. Keep going.' : 'Revise and try again.'}
          </p>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted"><ClockIcon size={14} /> {fmtTime(elapsed)}{questions.length > total ? ` · ${questions.length - total} not reached` : ''}</p>
          {saveError && <div className="mt-3"><ErrorNote>{saveError}</ErrorNote></div>}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <LinkButton to="/">Home</LinkButton>
            {chatAvailable && (mode === 'daily' || unit || chapter) && (
              <LinkButton variant="secondary"
                to={`/chat/${mode === 'daily' ? quizRoom(today) : chapter ? chapterRoom(chapter) : unitRoom(unit!)}`}>
                {mode === 'daily' ? "Discuss today's quiz" : 'Discuss'}
              </LinkButton>
            )}
            <LinkButton to="/quiz" variant="secondary">More quizzes</LinkButton>
          </div>
        </Card>
        {results.byUnit.size > 1 && (
          <Card>
            <p className="mb-3 font-semibold">By unit</p>
            <div className="space-y-3">
              {[...results.byUnit].map(([u, s]) => (
                <div key={u}>
                  <div className="mb-1 flex justify-between text-sm"><span>{unitByCode(u)?.short ?? u}</span><span className="text-muted">{s.c}/{s.n}</span></div>
                  <Bar value={pct(s.c, s.n)} tone={s.c / s.n >= 0.6 ? 'good' : 'accent'} />
                </div>
              ))}
            </div>
          </Card>
        )}
        <ReviewList questions={questions} answers={answers} chapters={data.chapters} />
      </div>,
    );
  }

  return shell(
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Bar value={((i + (answered ? 1 : 0)) / questions.length) * 100} />
        <span className="shrink-0 text-sm font-medium text-muted">{i + 1}/{questions.length}</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Pill tone="brand">{unitByCode(q.unit_code)?.short ?? q.unit_code}</Pill>
        {q.difficulty === 3 && <Pill tone="accent">Hard</Pill>}
        {q.source === 'news' && <Pill tone="accent">Current affairs</Pill>}
      </div>
      <h2 className="mb-5 whitespace-pre-line text-lg font-semibold leading-snug">{q.question}</h2>
      <div className="space-y-2.5">
        {q.options.map((opt, idx) => {
          const isRight = idx === q.answer_index;
          const isChosen = idx === chosen;
          return (
            <button key={idx} onClick={() => choose(idx)} disabled={answered}
              className={cx('flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition',
                !answered && 'border-line bg-surface hover:border-brand',
                answered && isRight && 'border-good bg-good-soft',
                answered && isChosen && !isRight && 'border-bad bg-bad-soft',
                answered && !isRight && !isChosen && 'border-line bg-surface opacity-60')}>
              <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                answered && isRight ? 'bg-good text-white' : answered && isChosen ? 'bg-bad text-white' : 'bg-surface-2 text-muted')}>
                {answered && isRight ? <CheckIcon size={16} /> : answered && isChosen ? <XIcon size={16} /> : LETTERS[idx]}
              </span>
              <span className="pt-0.5">{opt}</span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className={cx('mt-4 rounded-xl p-4 text-sm', chosen === q.answer_index ? 'bg-good-soft' : 'bg-surface-2')}>
          <p className="mb-1 font-semibold">{chosen === null ? `Skipped. Answer: ${LETTERS[q.answer_index]}` : chosen === q.answer_index ? 'Correct!' : `Answer: ${LETTERS[q.answer_index]}`}</p>
          {q.explanation && <p className="leading-relaxed">{q.explanation}</p>}
          {q.chapter_id && data.chapters.get(q.chapter_id) && (
            <Link to={`/read/${q.chapter_id}`} className="mt-2 inline-block font-medium text-brand">
              Read: {data.chapters.get(q.chapter_id)!.title}{q.source_page ? ` (p. ${q.source_page})` : ''} →
            </Link>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        {!answered ? (
          <Button variant="ghost" className="flex-1" onClick={() => choose(null)}>Skip</Button>
        ) : (
          <Button className="flex-1" onClick={nextQ}>{i < questions.length - 1 ? 'Next question' : 'See results'}</Button>
        )}
      </div>
      {i > 0 && !answered && (
        <button onClick={finish} className="mt-4 w-full text-center text-sm text-muted underline">Finish now and see results</button>
      )}
    </div>,
    <span className="flex items-center gap-1 pr-2 text-sm tabular-nums text-muted"><ClockIcon size={16} />{fmtTime(elapsed)}</span>,
  );
}

function ReviewList({ questions, answers, chapters }: { questions: Question[]; answers: Record<string, number | null>; chapters: Map<string, { title: string }> }) {
  return (
    <div className="space-y-3">
      <p className="font-semibold">Answers & explanations</p>
      {questions.map((q, n) => {
        const a = answers[q.id];
        const status = a === undefined ? 'unanswered' : a === null ? 'skipped' : a === q.answer_index ? 'right' : 'wrong';
        return (
          <Card key={q.id} className="p-4">
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="font-semibold text-muted">Q{n + 1}</span>
              <Pill tone={status === 'right' ? 'good' : status === 'wrong' ? 'bad' : 'muted'}>
                {status === 'right' ? 'Correct' : status === 'wrong' ? 'Wrong' : status === 'skipped' ? 'Skipped' : 'Not answered'}
              </Pill>
              <span className="text-muted">{unitByCode(q.unit_code)?.short}</span>
            </div>
            <p className="mb-2 whitespace-pre-line font-medium leading-snug">{q.question}</p>
            <ul className="mb-2 space-y-1 text-sm">
              {q.options.map((o, idx) => (
                <li key={idx} className={cx(idx === q.answer_index ? 'font-semibold text-good' : idx === a ? 'text-bad line-through' : 'text-muted')}>
                  {LETTERS[idx]}. {o}
                </li>
              ))}
            </ul>
            {q.explanation && <p className="text-sm leading-relaxed text-muted">{q.explanation}</p>}
            {q.chapter_id && chapters.get(q.chapter_id) && (
              <Link to={`/read/${q.chapter_id}`} className="mt-1 inline-block text-sm font-medium text-brand">Read chapter →</Link>
            )}
          </Card>
        );
      })}
    </div>
  );
}
