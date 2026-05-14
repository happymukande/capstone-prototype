import { SupabaseClient } from '@supabase/supabase-js';

declare const supabase: SupabaseClient | null;

export const isBackendDisabled: boolean;
export const hasSupabaseConfig: boolean;
export default supabase;
