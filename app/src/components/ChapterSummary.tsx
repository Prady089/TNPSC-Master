import { useState } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import type { ChapterContent, ChapterSummary as Summary } from '../lib/types';
import { Button, ErrorNote, Spinner, cx } from './ui';
import { SparkleIcon } from './icons';

/** Revision notes: pipeline notes if present, otherwise an on-demand AI summary (cached for everyone). */
export default function ChapterSummary({ chapter, textSize }: { chapter: ChapterContent; textSize: string }) {
  const hasStatic = Boolean(chapter.summary || chapter.keyFacts?.length);
  const { data, loading } = useAsync(
    () => (hasStatic ? Promise.resolve(null) : api.getChapterSummary(chapter.id).catch(() => null)),
    [chapter.id],
  );
  const [made, setMade] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary: Summary | null = hasStatic
    // key facts are shown in the Highlights pane when the chapter has them
    ? { chapter_id: chapter.id, summary: chapter.summary ?? '', key_points: [], key_facts: chapter.highlights?.length ? [] : chapter.keyFacts ?? [] }
    : made ?? data;

  const create = async () => {
    setBusy(true);
    setError(null);
    try { setMade(await api.createChapterSummary(chapter.id)); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  if (loading) return <Spinner label="Looking for notes…" />;

  if (!summary) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand"><SparkleIcon size={24} /></div>
        <p className="font-semibold">Summarise this chapter with AI</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          Get a short overview, the main ideas and exam-ready facts. It takes about 20 seconds, and once made it's saved for every student.
        </p>
        {busy ? <Spinner label="Reading the chapter and writing notes…" /> : (
          <Button className="mt-4" onClick={create}><SparkleIcon size={18} /> Create summary</Button>
        )}
        {error && <div className="mt-4 text-left"><ErrorNote>{error}</ErrorNote></div>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {summary.summary && <p className={cx('font-serif leading-relaxed', textSize)}>{summary.summary}</p>}
      {summary.key_points.length > 0 && (
        <section>
          <p className="mb-2 text-sm font-semibold">Main ideas</p>
          <ol className="space-y-2">
            {summary.key_points.map((k, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-snug">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">{i + 1}</span>
                <span className="pt-0.5">{k}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {summary.key_facts.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="mb-2 text-sm font-semibold">Key facts to remember</p>
          <ul className="space-y-2">
            {summary.key_facts.map((f, i) => (
              <li key={i} className="flex gap-2.5 text-[15px] leading-snug"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{f}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="flex items-center gap-1.5 text-xs text-muted"><SparkleIcon size={14} /> AI-generated from this chapter's text. Check important facts against the full chapter.</p>
    </div>
  );
}
