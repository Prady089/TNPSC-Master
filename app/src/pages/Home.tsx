import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { chapterIndex } from '../lib/content';
import { pct, streakFrom, useAsync } from '../lib/hooks';
import { DAILY_SIZE, istDate, unitByCode, UNITS } from '../shared/syllabus';
import { Bar, Card, LinkButton, Pill, Spinner } from '../components/ui';
import ExamTimeline from '../components/ExamTimeline';
import DailyQuote from '../components/DailyQuote';
import { BookIcon, ChevronRight, FlameIcon, NewsIcon, TargetIcon } from '../components/icons';

export default function Home() {
  const { profile } = useAuth();
  const today = istDate();
  const { data, loading } = useAsync(async () => {
    const [attempts, stats, reading, news, chapters] = await Promise.all([
      api.getAttempts(100),
      api.getUnitStats(),
      api.getReading(),
      api.getNews(20).catch(() => []),
      chapterIndex().catch(() => new Map()),
    ]);
    return { attempts, stats, reading, news, chapters };
  }, []);

  if (loading || !data) return <Spinner />;
  const { attempts, stats, reading, news, chapters } = data;

  const daily = attempts.find((a) => a.mode === 'daily' && a.quiz_date === today);
  const todayAnswered = attempts.filter((a) => istDate(new Date(a.created_at)) === today).reduce((s, a) => s + a.total, 0);
  const goal = profile?.daily_goal ?? 20;
  const streak = streakFrom(attempts.map((a) => istDate(new Date(a.created_at))), today);
  const answered = stats.reduce((s, x) => s + x.answered, 0);
  const correct = stats.reduce((s, x) => s + x.correct, 0);
  const weakest = stats
    .filter((s) => s.answered >= 5 && s.unit_code !== 'CA')
    .sort((a, b) => a.correct / a.answered - b.correct / b.answered)[0];
  const untouched = UNITS.find((u) => u.weight > 0 && !stats.some((s) => s.unit_code === u.code));
  const lastRead = [...reading].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  const lastChapter = lastRead ? chapters.get(lastRead.chapter_id) : undefined;
  const first = profile?.full_name?.split(' ')[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <img src="/logo-256.png" alt="TNPSC Master" className="h-20 w-20 shrink-0 object-contain drop-shadow-sm sm:h-24 sm:w-24" />
        <div className="min-w-0">
          <p className="text-sm text-muted">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="text-2xl font-bold tracking-tight">Vanakkam{first ? `, ${first}` : ''}</h1>
          {api.mode === 'demo' && (
            <span className="mt-1 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent md:hidden">Demo mode</span>
          )}
        </div>
      </div>

      <DailyQuote />
      <ExamTimeline />

      <div className="grid items-start gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
      {/* Daily quiz */}
      <Card className="relative overflow-hidden border-0 bg-brand text-brand-ink">
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Today's quiz</p>
          {daily ? (
            <>
              <p className="mt-1 text-3xl font-bold">{daily.correct}/{daily.total}</p>
              <p className="text-sm opacity-85">Done for today. Come back tomorrow for a new set.</p>
              <LinkButton to={`/quiz/play?mode=daily&review=1`} variant="secondary" className="mt-4">Review answers</LinkButton>
            </>
          ) : (
            <>
              <p className="mt-1 text-lg font-semibold">{DAILY_SIZE} questions, weighted like the real Prelims</p>
              <p className="text-sm opacity-85">Includes current affairs. Takes about 15 minutes.</p>
              <LinkButton to="/quiz/play?mode=daily" variant="secondary" className="mt-4">Start daily quiz</LinkButton>
            </>
          )}
        </div>
        <svg className="absolute -right-6 -top-6 h-40 w-40 opacity-10" viewBox="0 0 100 100" aria-hidden><circle cx="50" cy="50" r="48" fill="currentColor" /></svg>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <FlameIcon size={20} className="text-accent" />
          <p className="mt-1 text-xl font-bold">{streak}</p>
          <p className="text-xs text-muted">day streak</p>
        </Card>
        <Card className="p-3">
          <TargetIcon size={20} className="text-brand" />
          <p className="mt-1 text-xl font-bold">{answered ? `${pct(correct, answered)}%` : '–'}</p>
          <p className="text-xs text-muted">accuracy</p>
        </Card>
        <Card className="p-3">
          <BookIcon size={20} className="text-good" />
          <p className="mt-1 text-xl font-bold">{Math.min(todayAnswered, 999)}<span className="text-sm font-medium text-muted">/{goal}</span></p>
          <p className="text-xs text-muted">today's goal</p>
          <Bar value={pct(todayAnswered, goal)} tone="good" className="mt-2 h-1.5" />
        </Card>
      </div>

      {/* Continue reading */}
      {lastChapter && (
        <Link to={`/read/${lastChapter.id}`} className="block">
          <Card className="flex items-center gap-3 hover:border-brand">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><BookIcon /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">Continue reading · Class {lastChapter.std} {lastChapter.bookTitle}</p>
              <p className="truncate font-semibold">{lastChapter.title}</p>
              <Bar value={(lastRead.progress ?? 0) * 100} className="mt-2 h-1.5" />
            </div>
            <ChevronRight className="text-muted" />
          </Card>
        </Link>
      )}

      {/* Focus suggestion */}
      {(weakest || untouched) && (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Suggested focus</p>
          {weakest ? (
            <>
              <p className="mt-1 font-semibold">{unitByCode(weakest.unit_code)?.title}</p>
              <p className="text-sm text-muted">Your weakest unit so far: {pct(weakest.correct, weakest.answered)}% correct over {weakest.answered} questions.</p>
              <LinkButton to={`/quiz/play?mode=unit&unit=${weakest.unit_code}`} variant="secondary" className="mt-3">Practise this unit</LinkButton>
            </>
          ) : untouched && (
            <>
              <p className="mt-1 font-semibold">{untouched.title}</p>
              <p className="text-sm text-muted">{untouched.weight} of 200 Prelims questions come from this unit, and you haven't tried it yet.</p>
              <LinkButton to={`/quiz/play?mode=unit&unit=${untouched.code}`} variant="secondary" className="mt-3">Try 10 questions</LinkButton>
            </>
          )}
        </Card>
      )}

      </div>

      {/* News */}
      <Card className="lg:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-2 font-semibold"><NewsIcon size={18} /> Tamil Nadu today</p>
          <Link to="/news" className="text-sm font-medium text-brand">All news</Link>
        </div>
        {news.length ? (
          <ul className="-mr-2 max-h-[26rem] divide-y divide-line overflow-y-auto overscroll-contain pr-2 lg:max-h-[34rem]">
            {news.map((n) => (
              <li key={n.id} className="py-2.5">
                <a href={n.url} target="_blank" rel="noreferrer" className="font-medium leading-snug hover:text-brand">{n.title}</a>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                  <Pill>{n.source}</Pill>
                  {n.tags.slice(0, 2).map((t) => <span key={t}>#{t}</span>)}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">News appears here once the daily news job is connected.</p>
        )}
      </Card>
      </div>
    </div>
  );
}
