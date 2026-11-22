import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProfileForm from '../components/ProfileForm';
import { Button, Card, PageTitle, cx } from '../components/ui';
import { ChevronRight, ShieldIcon, UsersIcon } from '../components/icons';
import { api } from '../lib/api';
import { disconnectChat } from '../lib/chat';
import { isStaff, isSuper, useAuth } from '../lib/auth';
import { applyTheme, getTheme, type Theme } from '../lib/theme';

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [theme, setTheme] = useState<Theme>(getTheme());

  return (
    <div className="space-y-4">
      <PageTitle title="Profile" subtitle={user?.email ?? undefined} />

      {isSuper(profile) && (
        <Link to="/admin" className="block">
          <Card className="flex items-center gap-3 hover:border-brand">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><UsersIcon size={20} /></div>
            <div className="flex-1">
              <p className="font-semibold">Admin</p>
              <p className="text-sm text-muted">Exam dates, members and roles</p>
            </div>
            <ChevronRight className="text-muted" />
          </Card>
        </Link>
      )}

      {isStaff(profile) && !isSuper(profile) && (
        <Link to="/admin/review" className="block">
          <Card className="flex items-center gap-3 hover:border-brand">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><ShieldIcon size={20} /></div>
            <div className="flex-1">
              <p className="font-semibold">Review questions</p>
              <p className="text-sm text-muted">Approve, edit or reject AI-drafted questions</p>
            </div>
            <ChevronRight className="text-muted" />
          </Card>
        </Link>
      )}

      <Card>
        <p className="mb-4 font-semibold">Your details</p>
        <ProfileForm />
      </Card>

      <Card>
        <p className="mb-3 font-semibold">Appearance</p>
        <div className="grid grid-cols-3 gap-2">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <button key={t} onClick={() => { applyTheme(t); setTheme(t); }}
              className={cx('rounded-xl border py-2.5 text-sm font-semibold capitalize', theme === t ? 'border-brand bg-brand-soft text-brand' : 'border-line text-muted')}>
              {t === 'system' ? 'Auto' : t}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <p className="font-semibold">About</p>
        <p className="mt-1 text-sm text-muted">
          Study material comes from Tamil Nadu SCERT textbooks. Practice questions are drafted with AI and checked by our reviewers before they're published.
          Your details are used only to personalise your preparation and are never shared.
        </p>
        <p className="mt-2 text-sm text-muted">TNPSC Master is an independent study aid, not affiliated with TNPSC or the Government of Tamil Nadu. <Link to="/privacy" className="text-brand underline">Privacy policy</Link></p>
      </Card>

      <Button variant="danger" className="w-full" onClick={async () => { disconnectChat(); await api.signOut(); nav('/login', { replace: true }); }}>
        Sign out
      </Button>
    </div>
  );
}
