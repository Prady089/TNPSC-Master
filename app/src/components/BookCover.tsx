import type { ReactElement } from 'react';
import type { Book } from '../lib/types';

/** Our own book covers (not the official SCERT artwork): colour and icon by subject. */
type Theme = { from: string; to: string; icon: ReactElement };

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const ICONS = {
  science: (<svg viewBox="0 0 24 24" {...stroke}><ellipse cx="12" cy="12" rx="9" ry="3.6" /><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></svg>),
  social: (<svg viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" /></svg>),
  history: (<svg viewBox="0 0 24 24" {...stroke}><path d="M12 2.5 9.5 6h5Z" /><path d="M8.5 6h7l1 4h-9Z" /><path d="M7 10h10l1.2 5H5.8Z" /><path d="M5 15h14l1 6H4Z" /><path d="M11 21v-3h2v3" /></svg>),
  geography: (<svg viewBox="0 0 24 24" {...stroke}><path d="m3 20 6-11 4 6 2.5-3.5L21 20Z" /><circle cx="17" cy="6" r="2" /></svg>),
  polity: (<svg viewBox="0 0 24 24" {...stroke}><path d="M3 9 12 4l9 5" /><path d="M4 9h16M5 20h14M3.5 22h17" /><path d="M6.5 10v8M10 10v8M14 10v8M17.5 10v8" /></svg>),
  maths: (<svg viewBox="0 0 24 24" {...stroke}><path d="M5 4h14v16H5Z" /><path d="M8 8h8M9 13h2M10 12v2M14 13h2M9 17h2M14 16.5l2 1.5M16 16.5l-2 1.5" /></svg>),
};

function theme(book: Book): Theme {
  const id = book.id;
  if (id.endsWith('-maths')) return { from: '#7c3aed', to: '#4c1d95', icon: ICONS.maths };
  if (id.endsWith('-his')) return { from: '#c2410c', to: '#7c2d12', icon: ICONS.history };
  if (id.endsWith('-geo')) return { from: '#0f766e', to: '#134e4a', icon: ICONS.geography };
  if (id.endsWith('-pol')) return { from: '#1d4ed8', to: '#1e3a8a', icon: ICONS.polity };
  if (id.endsWith('-sci-ss')) return { from: '#0e7490', to: '#1e3a8a', icon: ICONS.social };
  if (id.endsWith('-ss')) return { from: '#b45309', to: '#78350f', icon: ICONS.social };
  return { from: '#15803d', to: '#14532d', icon: ICONS.science };
}

export default function BookCover({ book }: { book: Book }) {
  const t = theme(book);
  return (
    <div
      className="relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-r-xl rounded-l-md p-3 text-white shadow-md ring-1 ring-black/10 transition-transform group-hover:-translate-y-1"
      style={{ background: `linear-gradient(150deg, ${t.from}, ${t.to})` }}
    >
      {/* spine */}
      <span className="absolute inset-y-0 left-0 w-2 bg-black/20" aria-hidden />
      <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75">TN SCERT</span>
      <span className="ml-1.5 mt-1 text-[11px] font-medium uppercase tracking-wider text-white/85">Class</span>
      <span className="ml-1.5 text-4xl font-bold leading-none">{book.std}</span>
      <div className="ml-1.5 mt-auto h-12 w-12 text-white/90">{t.icon}</div>
      <span className="ml-1.5 mt-2 text-[15px] font-semibold leading-tight">{book.title}</span>
    </div>
  );
}
