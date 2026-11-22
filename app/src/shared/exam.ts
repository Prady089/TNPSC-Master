// Group 1 exam timeline. The live app reads these from the `exam_events` table
// (editable by the super admin); these defaults are used in demo mode.

export interface ExamEvent {
  code: string;
  label: string;
  event_date: string; // YYYY-MM-DD
  is_approx: boolean;
  sort: number;
}

export const DEFAULT_EXAM_EVENTS: ExamEvent[] = [
  { code: 'prelims', label: 'Prelims', event_date: '2026-09-27', is_approx: false, sort: 1 },
  { code: 'prelims_result', label: 'Prelims result', event_date: '2026-12-20', is_approx: true, sort: 2 },
  { code: 'mains', label: 'Mains', event_date: '2027-03-15', is_approx: true, sort: 3 },
  { code: 'interview', label: 'Interview', event_date: '2027-07-15', is_approx: true, sort: 4 },
];

const DAY = 86_400_000;
const toUtc = (d: string) => Date.parse(`${d}T00:00:00Z`);

/** Whole days from `today` (YYYY-MM-DD, IST) to `date`. Negative = in the past. */
export const daysBetween = (today: string, date: string) => Math.round((toUtc(date) - toUtc(today)) / DAY);

export function fmtEventDate(e: Pick<ExamEvent, 'event_date' | 'is_approx'>) {
  const d = new Date(toUtc(e.event_date));
  const opts: Intl.DateTimeFormatOptions = e.is_approx
    ? { month: 'short', year: 'numeric', timeZone: 'UTC' }
    : { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' };
  return (e.is_approx ? '~' : '') + d.toLocaleDateString('en-IN', opts);
}

/** Next upcoming event (today counts as upcoming) and the one before it. */
export function timelineState(events: ExamEvent[], today: string) {
  const list = [...events].sort((a, b) => a.event_date.localeCompare(b.event_date) || a.sort - b.sort);
  const nextIdx = list.findIndex((e) => daysBetween(today, e.event_date) >= 0);
  const next = nextIdx === -1 ? null : list[nextIdx];
  const prev = nextIdx === -1 ? list[list.length - 1] ?? null : nextIdx > 0 ? list[nextIdx - 1] : null;
  // The main "exam" countdown targets the next real exam stage, skipping result dates.
  const exam = list.find((e) => daysBetween(today, e.event_date) >= 0 && !/result/i.test(e.code)) ?? next;
  return { list, next, prev, exam };
}
