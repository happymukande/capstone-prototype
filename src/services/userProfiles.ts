import supabase, { hasSupabaseConfig } from '../../lib/supabaseClient';

export type UserProfile = {
  userId: string;
  username: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  avatarUrl: string | null;
  createdAt: string;
  lastActiveAt: string | null;
};

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function toUserProfile(row: Record<string, unknown>): UserProfile {
  return {
    userId: String(row.user_id ?? ''),
    username: String(row.username ?? 'Unknown user'),
    email: String(row.email ?? ''),
    role: row.role === 'teacher' || row.role === 'admin' ? row.role : 'student',
    avatarUrl: typeof row.avatar_url === 'string' && row.avatar_url ? row.avatar_url : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    lastActiveAt: typeof row.last_active_at === 'string' ? row.last_active_at : null,
  };
}

export function getDaysActive(createdAt: string) {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  const elapsed = Date.now() - created;
  return Math.max(1, Math.ceil(elapsed / 86_400_000));
}

export function isUserOnline(lastActiveAt: string | null) {
  if (!lastActiveAt) return false;
  const lastActive = new Date(lastActiveAt).getTime();
  if (Number.isNaN(lastActive)) return false;
  return Date.now() - lastActive <= ONLINE_WINDOW_MS;
}

export async function touchCurrentUserActivity(userId?: string | null) {
  if (!hasSupabaseConfig || !supabase || !userId) return;

  await supabase
    .from('user_profiles')
    .update({ last_active_at: new Date().toISOString() })
    .eq('user_id', userId);
}

export async function fetchAdminUserProfiles(): Promise<UserProfile[]> {
  if (!hasSupabaseConfig || !supabase) return [];

  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, username, email, role, avatar_url, created_at, last_active_at')
    .order('last_active_at', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data ?? []).map((row) => toUserProfile(row));
}

export async function fetchCurrentUserProfile(userId?: string | null): Promise<UserProfile | null> {
  if (!hasSupabaseConfig || !supabase || !userId) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, username, email, role, avatar_url, created_at, last_active_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ? toUserProfile(data) : null;
}
