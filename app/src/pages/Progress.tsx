import { api } from '../lib/api';
import { getCatalog } from '../lib/content';
import { pct, streakFrom, useAsync } from '../lib/hooks';
import { istDate, UNITS } from '../shared/syllabus';
import { Bar, Card, Empty, LinkButton, PageTitle, Spinner } from '../components/ui';

export default function Progress() {
  const today = istDate();
  const { data, loading } = useAsync(async () => {
    const [attempts, stats, reading, catalog] = await Promise.all([api.getAttempts(500), api.getUnitStats(), api.getReading(), getCatalog()]);
    return { attempts, stats, reading, catalog };
  }, []);
  if (loading || !data) return <Spinner />;
  const { attempts, stats, reading, catalog } = data;

  if (!attempts.length && !reading.length) {
    return (
      <div>
        <PageTitle title="Progress" />
        <Card>
          <Empty title="Nothing to show yet">Take your first quiz or open a chapter. Your scores, streak and weak areas will appear here.</Empty>
          <div className="text-center"><LinkButton to="/quiz/play?mode=daily">Start today's quiz</LinkButton></div>
        </Card>
      </div>
    );
  }

  const answered = stats.reduce((s, x) => s + x.answered, 0);
  const correct = stats.reduce((s, x) => s + x.correct, 0);
  const days = attempts.map((a) => istDate(new Date(a.created_at)));
  const streak = streakFrom(days, today);
  const totalChapters = catalog.books.reduce((s, b) => s + b.chapters.length, 0);
  const finished = reading.filter((r) => r.progress >= 0.95).length;
  const dailies = attempts.filter((a) => a.mode === 'daily');
  const avgDaily = dailies.length ? Math.round(dailies.reduce((s, a) => s + (a.correct / a.total) * 100, 0) / dailies.length) : null;

  // last 14 days activity
  const last14 = Array.from({ length: 14 }, (_, k) => {
    const d = new Date(today + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - (13 - k));
    const key = d.toISOString().slice(0, 10);
    const qs = attempts.filter((a) => istDate(new Date(a.created_at)) === key).reduce((s, a) => s + a.total, 0);
    return { key, qs, label: d.toLocaleDateString('en-IN', { day: 'numeric', timeZone: 'UTC' }) };
  });
  const maxQs = Math.max(10, ...last14.map((d) => d.qs));

  return (
    <div className="space-y-4">
      <PageTitle title="Progress" subtitle="How you're tracking against the Prelims syllabus" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { v: answered, l: 'questions answered' },
          { v: answered ? `${pct(correct, answered)}%` : '–', l: 'overall accuracy' },
          { v: streak, l: 'day streak' },
          { v: avgDaily !== null ? `${avgDaily}%` : '–', l: `avg. daily score (${dailies.length})` },
        ].map((s) => (
          <Card key={s.l} className="p-3"><p className="text-2xl font-bold">{s.v}</p><p className="text-xs text-muted">{s.l}</p></Card>
        ))}
      </div>

      <Card>
        <p className="mb-3 font-semibold">Last 14 days</p>
        <div className="flex items-end gap-1.5" role="img" aria-label="Questions answered per day for the last 14 days">
          {last14.map((d) => (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-1" title={`${d.key}: ${d.qs} questions`}>
              <span className="text-[10px] font-medium text-muted">{d.qs || ''}</span>
              <div className="flex h-24 w-full items-end">
                <div className={`w-full rounded-t-md ${d.qs ? 'bg-brand' : 'bg-surface-2'}`} style={{ height: `${Math.max(4, (d.qs / maxQs) * 100)}%` }} />
              </div>
              <span className="text-[10px] text-muted">{d.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="mb-1 font-semibold">Accuracy by syllabus unit</p>
        <p className="mb-4 text-xs text-muted">Ordered by how many Prelims questions each unit carries.</p>
        <div className="space-y-4">
          {UNITS.map((u) => {
            const s = stats.find((x) => x.unit_code === u.code);
            const p = s ? pct(s.correct, s.answered) : null;
            return (
              <div key={u.code}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{u.short} <span className="text-xs font-normal text-muted">· {u.weight || 'CA'}{u.weight ? ' Qs' : ''}</span></span>
                  <span className="shrink-0 text-muted">{s ? `${p}% · ${s.answered} done` : 'not started'}</span>
                </div>
                <Bar value={p ?? 0} tone={p === null ? 'brand' : p >= 70 ? 'good' : p >= 45 ? 'accent' : 'bad'} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="font-semibold">Reading</p>
          <p className="text-sm text-muted">{finished} of {totalChapters} chapters</p>
        </div>
        <Bar value={pct(finished, totalChapters)} tone="good" />
        <p className="mt-2 text-xs text-muted">{reading.length - finished} chapters in progress · {reading.filter((r) => r.bookmarked).length} bookmarked</p>
      </Card>
    </div>
  );
}
