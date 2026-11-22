import { NavLink, Outlet, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { isStaff, isSuper, useAuth } from '../lib/auth';
import { BookIcon, CalendarIcon, ChartIcon, ChatIcon, HomeIcon, NewsIcon, QuizIcon, UserIcon } from './icons';
import { cx } from './ui';

const NAV = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/learn', label: 'Learn', icon: BookIcon },
  { to: '/quiz', label: 'Quiz', icon: QuizIcon },
  { to: '/chat', label: 'Discuss', icon: ChatIcon },
  { to: '/news', label: 'News', icon: NewsIcon },
  { to: '/progress', label: 'Progress', icon: ChartIcon },
];

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
      <img src="/favicon.svg" alt="" className="h-7 w-7" />
      <span>TNPSC <span className="text-brand">Master</span></span>
    </Link>
  );
}

export default function Layout() {
  const { profile } = useAuth();
  const initials = (profile?.full_name ?? '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  const avatar = (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
      {profile?.full_name ? initials : <UserIcon size={18} />}
    </span>
  );
  const demo = api.mode === 'demo' && (
    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent" title="Data is stored only in this browser">
      Demo mode
    </span>
  );
  const sideLink = ({ isActive }: { isActive: boolean }) =>
    cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium', isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-2 hover:text-ink');

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <div className="flex flex-col items-start gap-2 whitespace-nowrap px-2"><Brand />{demo}</div>
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={sideLink}><Icon size={20} />{label}</NavLink>
          ))}
          {isStaff(profile) && <NavLink to="/admin/review" className={sideLink}><QuizIcon size={20} />Review</NavLink>}
          {isSuper(profile) && <NavLink to="/admin" end className={sideLink}><CalendarIcon size={20} />Admin</NavLink>}
        </nav>
        <NavLink to="/profile" className={({ isActive }) => cx('mt-auto flex items-center gap-3 rounded-xl p-2', isActive ? 'bg-brand-soft' : 'hover:bg-surface-2')}>
          {avatar}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{profile?.full_name ?? 'Profile'}</span>
            <span className="block text-xs text-muted">Profile & settings</span>
          </span>
        </NavLink>
        <p className="mt-3 px-2 text-[11px] leading-snug text-muted">
          Not affiliated with TNPSC or the Government of Tamil Nadu. <Link to="/privacy" className="underline">Privacy</Link>
        </p>
      </aside>

      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col lg:max-w-5xl">
        {/* Phone / tablet header */}
        <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center gap-3 px-4">
            <Brand />
            {demo}
            <nav className="ml-auto hidden items-center gap-1 md:flex">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end}
                  className={({ isActive }) => cx('rounded-lg px-3 py-1.5 text-sm font-medium', isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:text-ink')}>
                  {n.label}
                </NavLink>
              ))}
            </nav>
            <Link to="/profile" aria-label="Profile" className="ml-auto md:ml-2">{avatar}</Link>
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-4 md:pb-10 lg:px-10 lg:pt-8">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-3xl grid-cols-6">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium', isActive ? 'text-brand' : 'text-muted')}>
                <Icon size={22} />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
