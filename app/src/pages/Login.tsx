import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, ErrorNote, Field, inputCls } from '../components/ui';
import { BookIcon, NewsIcon, QuizIcon } from '../components/icons';

export default function Login() {
  const { user, loading } = useAuth();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!loading && user) return <Navigate to={from} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'signup') {
        const { needsConfirmation } = await api.signUp(email.trim(), password, name.trim());
        if (needsConfirmation) {
          setInfo('Check your email to confirm your account, then sign in.');
          setMode('signin');
          return;
        }
      } else {
        await api.signIn(email.trim(), password);
      }
      // AuthProvider picks up the session; the <Navigate> above then redirects.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <img src="/favicon.svg" alt="" className="mx-auto mb-4 h-14 w-14" />
        <h1 className="text-2xl font-bold tracking-tight">TNPSC Master</h1>
        <p className="mt-2 text-sm text-muted">Study the SCERT books, take a daily quiz, and follow Tamil Nadu current affairs, all in one place.</p>
        <div className="mt-5 flex justify-center gap-5 text-xs text-muted">
          <span className="flex items-center gap-1.5"><BookIcon size={16} /> 350+ chapters</span>
          <span className="flex items-center gap-1.5"><QuizIcon size={16} /> Daily quiz</span>
          <span className="flex items-center gap-1.5"><NewsIcon size={16} /> TN news</span>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-surface-2 p-1 text-sm font-semibold">
          {(['signin', 'signup'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`rounded-lg py-2 ${mode === m ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}>
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'signup' && (
            <Field label="Full name">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </Field>
          )}
          <Field label="Email">
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          <Field label="Password">
            <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required={api.mode === 'live'} minLength={api.mode === 'live' ? 6 : 0}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
          </Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          {info && <div className="rounded-xl bg-good-soft px-4 py-3 text-sm text-good">{info}</div>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>
        <Button variant="secondary" className="w-full" disabled={busy}
          onClick={() => api.signInWithGoogle().catch((e: Error) => setError(e.message))}>
          Continue with Google
        </Button>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        Not affiliated with TNPSC or the Government of Tamil Nadu. <Link to="/privacy" className="underline">Privacy policy</Link>
      </p>
      {api.mode === 'demo' && (
        <p className="mt-4 text-center text-xs text-muted">
          Demo mode: any email works and your data stays in this browser. Connect Supabase to enable real accounts.
        </p>
      )}
    </div>
  );
}
