import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = ({ size = 22, ...p }: P) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
});

export const HomeIcon = (p: P) => (<svg {...base(p)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></svg>);
export const BookIcon = (p: P) => (<svg {...base(p)}><path d="M12 6.5C10.5 5 8 4.5 4 4.5v14c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-14c-4 0-6.5.5-8 2Z" /><path d="M12 6.5v14" /></svg>);
export const QuizIcon = (p: P) => (<svg {...base(p)}><rect x="4" y="3" width="16" height="18" rx="2.5" /><path d="m8 9 1.5 1.5L12 8" /><path d="M14.5 9.5H17" /><path d="m8 15 1.5 1.5L12 14" /><path d="M14.5 15.5H17" /></svg>);
export const NewsIcon = (p: P) => (<svg {...base(p)}><path d="M4 5h13v14H6a2 2 0 0 1-2-2Z" /><path d="M17 9h3v8a2 2 0 0 1-2 2" /><path d="M8 9h5M8 13h5M8 16h3" /></svg>);
export const UserIcon = (p: P) => (<svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>);
export const ChartIcon = (p: P) => (<svg {...base(p)}><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></svg>);
export const FlameIcon = (p: P) => (<svg {...base(p)}><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5.5 1-8.5Z" /></svg>);
export const CheckIcon = (p: P) => (<svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>);
export const XIcon = (p: P) => (<svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const ChevronRight = (p: P) => (<svg {...base(p)}><path d="m9 5 7 7-7 7" /></svg>);
export const ChevronLeft = (p: P) => (<svg {...base(p)}><path d="m15 5-7 7 7 7" /></svg>);
export const BookmarkIcon = ({ filled, ...p }: P & { filled?: boolean }) => (<svg {...base(p)} fill={filled ? 'currentColor' : 'none'}><path d="M6 4h12v17l-6-4-6 4Z" /></svg>);
export const ClockIcon = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
export const TargetIcon = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>);
export const ExternalIcon = (p: P) => (<svg {...base(p)}><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></svg>);
export const ShieldIcon = (p: P) => (<svg {...base(p)}><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6Z" /><path d="m9 12 2 2 4-4" /></svg>);
export const RefreshIcon = (p: P) => (<svg {...base(p)}><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></svg>);
export const SunMoonIcon = (p: P) => (<svg {...base(p)}><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z" /></svg>);
export const ChatIcon = (p: P) => (<svg {...base(p)}><path d="M4 5h16v11H9l-5 4Z" /><path d="M8 9.5h8M8 12.5h5" /></svg>);
export const SendIcon = (p: P) => (<svg {...base(p)}><path d="M4 12 20 4l-6 16-3-7Z" /><path d="m11 13 9-9" /></svg>);
export const TrashIcon = (p: P) => (<svg {...base(p)}><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>);
export const MuteIcon = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></svg>);
export const UsersIcon = (p: P) => (<svg {...base(p)}><circle cx="9" cy="8" r="3.5" /><path d="M3 20c1-3.5 3.5-5 6-5s5 1.5 6 5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c1.5.6 2.5 2 3 5" /></svg>);
export const CalendarIcon = (p: P) => (<svg {...base(p)}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>);
export const SparkleIcon = (p: P) => (<svg {...base(p)}><path d="M12 3.5 13.8 9 19.5 11 13.8 13 12 18.5 10.2 13 4.5 11 10.2 9Z" /><path d="M18.5 3v3M17 4.5h3M5.5 17v3M4 18.5h3" /></svg>);
export const PrintIcon = (p: P) => (<svg {...base(p)}><path d="M7 8V3h10v5" /><rect x="3" y="8" width="18" height="9" rx="2" /><path d="M7 14h10v7H7Z" /></svg>);
