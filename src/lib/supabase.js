import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PROFILE_STORAGE_KEY = 'ahmed_visuals_profile';

export async function ensureAuthSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('Anonymous sign-in failed:', error.message);
    return null;
  }
  return data.user;
}

export function getSavedProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveVisitorProfile(displayName) {
  const user = await ensureAuthSession();
  if (!user) throw new Error('Authentication unavailable');
  const trimmed = displayName.trim();
  if (!trimmed) throw new Error('Name is required');

  const profile = {
    id: user.id,
    display_name: trimmed,
    role: 'visitor',
    avatar_seed: trimmed.slice(0, 2).toUpperCase()
  };

  const { error } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' });
  if (error) throw error;

  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  return profile;
}
