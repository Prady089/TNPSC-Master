import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { applyFilter, asChoice, getBookBackMany, isObjective, pyqLabel, type BBFilter, type BBItem } from '../lib/bookback';
import { pct, useAsync } from '../lib/hooks';
import { Bar, Button, Card, Empty, ErrorNote, LinkButton, Pill, Spinner, cx } from '../components/ui';
import { CheckIcon, ChevronLeft, XIcon } from '../components/icons';

const LETTERS = ['A', 'B', 'C', 'D'];

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Online quiz over the objective book back questions (MCQ, assertion-reason, true/false) of the chosen chapters. */
export default function BookBackPlay() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const ids = (params.get('ch') ?? '').split(',').filter(Boolean);
  const filter = (params.get('f') ?? 'all') as BBFilter;

  const { data, loading, error } = useAsync(async () => {
    const chs = await getBookBackMany(ids);
    const items = shuffle(chs.flatMap((c) => applyFilter(c.items, filter).filter(isObjective).map((it) => ({ it, chapter: c.title }))));
    return { items, title: chs.length === 1 ? chs[0].title : `${chs.length} chapters` };
  }, [ids.join(','), filter]);

  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [finished, setFinished] = useState(false);

  const items = data?.items ?? [];
  const cur = items[i];
  const choice = useMemo(() => (cur ? asChoice(cur.it) : null), [cur]);
  const chosen = cur ? answers[cur.it.id] : undefined;
  const answered = chosen !== undefined;
  const correct = items.filter(({ it }) => answers[it.id] === asChoice(it).answer).length;
  const attempted = items.filter(({ it }) => answers[it.id] !== undefined).length;

  const shell = (body: React.ReactNode) => (
    <div className="mx-auto min-h-dvh max-w-2xl">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-2">
          <button onClick={() => nav(-1)} className="rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Close"><ChevronLeft /></button>
          <p className="min-w-0 flex-1 truncate font-semibold">{data?.title ?? 'Book back quiz'}</p>
        </div>
      </header>
      <div className="px-4 pb-16 pt-4">{body}</div>
    </div>
  );

  if (loading) return shell(<Spinner label="Preparing questions…" />);
  if (error || !data) return shell(<ErrorNote>{error ?? 'Could not load questions'}</ErrorNote>);
  if (!items.length) return shell(<Card><Empty title="No quiz questions here">This selection has only written-answer questions. Use Study Q&A or the pen test instead.</Empty></Card>);

  if (finished) {
    const score = pct(correct, attempted);
    return shell(
      <div className="space-y-4">
        <Card className="text-center">
          <p className="text-sm text-muted">Your score</p>
          <p className="mt-1 text-4xl font-bold">{correct}<span className="text-xl text-muted">/{attempted}</span></p>
          <p className={cx('mt-1 text-sm font-semibold', score >= 70 ? 'text-good' : score >= 40 ? 'text-accent' : 'text-bad')}>{score}%</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={() => { setAnswers({}); setI(0); setFinished(false); }}>Try again</Button>
            <LinkButton to={`/bookback/qa?ch=${ids.join(',')}`} variant="secondary">Study Q&A</LinkButton>
          </div>
        </Card>
        <p className="font-semibold">Answers</p>
        {items.filter(({ it }) => answers[it.id] !== undefined).map(({ it, chapter }, n) => (
          <Review key={it.id} it={it} n={n + 1} chosen={answers[it.id]} chapter={chapter} />
        ))}
      </div>,
    );
  }

  const choose = (idx: number | null) => !answered && setAnswers((a) => ({ ...a, [cur.it.id]: idx }));
  const next = () => (i < items.length - 1 ? setI(i + 1) : setFinished(true));

  return shell(
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Bar value={((i + (answered ? 1 : 0)) / items.length) * 100} />
        <span className="shrink-0 text-sm font-medium text-muted">{i + 1}/{items.length}</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Pill tone="brand">{cur.it.src === 'book' ? 'Book back' : 'More questions'}</Pill>
        {cur.it.pyq?.map((t) => <Pill key={t.paper} tone="accent">Asked: {pyqLabel(t)}</Pill>)}
      </div>
      <h2 className="mb-5 whitespace-pre-line text-lg font-semibold leading-snug">{cur.it.q}</h2>
      <div className="space-y-2.5">
        {choice!.options.map((opt, idx) => {
          const isRight = idx === choice!.answer;
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
        <div className={cx('mt-4 rounded-xl p-4 text-sm', chosen === choice!.answer ? 'bg-good-soft' : 'bg-surface-2')}>
          <p className="mb-1 font-semibold">{chosen === null ? `Skipped. Answer: ${LETTERS[choice!.answer]}` : chosen === choice!.answer ? 'Correct!' : `Answer: ${LETTERS[choice!.answer]}`}</p>
          {cur.it.x && <p className="leading-relaxed">{cur.it.k === 'tf' && cur.it.a === false ? 'Correct statement: ' : ''}{cur.it.x}</p>}
          <p className="mt-1 text-xs text-muted">{cur.chapter}</p>
        </div>
      )}
      <div className="mt-6">
        {!answered ? <Button variant="ghost" className="w-full" onClick={() => choose(null)}>Skip</Button>
          : <Button className="w-full" onClick={next}>{i < items.length - 1 ? 'Next question' : 'See results'}</Button>}
      </div>
      {i > 0 && !answered && <button onClick={() => setFinished(true)} className="mt-4 w-full text-center text-sm text-muted underline">Finish now and see results</button>}
    </div>,
  );
}

function Review({ it, n, chosen, chapter }: { it: BBItem; n: number; chosen: number | null; chapter: string }) {
  const { options, answer } = asChoice(it);
  const status = chosen === null ? 'Skipped' : chosen === answer ? 'Correct' : 'Wrong';
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2 text-xs">
        <span className="font-semibold text-muted">Q{n}</span>
        <Pill tone={status === 'Correct' ? 'good' : status === 'Wrong' ? 'bad' : 'muted'}>{status}</Pill>
        <span className="truncate text-muted">{chapter}</span>
      </div>
      <p className="mb-2 whitespace-pre-line font-medium leading-snug">{it.q}</p>
      <ul className="mb-1 space-y-1 text-sm">
        {options.map((o, idx) => (
          <li key={idx} className={cx(idx === answer ? 'font-semibold text-good' : idx === chosen ? 'text-bad line-through' : 'text-muted')}>{LETTERS[idx]}. {o}</li>
        ))}
      </ul>
      {it.x && <p className="text-sm leading-relaxed text-muted">{it.x}</p>}
    </Card>
  );
}
