import type { Book } from '../lib/types';

/** TNPSC exam groups a student can prepare for. All use the same SCERT books; they differ in depth. */
export type GroupCode = 'g1' | 'g2' | 'g4';

export const GROUPS: { code: GroupCode; label: string; short: string; level: string; note: string }[] = [
  { code: 'g1', label: 'Group 1', short: 'Group 1', level: 'Degree standard',
    note: 'Deputy Collector, DSP, Assistant Commissioner and similar posts. Classes 6–12 in depth.' },
  { code: 'g2', label: 'Group 2 / 2A', short: 'Group 2', level: 'Degree standard',
    note: 'Sub-Registrar, Municipal Commissioner, Assistant Section Officer and similar posts. Classes 6–12.' },
  { code: 'g4', label: 'Group 4 (and 3)', short: 'Group 4', level: 'SSLC standard',
    note: 'VAO, Junior Assistant, Typist and similar posts. Classes 6–10 first; strong General Tamil section.' },
];

export const groupByCode = (c: string | null | undefined) => GROUPS.find((g) => g.code === c);

/** Whether a book belongs in the study plan for this group. */
export function bookFitsGroup(book: Pick<Book, 'std'>, group: GroupCode): boolean {
  if (group === 'g4') return book.std <= 10;
  return true;
}
