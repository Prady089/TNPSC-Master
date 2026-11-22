import { useParams } from 'react-router-dom';
import ChapterList from '../components/ChapterList';
import { Empty, PageTitle, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { getCatalog } from '../lib/content';
import { useAsync } from '../lib/hooks';

export default function BookPage() {
  const { bookId = '' } = useParams();
  const { data, loading } = useAsync(async () => {
    const [catalog, reading] = await Promise.all([getCatalog(), api.getReading()]);
    return { book: catalog.books.find((b) => b.id === bookId), reading };
  }, [bookId]);

  if (loading || !data) return <Spinner />;
  if (!data.book) return <Empty title="Book not found" />;
  const { book, reading } = data;
  const read = book.chapters.filter((c) => reading.some((r) => r.chapter_id === c.id && r.progress >= 0.95)).length;
  return (
    <div>
      <PageTitle title={`Class ${book.std} ${book.title}`} subtitle={`${book.source} · ${read} of ${book.chapters.length} chapters read`} />
      <ChapterList chapters={book.chapters} reading={reading} />
    </div>
  );
}
