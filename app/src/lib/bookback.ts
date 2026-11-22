/** "Book back questions": textbook exercises + extra questions per chapter, tagged with previous-year papers. */

export type BBKind = 'mcq' | 'ar' | 'tf' | 'fill' | 'match' | 'short' | 'long' | 'hot' | 'num';

export interface PyqTag { paper: string; exam: string; year: number; qno?: number | null }

export interface BBItem {
  id: string;
  k: BBKind;
  src: 'book' | 'extra';
  q: string;
  o?: string[];
  a?: number | boolean | string;
  p?: [string, string][];
  x?: string;
  pyq?: PyqTag[];
}

export interface BBChapter { chapter: string; title: string; std: number; book: string; items: BBItem[] }
export interface BBCounts { n: number; book: number; objective: number; pyq: number }
export interface BBIndex { units: Record<string, { title: string; chapters: Record<string, BBCounts> }> }

export const KIND_LABEL: Record<BBKind, string> = {
  mcq: 'Choose the best answer',
  ar: 'Assertion and reason',
  tf: 'True or false',
  fill: 'Fill in the blanks',
  match: 'Match the following',
  short: 'Short answer questions',
  long: 'Long answer questions',
  hot: 'Higher order thinking (HOT) questions',
  num: 'Problems',
};
export const KIND_ORDER: BBKind[] = ['mcq', 'ar', 'tf', 'fill', 'match', 'short', 'long', 'hot', 'num'];

/** Questions that can be marked automatically in the online quiz. */
export const isObjective = (it: BBItem) => it.k === 'mcq' || it.k === 'ar' || it.k === 'tf';

/** Options and answer index for an objective item (true/false becomes a two-option question). */
export function asChoice(it: BBItem): { options: string[]; answer: number } {
  if (it.k === 'tf') return { options: ['True', 'False'], answer: it.a ? 0 : 1 };
  return { options: it.o ?? [], answer: typeof it.a === 'number' ? it.a : 0 };
}

/** Text form of the answer, for Q&A view and the answer key. */
export function answerText(it: BBItem): string {
  if (it.k === 'mcq' || it.k === 'ar') {
    const i = typeof it.a === 'number' ? it.a : 0;
    return `(${'abcd'[i]}) ${it.o?.[i] ?? ''}`;
  }
  if (it.k === 'tf') return it.a ? 'True' : 'False';
  if (it.k === 'match') return (it.p ?? []).map(([l, r]) => `${l} – ${r}`).join('; ');
  return String(it.a ?? '');
}

/** Stable shuffle (seeded by the item id) for the right-hand column of match questions. */
export function shuffledRight(it: BBItem): string[] {
  const right = (it.p ?? []).map(([, r]) => r);
  let seed = [...it.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  for (let i = right.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [right[i], right[j]] = [right[j], right[i]];
  }
  return right;
}

export const pyqLabel = (t: PyqTag) => `${t.exam} ${t.year}`;

let index: Promise<BBIndex> | null = null;
export function getBookBackIndex(): Promise<BBIndex> {
  index ??= fetch('/content/bookback/index.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : { units: {} }))
    .catch(() => ({ units: {} }));
  return index;
}

export async function getBookBack(chapter: string): Promise<BBChapter> {
  const r = await fetch(`/content/bookback/${chapter}.json`, { cache: 'no-cache' });
  if (!r.ok) throw new Error('Questions not found');
  return r.json();
}

export const getBookBackMany = (ids: string[]) => Promise.all(ids.map(getBookBack));

export type BBFilter = 'all' | 'book' | 'extra' | 'pyq';
export const FILTER_LABEL: Record<BBFilter, string> = { all: 'All', book: 'Book back', extra: 'More questions', pyq: 'Asked before' };
export function applyFilter(items: BBItem[], f: BBFilter): BBItem[] {
  if (f === 'book') return items.filter((i) => i.src === 'book');
  if (f === 'extra') return items.filter((i) => i.src === 'extra');
  if (f === 'pyq') return items.filter((i) => i.pyq?.length);
  return items;
}
