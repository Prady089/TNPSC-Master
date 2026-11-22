import type { Catalog, ChapterContent, ChapterMeta } from './types';

let catalog: Promise<Catalog> | null = null;

export function getCatalog(): Promise<Catalog> {
  catalog ??= fetch('/content/books.json').then((r) => {
    if (!r.ok) throw new Error('Could not load the library');
    return r.json();
  });
  return catalog;
}

export async function getChapter(id: string): Promise<ChapterContent> {
  const r = await fetch(`/content/chapters/${id}.json`);
  if (!r.ok) throw new Error('Chapter not found');
  return r.json();
}

export async function chapterIndex(): Promise<Map<string, ChapterMeta & { bookTitle: string; std: number }>> {
  const c = await getCatalog();
  const map = new Map<string, ChapterMeta & { bookTitle: string; std: number }>();
  for (const b of c.books) for (const ch of b.chapters) map.set(ch.id, { ...ch, bookTitle: b.title, std: b.std });
  return map;
}

export const SUBJECT_LABEL: Record<string, string> = {
  science: 'Science',
  geography: 'Geography',
  history: 'History',
  civics: 'Civics',
  'political-science': 'Political Science',
  economics: 'Economics',
  maths: 'Maths',
};
