import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Profile } from '../lib/types';
import { Button, ErrorNote, Field, inputCls } from './ui';

export const TN_DISTRICTS = [
  'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi',
  'Kancheepuram', 'Kanniyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal',
  'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur',
  'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai',
  'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar', 'Outside Tamil Nadu',
];
const EDUCATION = ['Undergraduate (pursuing)', "Bachelor's degree", "Master's degree", 'Professional degree (BE / MBBS / LLB …)', 'Doctorate'];
const thisYear = new Date().getFullYear();
const YEARS = [thisYear + 1, thisYear + 2, thisYear + 3];

export default function ProfileForm({ submitLabel = 'Save', onSaved }: { submitLabel?: string; onSaved?: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const [f, setF] = useState<Partial<Profile>>({
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    district: profile?.district ?? '',
    education: profile?.education ?? '',
    target_year: profile?.target_year ?? YEARS[0],
    attempt_number: profile?.attempt_number ?? 1,
    daily_goal: profile?.daily_goal ?? 20,
    preferred_lang: profile?.preferred_lang ?? 'en',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => {
    setSaved(false);
    setF((p) => ({ ...p, [k]: v }));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.saveProfile({ ...f, phone: f.phone?.trim() || null, full_name: f.full_name?.trim() || null });
      await refreshProfile();
      setSaved(true);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Full name">
        <input className={inputCls} value={f.full_name ?? ''} onChange={(e) => set('full_name', e.target.value)} required />
      </Field>
      <Field label="Mobile number" hint="Optional. Used only for exam reminders if you turn them on later.">
        <input className={inputCls} type="tel" inputMode="numeric" pattern="[0-9+ ]{10,14}" value={f.phone ?? ''}
          onChange={(e) => set('phone', e.target.value)} placeholder="98xxxxxxxx" />
      </Field>
      <Field label="District">
        <select className={inputCls} value={f.district ?? ''} onChange={(e) => set('district', e.target.value)} required>
          <option value="" disabled>Select your district</option>
          {TN_DISTRICTS.map((d) => <option key={d}>{d}</option>)}
        </select>
      </Field>
      <Field label="Highest qualification">
        <select className={inputCls} value={f.education ?? ''} onChange={(e) => set('education', e.target.value)} required>
          <option value="" disabled>Select</option>
          {EDUCATION.map((d) => <option key={d}>{d}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Target exam year">
          <select className={inputCls} value={f.target_year ?? ''} onChange={(e) => set('target_year', Number(e.target.value))}>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Field label="Group 1 attempts so far">
          <select className={inputCls} value={f.attempt_number ?? 1} onChange={(e) => set('attempt_number', Number(e.target.value))}>
            <option value={1}>First attempt</option>
            <option value={2}>1 before</option>
            <option value={3}>2 before</option>
            <option value={4}>3 or more</option>
          </select>
        </Field>
      </div>
      <Field label="Daily practice goal">
        <div className="grid grid-cols-3 gap-2">
          {[10, 20, 40].map((g) => (
            <button type="button" key={g} onClick={() => set('daily_goal', g)}
              className={`rounded-xl border py-2.5 text-sm font-semibold ${f.daily_goal === g ? 'border-brand bg-brand-soft text-brand' : 'border-line text-muted'}`}>
              {g} questions
            </button>
          ))}
        </div>
      </Field>
      <Field label="App language" hint="Tamil is coming soon; English is used for now.">
        <div className="grid grid-cols-2 gap-2">
          {(['en', 'ta'] as const).map((l) => (
            <button type="button" key={l} onClick={() => set('preferred_lang', l)}
              className={`rounded-xl border py-2.5 text-sm font-semibold ${f.preferred_lang === l ? 'border-brand bg-brand-soft text-brand' : 'border-line text-muted'}`}>
              {l === 'en' ? 'English' : 'தமிழ்'}
            </button>
          ))}
        </div>
      </Field>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Saving…' : saved ? 'Saved ✓' : submitLabel}</Button>
    </form>
  );
}
