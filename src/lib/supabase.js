import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://owlglaqltdniywcprzab.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93bGdsYXFsdGRuaXl3Y3ByemFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzNTY2NDgsImV4cCI6MjExMDkzMjY0OH0._Y7iR4YU7z10-TOkRHSYC_466_5pJ3mFSYjRqGgbWGo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PROFILE_STORAGE_KEY = 'artelligence_visitor_profile';

export async function ensureAuthSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('Anonymous sign-in skipped:', error.message);
    return null;
  }
  return data.user;
}

export function getSavedProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY) || localStorage.getItem('ahmed_visuals_profile');
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

export async function notifyLeadAlert(kind, payload) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/notify-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ kind, payload })
    });
  } catch {
    // Non-blocking notification
  }
}
