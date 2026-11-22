import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  answerText, applyFilter, FILTER_LABEL, getBookBackMany, isObjective, KIND_LABEL, KIND_ORDER, pyqLabel, shuffledRight,
  type BBChapter, type BBFilter, type BBItem,
} from '../lib/bookback';
import { useAsync } from '../lib/hooks';
import { Button, ErrorNote, LinkButton, Spinner, cx } from '../components/ui';
import { ChevronLeft, PrintIcon, QuizIcon } from '../components/icons';

type View = 'qa' | 'test' | 'answers';
const VIEW_LABEL: Record<View, string> = { qa: 'Study Q&A', test: 'Pen test', answers: 'Q&A download' };
const FILTERS: BBFilter[] = ['all', 'book', 'extra', 'pyq'];

interface Group { key: string; title: string; items: BBItem[] }

/** Splits a chapter into numbered sections: book exercises by type, then the extra questions. */
function groups(ch: BBChapter, filter: BBFilter): Group[] {
  const items = applyFilter(ch.items, filter);
  const out: Group[] = [];
  for (const k of KIND_ORDER) {
    const g = items.filter((i) => i.src === 'book' && i.k === k);
    if (g.length) out.push({ key: `b-${k}`, title: KIND_LABEL[k], items: g });
  }
  const extra = items.filter((i) => i.src === 'extra');
  if (extra.length) out.push({ key: 'extra', title: 'More questions from this chapter', items: extra });
  return out;
}

/**
 * Book back questions of one or more chapters.
 *  view=qa       study on screen, tap to reveal answers
 *  view=test     printable question paper, answer key at the end ("pen test")
 *  view=answers  printable Q&A with the answer under every question
 */
