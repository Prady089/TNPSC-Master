import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { daysBetween, fmtEventDate, timelineState } from '../shared/exam';
import { istDate } from '../shared/syllabus';
import { Card, cx } from './ui';

/** "N days to Mains" with a milestone bar: Prelims → Result → Mains → Interview. */
export default function ExamTimeline({ compact = false }: { compact?: boolean }) {
  const { data: events } = useAsync(() => api.getExamEvents(), []);
  if (!events?.length) return null;

  const today = istDate();
  const { list, exam } = timelineState(events, today);
  // Milestones are evenly spaced (labels stay readable on phones); today's marker
  // sits proportionally between the two milestones around it.
  const n = list.length;
  const step = n > 1 ? 100 / (n - 1) : 100;
  const posOf = (i: number) => (n > 1 ? i * step : 50);
  const todayPos = (() => {
    const nextI = list.findIndex((e) => daysBetween(today, e.event_date) >= 0);
    if (nextI === -1) return 100;
    if (nextI === 0) return 0;
    const a = list[nextI - 1].event_date, b = list[nextI].event_date;
    const f = daysBetween(a, today) / Math.max(1, daysBetween(a, b));
    return posOf(nextI - 1) + f * step;
  })();
  const days = exam ? daysBetween(today, exam.event_date) : null;
  const anyApprox = list.some((e) => e.is_approx && daysBetween(today, e.event_date) >= 0);

  return (
    <Card className={compact ? 'p-3' : ''}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Group 1 · 2026 cycle</p>
          {exam && days !== null ? (
            <p className="mt-0.5 text-lg font-bold leading-tight">
              {days === 0 ? `${exam.label} is today` : <><span className="text-2xl text-brand">{days}</span> days to {exam.label}</>}
            </p>
          ) : (
            <p className="mt-0.5 text-lg font-bold">All stages done for this cycle</p>
          )}
        </div>
        {exam && (
          <p className="shrink-0 text-right text-xs text-muted">
            {fmtEventDate(exam)}
            {exam.is_approx && <span className="mt-0.5 block rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">approx. date</span>}
          </p>
        )}
      </div>

      {/* Bar */}
      <div className="relative mb-1 mt-5 h-2 rounded-full bg-surface-2" role="img"
        aria-label={`Timeline: ${list.map((e) => `${e.label} ${fmtEventDate(e)}`).join(', ')}`}>
        <div className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${todayPos}%` }} />
        {list.map((e, i) => {
          const done = daysBetween(today, e.event_date) < 0;
          return (
            <span key={e.code} className={cx('absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2',
              done ? 'border-brand bg-brand' : e.is_approx ? 'border-dashed border-muted bg-surface' : 'border-brand bg-surface')}
              style={{ left: `${posOf(i)}%` }} />
          );
        })}
        <span className="absolute -top-1.5 h-5 w-0.5 -translate-x-1/2 rounded bg-accent" style={{ left: `${todayPos}%` }} title="Today" />
      </div>

      {/* Labels */}
      <div className="relative h-9 text-[11px] leading-tight">
        {list.map((e, i) => {
          const edge = i === 0 ? 'left-0 text-left' : i === n - 1 ? 'right-0 text-right' : '-translate-x-1/2 text-center';
          return (
            <div key={e.code} className={cx('absolute top-1', edge)}
              style={i === 0 || i === n - 1 ? { maxWidth: `${step * 0.75}%` } : { left: `${posOf(i)}%`, width: `${step * 0.9}%` }}>
              <p className={cx('font-semibold', daysBetween(today, e.event_date) < 0 ? 'text-muted' : 'text-ink')}>{e.label}</p>
              <p className="text-muted">{fmtEventDate(e)}</p>
            </div>
          );
        })}
      </div>
      {anyApprox && !compact && <p className="mt-1 text-xs text-muted">Dates marked ~ are estimates until TNPSC announces them.</p>}
    </Card>
  );
}
