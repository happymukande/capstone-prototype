import supabaseClient, { hasSupabaseConfig, isBackendDisabled } from '../../lib/supabaseClient';

const supabase = supabaseClient;

export { hasSupabaseConfig, isBackendDisabled, supabase };