export default function BookBackQA() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const ids = (params.get('ch') ?? '').split(',').filter(Boolean);
  const view = (params.get('view') ?? 'qa') as View;
  const filter = (params.get('f') ?? 'all') as BBFilter;
  const [revealAll, setRevealAll] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const { data, loading, error } = useAsync(() => getBookBackMany(ids), [ids.join(',')]);
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    p.set(k, v);
    setParams(p, { replace: true });
  };

  const chapters = useMemo(() => (data ?? []).map((ch) => ({ ch, groups: groups(ch, filter) })), [data, filter]);
  const count = chapters.reduce((n, c) => n + c.groups.reduce((m, g) => m + g.items.length, 0), 0);
  const objective = chapters.reduce((n, c) => n + c.groups.reduce((m, g) => m + g.items.filter(isObjective).length, 0), 0);
  const title = data?.length === 1 ? data[0].title : `${data?.length ?? ids.length} chapters`;

  useEffect(() => {
    if (view === 'qa') return;
    const prev = document.title;
    document.title = `TNPSC-Master-BookBack-${ids.length === 1 ? ids[0] : `${ids.length}-chapters`}-${view === 'test' ? 'PenTest' : 'QA'}`;
    return () => { document.title = prev; };
  }, [view, ids]);

  const printing = view !== 'qa';
  const shown = (id: string) => view === 'answers' || (view === 'qa' && (revealAll || open.has(id)));
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const toolbar = (
    <div className="no-print sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-2 py-2">
        <button onClick={() => (window.history.length > 1 ? nav(-1) : nav('/bookback/I'))} className="rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Back"><ChevronLeft /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{title}</p>
          <p className="text-xs text-muted">Book back questions · {count} questions</p>
        </div>
        {printing && <Button onClick={() => window.print()} disabled={!count}><PrintIcon size={18} /> Print / PDF</Button>}
      </div>
      <div className="mx-auto max-w-3xl space-y-2 px-3 pb-2.5">
        <div className="grid grid-cols-3 rounded-xl bg-surface-2 p-1 text-[13px] font-semibold">
          {(['qa', 'test', 'answers'] as const).map((v) => (
            <button key={v} onClick={() => set('view', v)} className={cx('rounded-lg py-1.5', view === v ? 'bg-surface text-ink shadow-sm' : 'text-muted')}>{VIEW_LABEL[v]}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => set('f', f)}
              className={cx('rounded-full border px-3 py-1 text-xs font-semibold', filter === f ? 'border-brand bg-brand-soft text-brand' : 'border-line text-muted')}>
              {FILTER_LABEL[f]}
            </button>
          ))}
          {view === 'qa' && (
            <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-muted">
              <input type="checkbox" checked={revealAll} onChange={(e) => setRevealAll(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" /> Show all answers
            </label>
          )}
        </div>
        {view === 'qa' && objective > 0 && (
          <LinkButton to={`/bookback/play?ch=${ids.join(',')}&f=${filter}`} className="w-full"><QuizIcon size={18} /> Take as online quiz ({objective} questions)</LinkButton>
        )}
        {printing && <p className="text-xs text-muted">In the print window choose "Save as PDF" and A4 to download.</p>}
      </div>
    </div>
  );

  if (loading) return <>{toolbar}<Spinner label="Loading questions…" /></>;
  if (error || !data) return <>{toolbar}<div className="p-4"><ErrorNote>{error ?? 'Could not load questions'}</ErrorNote></div></>;

  let qno = 0; // running number across the paper, used by the answer key
  const keyRows: { n: number; it: BBItem }[] = [];

  return (
    <div className={cx('min-h-dvh', printing && 'bg-surface-2 print:bg-white')}>
      {toolbar}
      <div className={cx('mx-auto max-w-3xl', printing ? 'paper my-4 bg-white p-8 text-[13.5px] leading-snug text-black shadow-sm print:my-0 print:max-w-none print:p-0 print:shadow-none' : 'px-4 pb-16 pt-4')}>
        {printing && (
          <header className="border-b-2 border-black pb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">TNPSC Master · Book back questions · {view === 'test' ? 'Pen test' : 'Questions and answers'}</p>
            <h1 className="mt-1 text-xl font-bold leading-tight">{title}</h1>
            <p className="mt-0.5 text-neutral-700">{data.map((c) => `Class ${c.std} ${c.book}`).filter((v, i, a) => a.indexOf(v) === i).join(', ')} · {count} questions</p>
            {view === 'test' && <p className="mt-2 text-[12px]">Name: ______________________ &nbsp;&nbsp; Date: __________ &nbsp;&nbsp; Score: ______</p>}
          </header>
        )}

        {count === 0 && <p className="mt-6 text-center text-sm text-muted">No questions match this filter.</p>}

        {chapters.map(({ ch, groups: gs }) => gs.length > 0 && (
          <section key={ch.chapter} className="mt-5 first:mt-4">
            {(data.length > 1 || !printing) && (
              <h2 className={cx('mb-3 font-bold', printing ? 'border-b border-black pb-1 text-[15px]' : 'text-lg')}>
                <span className={cx('mr-2 text-sm', printing ? 'text-neutral-600' : 'text-muted')}>Class {ch.std}</span>{ch.title}
              </h2>
            )}
            {gs.map((g) => (
              <div key={g.key} className="mb-5">
                <h3 className={cx('mb-2 text-sm font-bold', printing ? 'uppercase tracking-wide' : 'text-brand')}>{g.title}</h3>
                <ol className="space-y-3.5">
                  {g.items.map((it) => {
                    qno += 1;
                    keyRows.push({ n: qno, it });
                    return (
                      <li key={it.id} className="avoid-break">
                        <ItemView it={it} n={qno} printing={printing} showAnswer={shown(it.id)} onToggle={view === 'qa' ? () => toggle(it.id) : undefined} />
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </section>
        ))}

        {view === 'test' && keyRows.length > 0 && (
          <section className="break-before mt-8 print:mt-0">
            <h2 className="border-b-2 border-black pb-2 text-lg font-bold">Answer key</h2>
            <ol className="mt-3 space-y-1.5 text-[12.5px]">
              {keyRows.map(({ n, it }) => (
                <li key={it.id} className="avoid-break"><b>{n}.</b> {keyAnswer(it)}{it.x && it.k !== 'match' ? <span className="text-neutral-700"> — {it.x}</span> : null}</li>
              ))}
            </ol>
          </section>
        )}

        {printing && (
          <footer className="mt-8 border-t border-neutral-300 pt-2 text-center text-[10.5px] text-neutral-500">
            From Tamil Nadu SCERT textbook exercises. Year tags show TNPSC papers (2019 onwards) that asked the same point. For practice only; not affiliated with TNPSC.
          </footer>
        )}
      </div>
    </div>
  );
}

function keyAnswer(it: BBItem): string {
  if (it.k === 'match') {
    const right = shuffledRight(it);
    return (it.p ?? []).map(([, r], i) => `${i + 1}–${'abcdefgh'[right.indexOf(r)]}`).join(', ');
  }
  return answerText(it);
}

function ItemView({ it, n, printing, showAnswer, onToggle }: { it: BBItem; n: number; printing: boolean; showAnswer: boolean; onToggle?: () => void }) {
  const short = (it.o ?? []).every((o) => o.length <= 34);
  return (
    <div className={cx(!printing && 'rounded-xl border border-line bg-surface p-3.5')}>
      <p className="whitespace-pre-line font-medium leading-snug">
        <span className="mr-1.5 font-bold">{n}.</span>{it.q}{it.k === 'tf' && <span className={printing ? 'text-neutral-600' : 'text-muted'}> (True / False)</span>}
      </p>
      {(it.k === 'mcq' || it.k === 'ar') && (
        <ol className={cx('mt-1.5 gap-x-6 gap-y-1 pl-5', short ? 'grid grid-cols-2' : 'space-y-1')}>
          {it.o!.map((o, j) => (
            <li key={j} className={cx(showAnswer && j === it.a && (printing ? 'font-bold' : 'font-semibold text-good'))}>
              <span className="mr-1.5 font-semibold">({'abcd'[j]})</span>{o}
            </li>
          ))}
        </ol>
      )}
      {it.k === 'match' && <MatchTable it={it} printing={printing} />}
      {it.pyq?.length ? (
        <p className="mt-1.5 flex flex-wrap gap-1.5">
          {it.pyq.map((t) => (
            <span key={t.paper + t.qno} className={cx('rounded-md px-1.5 py-0.5 text-[11px] font-semibold', printing ? 'border border-black' : 'bg-accent-soft text-accent')}>
              Asked: {pyqLabel(t)}{t.qno ? ` · Q${t.qno}` : ''}
            </span>
          ))}
        </p>
      ) : null}
      {showAnswer ? (
        <div className={cx('mt-2 text-[13.5px] leading-relaxed', printing ? 'border-l-2 border-black pl-2' : 'rounded-lg bg-good-soft p-2.5')}>
          {it.k !== 'mcq' && it.k !== 'ar' && <p><b>Answer:</b> {it.k === 'match' ? '' : answerText(it)}</p>}
          {it.k === 'match' && (
            <ul className="mt-0.5 space-y-0.5">{it.p!.map(([l, r]) => <li key={l}>{l} – <b>{r}</b></li>)}</ul>
          )}
          {it.x && <p className={cx(it.k !== 'mcq' && it.k !== 'ar' && 'mt-1', printing ? 'text-neutral-700' : 'text-muted')}>{it.k === 'tf' && it.a === false ? 'Correct statement: ' : ''}{it.x}</p>}
        </div>
      ) : onToggle ? (
        <button onClick={onToggle} className="mt-2 text-sm font-semibold text-brand">Show answer</button>
      ) : null}
      {showAnswer && onToggle && <button onClick={onToggle} className="mt-1.5 text-xs font-semibold text-muted">Hide answer</button>}
      {printing && !showAnswer && (it.k === 'fill' || it.k === 'short' || it.k === 'long' || it.k === 'hot' || it.k === 'num' || it.k === 'tf') && (
        <div className={cx('mt-1 border-b border-dotted border-neutral-400', it.k === 'long' || it.k === 'num' || it.k === 'hot' ? 'h-20' : it.k === 'short' ? 'h-10' : 'h-5')} />
      )}
    </div>
  );
}

function MatchTable({ it, printing }: { it: BBItem; printing: boolean }) {
  const right = shuffledRight(it);
  return (
    <table className={cx('mt-2 w-full text-[13.5px]', printing ? '' : 'text-ink')}>
      <tbody>
        {it.p!.map(([l], i) => (
          <tr key={l} className="align-top">
            <td className="w-1/2 py-0.5 pr-3"><b>{i + 1}.</b> {l}</td>
            <td className="py-0.5"><b>({'abcdefgh'[i]})</b> {right[i]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
