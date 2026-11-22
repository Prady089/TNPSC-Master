import { useNavigate } from 'react-router-dom';
import ProfileForm from '../components/ProfileForm';
import { useAuth } from '../lib/auth';

export default function Onboarding() {
  const { profile } = useAuth();
  const nav = useNavigate();
  return (
    <div className="mx-auto max-w-md px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Tell us a little about yourself so we can set your daily goal and track your progress.</p>
      <ProfileForm submitLabel="Start preparing" onSaved={() => nav('/', { replace: true })} />
    </div>
  );
}
