// Shared by the app and the serverless cron job.

export type UnitCode = 'GS1' | 'GS2' | 'GS3' | 'GS4' | 'GS5' | 'GS6' | 'APT' | 'RSN' | 'CA';

export interface Unit {
  code: UnitCode;
  title: string;
  short: string;
  weight: number; // questions in the real Prelims paper
}

export const UNITS: Unit[] = [
  { code: 'GS5', title: 'Indian Economy & Development Administration in Tamil Nadu', short: 'Economy & TN Admin', weight: 50 },
  { code: 'GS4', title: 'Indian Polity', short: 'Polity', weight: 40 },
  { code: 'GS6', title: 'History, Culture, Heritage & Socio-Political Movements in Tamil Nadu', short: 'TN History & Culture', weight: 40 },
  { code: 'GS3', title: 'History, Culture of India & Indian National Movement', short: 'Indian History', weight: 25 },
  { code: 'APT', title: 'Aptitude', short: 'Aptitude', weight: 15 },
  { code: 'GS1', title: 'General Science', short: 'Science', weight: 10 },
  { code: 'GS2', title: 'Geography of India', short: 'Geography', weight: 10 },
  { code: 'RSN', title: 'Reasoning & Mental Ability', short: 'Reasoning', weight: 10 },
  { code: 'CA', title: 'Current Affairs (Tamil Nadu & National)', short: 'Current Affairs', weight: 0 },
];

export const unitByCode = (code: string) => UNITS.find((u) => u.code === code);

export const DAILY_SIZE = 20;
export const DAILY_CA = 5;

/** Today's date in India (YYYY-MM-DD). */
export function istDate(d = new Date()): string {
  return new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

/** Small deterministic PRNG so every student gets the same daily set. */
export function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/**
 * Pick the daily quiz: up to DAILY_CA current-affairs questions, the rest split
 * across syllabus units in proportion to their weight in the real exam.
 */
export function pickDaily<T extends { id: string; unit_code: string }>(
  pool: T[],
  date: string,
  recentlyUsed: Set<string> = new Set(),
): string[] {
  const rnd = seededRandom(date);
  const shuffle = <X,>(a: X[]) => {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };
  const fresh = pool.filter((q) => !recentlyUsed.has(q.id));
  const source = fresh.length >= DAILY_SIZE ? fresh : pool;
  const byUnit = new Map<string, T[]>();
  for (const q of shuffle(source)) {
    if (!byUnit.has(q.unit_code)) byUnit.set(q.unit_code, []);
    byUnit.get(q.unit_code)!.push(q);
  }
  const chosen: string[] = [];
  const take = (unit: string, n: number) => {
    const list = byUnit.get(unit) ?? [];
    chosen.push(...list.splice(0, n).map((q) => q.id));
  };
  take('CA', DAILY_CA);

  const units = UNITS.filter((u) => u.weight > 0 && (byUnit.get(u.code)?.length ?? 0) > 0);
  const totalWeight = units.reduce((s, u) => s + u.weight, 0);
  const remaining = DAILY_SIZE - chosen.length;
  // largest-remainder allocation
  const alloc = units.map((u) => ({ u, exact: (u.weight / totalWeight) * remaining }));
  alloc.forEach((a) => take(a.u.code, Math.floor(a.exact)));
  alloc.sort((a, b) => (b.exact % 1) - (a.exact % 1));
  for (const a of alloc) if (chosen.length < DAILY_SIZE) take(a.u.code, 1);
  // top up from whatever is left if some units were short
  const leftovers = shuffle([...byUnit.values()].flat());
  while (chosen.length < DAILY_SIZE && leftovers.length) chosen.push(leftovers.pop()!.id);
  return shuffle(chosen);
}
