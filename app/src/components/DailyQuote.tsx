import { istDate } from '../shared/syllabus';

/**
 * One motivational line per day, the same for every student (picked by IST date).
 * Thirukkural lines are our own English renderings of the couplets; the rest are
 * public-domain quotes or written for TNPSC Master.
 */
const QUOTES: { text: string; by: string }[] = [
  { text: 'Even when fate does not help, honest effort always pays the wages of your labour.', by: 'Thirukkural 619' },
  { text: 'Learn thoroughly what is worth learning, and then live by what you have learnt.', by: 'Thirukkural 391' },
  { text: 'The deeper you dig a well in the sand, the more water flows. The more you learn, the more wisdom flows.', by: 'Thirukkural 396' },
  { text: 'Learning is the one wealth that never perishes. All other riches are not true riches.', by: 'Thirukkural 400' },
  { text: 'Those who resolve firmly will achieve exactly what they set out to achieve.', by: 'Thirukkural 666' },
  { text: 'Let every thought you think be about rising higher.', by: 'Thirukkural 596' },
  { text: 'Never lose heart thinking a task is too hard. Effort itself brings greatness.', by: 'Thirukkural 611' },
  { text: 'Those who strive without tiring and without slackening can overcome even fate.', by: 'Thirukkural 620' },
  { text: 'Think it through, then act. Starting first and thinking later is a mistake.', by: 'Thirukkural 467' },
  { text: 'Wait patiently like the crane when the time is not right; strike swiftly when it comes.', by: 'Thirukkural 490' },
  { text: 'A lotus stalk rises as high as the water is deep; a person rises as high as their resolve.', by: 'Thirukkural 595' },
  { text: 'Arise, awake, and stop not till the goal is reached.', by: 'Swami Vivekananda' },
  { text: 'Take up one idea. Make that one idea your life; think of it, dream of it, live on that idea.', by: 'Swami Vivekananda' },
  { text: 'Strength is life, weakness is death.', by: 'Swami Vivekananda' },
  { text: 'One chapter a day is about 300 chapters in a year. Small steps finish big syllabuses.', by: 'TNPSC Master' },
  { text: 'The officer you want to become is built in the hours nobody sees.', by: 'TNPSC Master' },
  { text: 'You do not need to study everything today. You need to study something today.', by: 'TNPSC Master' },
  { text: 'Every wrong answer in practice is one less wrong answer in the exam hall.', by: 'TNPSC Master' },
  { text: 'Revision turns reading into remembering. Revisit yesterday before starting today.', by: 'TNPSC Master' },
  { text: 'Consistency beats intensity. Ten focused days beat one sleepless night.', by: 'TNPSC Master' },
  { text: 'Your district needs good officers. Study like someone is waiting for you to serve them.', by: 'TNPSC Master' },
  { text: 'Compare yourself only with who you were last week.', by: 'TNPSC Master' },
  { text: 'The syllabus is long, but it is finite. Every page you finish never has to be read for the first time again.', by: 'TNPSC Master' },
  { text: 'Discipline is choosing what you want most over what you want now.', by: 'TNPSC Master' },
  { text: 'A topper is just an aspirant who did not stop.', by: 'TNPSC Master' },
  { text: 'Read the newspaper today; it becomes a question tomorrow.', by: 'TNPSC Master' },
  { text: 'Failure in one attempt is information, not a verdict.', by: 'TNPSC Master' },
  { text: 'Start with the chapter you are avoiding. The rest of the day gets easier.', by: 'TNPSC Master' },
  { text: 'Sleep, food and a short walk are part of preparation too. A tired mind forgets.', by: 'TNPSC Master' },
  { text: 'Write it down. What you write, you remember; what you only read, you recognise.', by: 'TNPSC Master' },
  { text: 'Dream of the chair, but fall in love with the daily routine that leads to it.', by: 'TNPSC Master' },
  { text: 'Today’s 30 minutes of practice is the mark that separates you from the cut-off.', by: 'TNPSC Master' },
  { text: 'Doubt is normal. Keep studying while you doubt.', by: 'TNPSC Master' },
  { text: 'Understand the “why”, and the “what” stays with you.', by: 'TNPSC Master' },
  { text: 'Your family’s pride and your own future are both on the same page you are reading now.', by: 'TNPSC Master' },
  { text: 'Mock tests are rehearsals. Make your mistakes here, not in the hall.', by: 'TNPSC Master' },
  { text: 'One more question. One more page. That is how ranks are made.', by: 'TNPSC Master' },
  { text: 'Focus on what you can control: today’s plan, today’s effort.', by: 'TNPSC Master' },
  { text: 'Knowledge of Tamil Nadu’s history is knowledge of the people you will serve.', by: 'TNPSC Master' },
  { text: 'Be patient with the process and impatient with distractions.', by: 'TNPSC Master' },
  { text: 'Hard chapters become easy chapters the second time.', by: 'TNPSC Master' },
  { text: 'Success is the sum of small efforts, repeated day in and day out.', by: 'TNPSC Master' },
];

export default function DailyQuote() {
  const day = Math.floor(Date.parse(istDate()) / 86_400_000);
  const q = QUOTES[day % QUOTES.length];
  return (
    <figure className="rounded-2xl border border-line bg-surface px-5 py-4">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-accent">Thought for today</p>
      <blockquote className="font-serif text-[17px] leading-snug">“{q.text}”</blockquote>
      <figcaption className="mt-1.5 text-sm text-muted">— {q.by}</figcaption>
    </figure>
  );
}
