import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { isStaff, isSuper, useAuth } from '../lib/auth';
import { BookIcon, CalendarIcon, ChartIcon, ChatIcon, HomeIcon, NewsIcon, QuizIcon, UserIcon } from './icons';
import { cx } from './ui';

const NAV = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/library', label: 'Library', icon: BookIcon },
  { to: '/quiz', label: 'Quiz', icon: QuizIcon },
  { to: '/chat', label: 'Discuss', icon: ChatIcon },
  { to: '/news', label: 'News', icon: NewsIcon },
  { to: '/progress', label: 'Progress', icon: ChartIcon },
];
/** Phone tab bar, like a native app. Discuss is on hold, so it lives in the desktop menu only; Profile lives here instead of the top bar. */
const TABS = [...NAV.filter((n) => n.to !== '/chat' && n.to !== '/pyq'), { to: '/profile', label: 'Profile', icon: UserIcon, end: false }];
const TAB_ROOTS = new Set([...TABS.map((n) => n.to), '/chat']);

/** Title shown in the phone app bar on pages below a tab (these get a back arrow). */
function subTitle(path: string): string {
  if (path.startsWith('/learn')) return 'Library';
  if (path.startsWith('/pyq')) return 'Past papers';
  if (path.startsWith('/bookback')) return 'Book back questions';
  if (path.startsWith('/profile')) return 'Profile';
  if (path.startsWith('/admin/review')) return 'Review';
  if (path.startsWith('/admin')) return 'Admin';
  return '';
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
      <img src="/logo-128.png" alt="" className="h-8 w-8 object-contain" />
      <span>TNPSC <span className="text-brand">Master</span></span>
    </Link>
  );
}

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export default function Layout() {
  const { profile } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isRoot = TAB_ROOTS.has(pathname);
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

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
      <aside className="app-chrome sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
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
        {/* Phone / tablet app bar */}
        {/* On phones the main tabs have no top bar (Home shows the big logo); sub-pages keep it for the back arrow. */}
        <header className={cx('app-chrome sticky top-0 z-20 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden', isRoot && 'max-md:hidden')}>
          <div className="flex h-14 items-center gap-2 px-4">
            {isRoot ? (
              <><Brand />{demo}</>
            ) : (
              <>
                <button onClick={goBack} aria-label="Back" className="press -ml-2 flex h-10 w-10 items-center justify-center rounded-full text-ink active:bg-surface-2">
                  <BackIcon />
                </button>
                <span className="truncate text-[17px] font-semibold">{subTitle(pathname)}</span>
              </>
            )}
            <nav className="ml-auto hidden items-center gap-1 md:flex">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end}
                  className={({ isActive }) => cx('rounded-lg px-3 py-1.5 text-sm font-medium', isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:text-ink')}>
                  {n.label}
                </NavLink>
              ))}
            </nav>
            {pathname !== '/profile' && <Link to="/profile" aria-label="Profile" className="press ml-auto max-md:hidden md:ml-2">{avatar}</Link>}
          </div>
        </header>

        <main className={cx('flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-10 md:pt-4 lg:px-10 lg:pt-8',
          isRoot ? 'pt-[calc(1rem+env(safe-area-inset-top))]' : 'pt-4')}>
          <div key={pathname} className="page-enter">
            <Outlet />
          </div>
        </main>

        {/* Phone tab bar */}
        <nav className="app-chrome fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-3xl grid-cols-6">
            {TABS.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => cx('flex flex-col items-center gap-1 pb-2 pt-2.5 text-[10.5px] font-semibold',
                  isActive || (to === '/library' && pathname.startsWith('/learn')) || (to === '/quiz' && (pathname.startsWith('/pyq') || pathname.startsWith('/bookback'))) ? 'text-brand' : 'text-muted')}>
                {({ isActive: exact }) => {
                  const isActive = exact || (to === '/library' && pathname.startsWith('/learn')) || (to === '/quiz' && (pathname.startsWith('/pyq') || pathname.startsWith('/bookback')));
                  return (
                  <>
                    <span className={cx('flex h-8 w-12 items-center justify-center rounded-full transition-colors duration-200',
                      isActive ? 'bg-brand-soft' : 'bg-transparent')}>
                      <Icon size={22} />
                    </span>
                    {label}
                  </>
                  );
                }}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
