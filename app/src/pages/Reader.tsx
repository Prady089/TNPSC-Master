import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { getCatalog, getChapter } from '../lib/content';
import { useAsync } from '../lib/hooks';
import { unitByCode } from '../shared/syllabus';
import { BookmarkIcon, ChatIcon, ChevronLeft, ChevronRight, PrintIcon, SparkleIcon } from '../components/icons';
import ChapterSummary from '../components/ChapterSummary';
import ChapterText, { HighlightList } from '../components/ChapterText';
import { chapterRoom, chatAvailable } from '../lib/chat';
import { Bar, Button, ErrorNote, LinkButton, Pill, Spinner, cx } from '../components/ui';

type Tab = 'read' | 'highlights' | 'notes';
const SIZES = ['text-[15px]', 'text-[17px]', 'text-[19px]', 'text-[21px]'];
const readSize = () => {
  try { return Number(localStorage.getItem('reader-size') ?? 1); } catch { return 1; }
};

export default function Reader() {
  const { chapterId = '' } = useParams();
  const nav = useNavigate();
  const [size, setSize] = useState(readSize);
  const [tab, setTab] = useState<Tab>('read');
  const [progress, setProgress] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const best = useRef(0);
  const saved = useRef(0);

  const { data, loading, error } = useAsync(async () => {
    const [chapter, catalog, reading] = await Promise.all([getChapter(chapterId), getCatalog(), api.getReading()]);
    const book = catalog.books.find((b) => b.id === chapter.bookId);
    const idx = book?.chapters.findIndex((c) => c.id === chapterId) ?? -1;
    const state = reading.find((r) => r.chapter_id === chapterId);
    return {
      chapter, book, state,
      prev: idx > 0 ? book!.chapters[idx - 1] : null,
      next: book && idx >= 0 && idx < book.chapters.length - 1 ? book.chapters[idx + 1] : null,
    };
  }, [chapterId]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setTab('read');
    best.current = data?.state?.progress ?? 0;
    saved.current = best.current;
    setProgress(best.current);
    setBookmarked(Boolean(data?.state?.bookmarked));
  }, [data]);

  // Track how far the student has scrolled; save the furthest point every ~10%.
  // Only while the chapter text is actually on screen: during a reload the page
  // shrinks to a spinner, the scroll position clamps, and it would look like 100%.
  useEffect(() => {
    if (!data || loading || tab !== 'read' || data.chapter.id !== chapterId) return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 1;
      if (p > best.current) {
        best.current = p;
        setProgress(p);
        if (p - saved.current >= 0.1 || p >= 0.98) {
          saved.current = p;
          api.setReading(chapterId, { progress: p >= 0.98 ? 1 : p }).catch(() => {});
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [data, loading, tab, chapterId]);

  const changeSize = (d: number) => {
    const s = Math.max(0, Math.min(SIZES.length - 1, size + d));
    setSize(s);
    try { localStorage.setItem('reader-size', String(s)); } catch { /* ignore */ }
  };
  const toggleBookmark = () => {
    setBookmarked((b) => {
      api.setReading(chapterId, { bookmarked: !b, progress: best.current }).catch(() => {});
      return !b;
    });
  };

  if (loading) return <Spinner label="Opening chapter…" />;
  if (error || !data) return <div className="p-4"><ErrorNote>{error ?? 'Could not open chapter'}</ErrorNote></div>;
  const { chapter, book, prev, next } = data;
  const hasNotes = Boolean(chapter.summary || chapter.keyFacts?.length);
  const highlights = chapter.highlights ?? [];
  const tabs: Tab[] = highlights.length ? ['read', 'highlights', 'notes'] : ['read', 'notes'];
  const tabLabel = (t: Tab) =>
    t === 'read' ? 'Full chapter' : t === 'highlights' ? 'Highlights' : <><SparkleIcon size={16} /> {hasNotes ? 'Summary' : 'AI summary'}</>;

  return (
    <div className={cx('mx-auto min-h-dvh', highlights.length ? 'max-w-2xl lg:max-w-6xl' : 'max-w-2xl')}>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-2">
          <button onClick={() => (window.history.length > 1 ? nav(-1) : nav('/library'))} className="rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Back">
            <ChevronLeft />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted">Class {book?.std} {book?.title}</p>
            <p className="truncate text-sm font-semibold">{chapter.title}</p>
          </div>
          <button onClick={() => changeSize(-1)} className="rounded-lg px-2 py-1 text-sm font-semibold text-muted hover:bg-surface-2" aria-label="Smaller text">A−</button>
          <button onClick={() => changeSize(1)} className="rounded-lg px-2 py-1 text-base font-semibold text-muted hover:bg-surface-2" aria-label="Larger text">A+</button>
          <button onClick={() => { setTab('notes'); window.scrollTo(0, 0); }} className={cx('rounded-lg p-2 hover:bg-surface-2', tab === 'notes' ? 'text-brand' : 'text-muted')} aria-label="Summarise this chapter" title="Summarise with AI">
            <SparkleIcon />
          </button>
          {chatAvailable && (
            <Link to={`/chat/${chapterRoom(chapter.id)}`} className="rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Discuss this chapter">
              <ChatIcon />
            </Link>
          )}
          <button onClick={toggleBookmark} className={cx('rounded-lg p-2 hover:bg-surface-2', bookmarked ? 'text-accent' : 'text-muted')} aria-label="Bookmark">
            <BookmarkIcon filled={bookmarked} />
          </button>
        </div>
        <Bar value={progress * 100} className="h-1 rounded-none" />
      </header>

      <div className={cx(highlights.length > 0 && 'lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8')}>
      <div className="min-w-0 px-5 pb-24 pt-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {chapter.units.map((u) => <Pill key={u} tone="brand">{unitByCode(u)?.short ?? u}</Pill>)}
          <Pill>Pages {chapter.pages[0]}–{chapter.pages[1]}</Pill>
          <Pill>{Math.max(1, Math.round(chapter.words / 200))} min read</Pill>
        </div>
        <h1 className="mb-4 font-serif text-2xl font-semibold leading-tight">{chapter.title}</h1>

        <div className={cx('mb-5 grid rounded-xl bg-surface-2 p-1 text-sm font-semibold', tabs.length === 3 ? 'grid-cols-3 lg:grid-cols-2' : 'grid-cols-2')}>
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cx('flex items-center justify-center gap-1.5 rounded-lg py-2', t === 'highlights' && 'lg:hidden', tab === t ? 'bg-surface text-ink shadow-sm' : 'text-muted')}>
              {tabLabel(t)}
            </button>
          ))}
        </div>

        {tab === 'notes' ? (
          <ChapterSummary chapter={chapter} textSize={SIZES[size]} />
        ) : tab === 'highlights' ? (
          <div className="lg:hidden">
            <p className="mb-2 text-sm text-muted">Key points to remember. Tap one to see it underlined in the chapter.</p>
            <HighlightList highlights={highlights} onJump={() => setTab('read')} />
          </div>
        ) : null}
        {/* The text stays mounted (hidden) so highlight links can scroll to it; on desktop the Highlights tab doesn't exist. */}
        <ChapterText chapter={chapter} className={cx(SIZES[size], tab === 'notes' && 'hidden', tab === 'highlights' && 'hidden lg:block')} />

        <div className="mt-10 rounded-2xl border border-line bg-surface p-4 text-center">
          <p className="font-semibold">Finished reading?</p>
          <p className="mb-3 text-sm text-muted">Test yourself on this chapter.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <LinkButton to={`/quiz/play?mode=chapter&chapter=${chapter.id}`}>Practise this chapter</LinkButton>
            <LinkButton to={`/quiz/print?mode=chapter&chapter=${chapter.id}&count=20`} variant="secondary"><PrintIcon size={18} /> Pen & paper</LinkButton>
            {chatAvailable && <LinkButton to={`/chat/${chapterRoom(chapter.id)}`} variant="secondary">Discuss</LinkButton>}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {prev ? (
            <Link to={`/read/${prev.id}`} className="rounded-xl border border-line p-3 text-left hover:border-brand">
              <span className="flex items-center gap-1 text-xs text-muted"><ChevronLeft size={14} /> Previous</span>
              <span className="line-clamp-2 text-sm font-medium">{prev.title}</span>
            </Link>
          ) : <span />}
          {next ? (
            <Link to={`/read/${next.id}`} className="rounded-xl border border-line p-3 text-right hover:border-brand">
              <span className="flex items-center justify-end gap-1 text-xs text-muted">Next <ChevronRight size={14} /></span>
              <span className="line-clamp-2 text-sm font-medium">{next.title}</span>
            </Link>
          ) : <span />}
        </div>
        <p className="mt-6 text-center text-xs text-muted">Source: Tamil Nadu State Council of Educational Research and Training (SCERT) textbook, Class {book?.std}.</p>
        <div className="mt-3 text-center"><Button variant="ghost" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top</Button></div>
      </div>

      {highlights.length > 0 && (
        <aside className="hidden lg:block">
          <div className="sticky top-[4.5rem] max-h-[calc(100dvh-5.5rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-3 mt-5">
            <p className="px-2.5 pb-1 pt-1 font-semibold">Highlights</p>
            <p className="px-2.5 pb-2 text-xs text-muted">{highlights.length} key points · click to find in text</p>
            <HighlightList highlights={highlights} onJump={() => tab === 'notes' && setTab('read')} />
          </div>
        </aside>
      )}
      </div>
    </div>
  );
}
