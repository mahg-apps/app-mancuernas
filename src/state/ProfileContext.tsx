import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadProfile, saveProfile } from '../db';
import { normalizeProfile } from '../lib/training';
import type { Profile } from '../types';

interface Ctx {
  profile: Profile | null;
  loading: boolean;
  save: (p: Profile) => Promise<void>;
}

const ProfileCtx = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile()
      .then((p) => setProfile(p ? normalizeProfile(p) : null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (p: Profile) => {
    const next = { ...p, actualizado: Date.now() };
    await saveProfile(next);
    setProfile(next);
  }, []);

  return <ProfileCtx.Provider value={{ profile, loading, save }}>{children}</ProfileCtx.Provider>;
}

export function useProfile(): Ctx {
  const c = useContext(ProfileCtx);
  if (!c) throw new Error('useProfile fuera de ProfileProvider');
  return c;
}
