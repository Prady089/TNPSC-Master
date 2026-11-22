import type { ReactNode } from 'react';
import type { ChapterContent, Highlight } from '../lib/types';
import { cx } from './ui';

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Finds `quote` in `text` ignoring differences in spacing and punctuation. */
function findQuote(text: string, quote: string): [number, number] | null {
  const words = quote.match(/[\p{L}\p{N}]+/gu);
  if (!words?.length) return null;
  const m = new RegExp(words.map(escape).join('[^\\p{L}\\p{N}]+'), 'iu').exec(text);
  return m ? [m.index, m.index + m[0].length] : null;
}

/** Block text with its highlighted passages underlined. */
function marked(text: string, marks: { h: Highlight; i: number }[]): ReactNode {
  const spans = marks
    .map(({ h, i }) => ({ i, at: findQuote(text, h.quote) }))
    .filter((s): s is { i: number; at: [number, number] } => s.at !== null)
    .sort((a, b) => a.at[0] - b.at[0]);
  if (!spans.length) return text;
  const out: ReactNode[] = [];
  let pos = 0;
  for (const { i, at } of spans) {
    if (at[0] < pos) continue; // overlapping quote: keep the first
    out.push(text.slice(pos, at[0]));
    out.push(
      <mark key={i} id={`hl-${i}`} className="hl scroll-mt-24 rounded-sm bg-transparent text-inherit underline decoration-accent decoration-2 underline-offset-[5px]">
        {text.slice(at[0], at[1])}
      </mark>,
    );
    pos = at[1];
  }
  out.push(text.slice(pos));
  return out;
}

export default function ChapterText({ chapter, className }: { chapter: ChapterContent; className?: string }) {
  const byBlock = new Map<number, { h: Highlight; i: number }[]>();
  chapter.highlights?.forEach((h, i) => {
    if (h.block >= 0) byBlock.set(h.block, [...(byBlock.get(h.block) ?? []), { h, i }]);
  });

  return (
    <article className={cx('reader font-serif leading-[1.75]', className)}>
      {chapter.blocks.map((b, i) => {
        const body = marked(b.text, byBlock.get(i) ?? []);
        if (b.t === 'h') return <h2 key={i} className="mb-3 mt-7 font-sans text-[1.05em] font-semibold text-brand">{body}</h2>;
        if (b.t === 'li') {
          return (
            <p key={i} className="relative !mb-1.5 pl-6">
              <span className="absolute left-1.5 top-[0.75em] h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
              {body}
            </p>
          );
        }
        return <p key={i}>{body}</p>;
      })}
    </article>
  );
}

const KIND_LABEL: Record<Highlight['kind'], string> = {
  date: 'Date', person: 'Person', place: 'Place', term: 'Term', number: 'Number', event: 'Event', fact: 'Fact',
};
const KIND_TONE: Record<Highlight['kind'], string> = {
  date: 'bg-accent-soft text-accent',
  number: 'bg-accent-soft text-accent',
  person: 'bg-brand-soft text-brand',
  place: 'bg-brand-soft text-brand',
  event: 'bg-brand-soft text-brand',
  term: 'bg-surface-2 text-muted',
  fact: 'bg-surface-2 text-muted',
};

/** List of the chapter's key points; tapping one jumps to its underlined passage. */
export function HighlightList({ highlights, onJump }: { highlights: Highlight[]; onJump?: () => void }) {
  const jump = (i: number) => {
    onJump?.();
    // wait for a re-render in case the chapter text has just been switched into view
    setTimeout(() => {
      const el = document.getElementById(`hl-${i}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('hl-flash');
      setTimeout(() => el.classList.remove('hl-flash'), 1600);
    }, 50);
  };
  return (
    <ol className="space-y-1">
      {highlights.map((h, i) => (
        <li key={i}>
          <button
            onClick={() => jump(i)}
            disabled={h.block < 0}
            className="w-full rounded-xl px-2.5 py-2 text-left text-[14.5px] leading-snug hover:bg-surface-2 disabled:cursor-default disabled:hover:bg-transparent"
          >
            <span className={cx('mb-1 inline-block rounded px-1.5 py-px text-[10.5px] font-semibold uppercase tracking-wide', KIND_TONE[h.kind])}>
              {KIND_LABEL[h.kind]}
            </span>
            <span className="block">{h.text}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
