import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Card, Empty, ErrorNote, PageTitle, Pill, Spinner } from '../components/ui';
import { ExternalIcon, NewsIcon } from '../components/icons';
import type { NewsItem } from '../lib/types';

const dayLabel = (iso: string | null) => {
  if (!iso) return 'Recent';
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(Date.now() - 86400_000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
};

export default function News() {
  const { data, loading, error } = useAsync(() => api.getNews(60), []);
  if (loading) return <Spinner />;

  const groups = new Map<string, NewsItem[]>();
  for (const n of data ?? []) {
    const k = dayLabel(n.published_at);
    groups.set(k, [...(groups.get(k) ?? []), n]);
  }

  return (
    <div>
      <PageTitle title="Current affairs" subtitle="Tamil Nadu politics and governance, updated every morning" />
      {error && <ErrorNote>{error}</ErrorNote>}
      {!data?.length ? (
        <Card>
          <Empty icon={<NewsIcon size={32} />} title="No news yet">
            {api.mode === 'demo'
              ? 'News is collected by the daily server job (The Hindu, DT Next, Dinamani, Google News). It starts once Supabase and Vercel are connected.'
              : "Today's digest hasn't been collected yet. It runs at 6:00 AM IST."}
          </Empty>
        </Card>
      ) : (
        <div className="space-y-6">
          {[...groups].map(([day, items]) => (
            <section key={day}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">{day}</h2>
              <div className="space-y-3">
                {items.map((n) => (
                  <Card key={n.id} as="article">
                    <a href={n.url} target="_blank" rel="noreferrer" className="group flex items-start gap-2">
                      <h3 className="flex-1 font-semibold leading-snug group-hover:text-brand">{n.title}</h3>
                      <ExternalIcon size={16} className="mt-1 shrink-0 text-muted" />
                    </a>
                    {n.summary && <p className="mt-2 text-sm leading-relaxed">{n.summary}</p>}
                    {n.exam_angle && (
                      <p className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">
                        <span className="font-semibold">Exam angle: </span>{n.exam_angle}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <Pill>{n.source}</Pill>
                      {n.tags.map((t) => <span key={t}>#{t}</span>)}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
          <p className="text-center text-xs text-muted">Summaries are AI-written from headlines. Tap a story to read the full report at the source.</p>
        </div>
      )}
    </div>
  );
}
