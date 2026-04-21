#!/usr/bin/env node
import 'dotenv/config';
// Quick test script to verify Supabase anonymous client can read published lessons.
// Usage: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in env, then run `node scripts/test-supabase-connection.js`

import supabase, { hasSupabaseConfig } from '../lib/supabaseClient.js';

if (!hasSupabaseConfig || !supabase) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in environment.');
  process.exit(1);
}

async function run() {
  console.log('Querying published lessons...');
  const { data, error } = await supabase.from('lesson_content').select('id,title,status,updated_at').eq('status', 'published').order('updated_at', { ascending: false }).limit(10);
  if (error) {
    console.error('Supabase query error:', error.message || error);
    process.exit(2);
  }
  console.log('Found', Array.isArray(data) ? data.length : 0, 'published lessons:');
  console.table(data);
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(3);
});
