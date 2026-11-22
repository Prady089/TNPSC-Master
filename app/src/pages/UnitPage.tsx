import { useParams } from 'react-router-dom';
import ChapterList from '../components/ChapterList';
import { Card, Empty, LinkButton, PageTitle, Spinner } from '../components/ui';
import { chatAvailable, unitRoom } from '../lib/chat';
import { api } from '../lib/api';
import { getCatalog } from '../lib/content';
import { useAsync } from '../lib/hooks';
import { unitByCode } from '../shared/syllabus';

export default function UnitPage() {
  const { code = '' } = useParams();
  const unit = unitByCode(code);
  const { data, loading } = useAsync(async () => {
    const [catalog, reading] = await Promise.all([getCatalog(), api.getReading()]);
    const chapters = catalog.books
      .flatMap((b) => b.chapters.map((c) => ({ ...c, std: b.std, bookLabel: `Class ${b.std} ${b.title}` })))
      .filter((c) => c.units.includes(code) && c.relevant !== false)
      .sort((a, b) => b.std - a.std); // higher classes first: closest to degree standard
    return { chapters, reading };
  }, [code]);

  if (!unit) return <Empty title="Unknown unit" />;
  return (
    <div>
      <PageTitle title={unit.title} subtitle={`${unit.weight} of 200 Prelims questions`}
        action={
          <div className="flex shrink-0 gap-2">
            {chatAvailable && <LinkButton to={`/chat/${unitRoom(code!)}`} variant="ghost">Discuss</LinkButton>}
            <LinkButton to={`/quiz/play?mode=unit&unit=${code}`} variant="secondary">Practise</LinkButton>
          </div>
        } />
      {loading || !data ? <Spinner /> : data.chapters.length ? (
        <>
          <p className="mb-3 text-sm text-muted">{data.chapters.length} chapters, higher classes first. Start with Class 11–12 for depth, then use 6–10 to fill gaps.</p>
          <ChapterList chapters={data.chapters} reading={data.reading} showBook />
        </>
      ) : (
        <Card>
          <Empty title="Practice-based unit">
            This unit is best learnt by solving problems. Use the practice quiz; the 7th and 8th Maths books are under Aptitude.
          </Empty>
        </Card>
      )}
    </div>
  );
}
