import { ProgressMap } from './progressStorage';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

function hasRestBackendConfig() {
  return Boolean(API_BASE_URL && API_BASE_URL.trim());
}

export async function fetchRemoteProgress(userId: string): Promise<ProgressMap | null> {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from('user_progress')
      .select('progress_map')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch Supabase progress (${error.message})`);
    }

    return (data?.progress_map as ProgressMap) ?? {};
  }

  if (!hasRestBackendConfig()) return null;

  const response = await fetch(`${API_BASE_URL}/progress/${encodeURIComponent(userId)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch progress (${response.status})`);
  }

  const payload = (await response.json()) as { progressMap?: ProgressMap };
  return payload.progressMap ?? {};
}

export async function syncRemoteProgress(userId: string, progressMap: ProgressMap): Promise<void> {
  if (hasSupabaseConfig && supabase) {
    const { error } = await supabase.from('user_progress').upsert(
      {
        user_id: userId,
        progress_map: progressMap,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      throw new Error(`Failed to sync Supabase progress (${error.message})`);
    }
    return;
  }

  if (!hasRestBackendConfig()) return;

  const response = await fetch(`${API_BASE_URL}/progress/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, progressMap }),
  });

  if (!response.ok) {
    throw new Error(`Failed to sync progress (${response.status})`);
  }
}
