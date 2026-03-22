import { useState } from 'react';
import { UserProfile, PROFILES, TEST_PROFILE } from '../components/ProfileScreen';

const STORAGE_KEY = 'task_app_user';

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const id = JSON.parse(saved).id;
    return [...PROFILES, TEST_PROFILE].find(p => p.id === id) || null;
  });

  const selectUser = (profile: UserProfile) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: profile.id }));
    setUser(profile);
  };

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return { user, selectUser, signOut };
}
