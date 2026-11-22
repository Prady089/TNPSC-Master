import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import type { AppUser, Profile } from './types';

interface AuthState {
  user: AppUser | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthState>({ user: null, profile: null, loading: true, refreshProfile: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    setProfile(await api.getProfile().catch(() => null));
  }, []);

  useEffect(() => {
    let alive = true;
    api.currentUser().then(async (u) => {
      if (!alive) return;
      setUser(u);
      if (u) await refreshProfile();
      setLoading(false);
    });
    // Load the profile *before* publishing the user, so route guards never see
    // a signed-in user with a not-yet-loaded profile (would bounce to onboarding).
    const off = api.onAuthChange(async (u) => {
      const p = u ? await api.getProfile().catch(() => null) : null;
      if (!alive) return;
      setProfile(p);
      setUser(u);
    });
    return () => {
      alive = false;
      off();
    };
  }, [refreshProfile]);

  return <Ctx.Provider value={{ user, profile, loading, refreshProfile }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

export const profileComplete = (p: Profile | null) => Boolean(p?.full_name && p?.district && p?.target_year);

export const isStaff = (p: Profile | null) => p?.role === 'admin' || p?.role === 'superadmin';
export const isSuper = (p: Profile | null) => p?.role === 'superadmin';
