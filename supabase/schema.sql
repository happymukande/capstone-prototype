create table if not exists public.user_progress (
  user_id text primary key,
  progress_map jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_progress enable row level security;

-- Development-only policies for unauthenticated testing.
-- Replace with auth-based policies before production.
drop policy if exists "dev_read_user_progress" on public.user_progress;
create policy "dev_read_user_progress"
  on public.user_progress
  for select
  to anon, authenticated
  using (true);

drop policy if exists "dev_insert_user_progress" on public.user_progress;
create policy "dev_insert_user_progress"
  on public.user_progress
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "dev_update_user_progress" on public.user_progress;
create policy "dev_update_user_progress"
  on public.user_progress
  for update
  to anon, authenticated
  using (true)
  with check (true);
