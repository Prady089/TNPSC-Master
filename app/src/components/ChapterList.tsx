import { Link } from 'react-router-dom';
import { SUBJECT_LABEL } from '../lib/content';
import type { ChapterMeta, ReadingState } from '../lib/types';
import { BookmarkIcon, CheckIcon } from './icons';
import { Card, cx } from './ui';

export default function ChapterList({
  chapters,
  reading,
  showBook,
}: {
  chapters: (ChapterMeta & { bookLabel?: string })[];
  reading: ReadingState[];
  showBook?: boolean;
}) {
  const state = new Map(reading.map((r) => [r.chapter_id, r]));
  return (
    <Card className="divide-y divide-line p-0">
      {chapters.map((c) => {
        const r = state.get(c.id);
        const done = (r?.progress ?? 0) >= 0.95;
        return (
          <Link key={c.id} to={`/read/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
            <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
              done ? 'bg-good-soft text-good' : r ? 'bg-brand-soft text-brand' : 'bg-surface-2 text-muted')}>
              {done ? <CheckIcon size={16} /> : c.order}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-snug">{c.title}</p>
              <p className="mt-0.5 text-xs text-muted">
                {showBook && c.bookLabel ? `${c.bookLabel} · ` : ''}{SUBJECT_LABEL[c.subject] ?? c.subject} · {Math.max(1, Math.round(c.words / 200))} min read
                {r && !done ? ` · ${Math.round(r.progress * 100)}% read` : ''}
              </p>
            </div>
            {r?.bookmarked && <BookmarkIcon filled size={16} className="shrink-0 text-accent" />}
          </Link>
        );
      })}
    </Card>
  );
}
