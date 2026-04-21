-- RLS hardening for public schema (Supabase/Postgres)
-- Assumes authenticated access only and role claims via auth.jwt() ->> 'role'.
-- Ownership checks use auth.uid() (cast to text for compatibility).

-- 1) Enable RLS on all known public tables
alter table if exists public.app_user_roles enable row level security;
alter table if exists public.user_progress enable row level security;
alter table if exists public.lesson_content enable row level security;
alter table if exists public.quizzes enable row level security;
alter table if exists public.quiz_attempts enable row level security;
alter table if exists public.user_gamification enable row level security;
alter table if exists public.daily_challenge_stats enable row level security;
alter table if exists public.daily_quest_progress enable row level security;

-- 1a) Optional ownership columns for content tables (safe if they already exist).
alter table if exists public.lesson_content add column if not exists created_by text;
alter table if exists public.quizzes add column if not exists created_by text;

-- 2) Clean up legacy or conflicting policies
drop policy if exists "read_published_lesson_content" on public.lesson_content;
drop policy if exists "staff_read_all_lesson_content" on public.lesson_content;
drop policy if exists "teacher_or_admin_insert_lesson_content" on public.lesson_content;
drop policy if exists "teacher_or_admin_update_lesson_content" on public.lesson_content;
drop policy if exists "admin_delete_lesson_content" on public.lesson_content;

drop policy if exists "read_own_or_staff_user_progress" on public.user_progress;
drop policy if exists "insert_own_or_staff_user_progress" on public.user_progress;
drop policy if exists "update_own_or_staff_user_progress" on public.user_progress;
drop policy if exists "admin_delete_user_progress" on public.user_progress;

drop policy if exists "read_own_or_admin_user_role" on public.app_user_roles;
drop policy if exists "admin_insert_user_role" on public.app_user_roles;
drop policy if exists "admin_update_user_role" on public.app_user_roles;
drop policy if exists "admin_delete_user_role" on public.app_user_roles;

-- 3) Admin override for all tables (FOR ALL)
drop policy if exists "rls_app_user_roles_admin_all" on public.app_user_roles;
-- Policy: rls_app_user_roles_admin_all
create policy "rls_app_user_roles_admin_all"
  on public.app_user_roles
  for all
  to authenticated
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

drop policy if exists "rls_user_progress_admin_all" on public.user_progress;
-- Policy: rls_user_progress_admin_all
create policy "rls_user_progress_admin_all"
  on public.user_progress
  for all
  to authenticated
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

drop policy if exists "rls_lesson_content_admin_all" on public.lesson_content;
-- Policy: rls_lesson_content_admin_all
create policy "rls_lesson_content_admin_all"
  on public.lesson_content
  for all
  to authenticated
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

drop policy if exists "rls_quizzes_admin_all" on public.quizzes;
-- Policy: rls_quizzes_admin_all
create policy "rls_quizzes_admin_all"
  on public.quizzes
  for all
  to authenticated
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

drop policy if exists "rls_quiz_attempts_admin_all" on public.quiz_attempts;
-- Policy: rls_quiz_attempts_admin_all
create policy "rls_quiz_attempts_admin_all"
  on public.quiz_attempts
  for all
  to authenticated
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

drop policy if exists "rls_user_gamification_admin_all" on public.user_gamification;
-- Policy: rls_user_gamification_admin_all
create policy "rls_user_gamification_admin_all"
  on public.user_gamification
  for all
  to authenticated
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

drop policy if exists "rls_daily_challenge_stats_admin_all" on public.daily_challenge_stats;
-- Policy: rls_daily_challenge_stats_admin_all
create policy "rls_daily_challenge_stats_admin_all"
  on public.daily_challenge_stats
  for all
  to authenticated
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

drop policy if exists "rls_daily_quest_progress_admin_all" on public.daily_quest_progress;
-- Policy: rls_daily_quest_progress_admin_all
create policy "rls_daily_quest_progress_admin_all"
  on public.daily_quest_progress
  for all
  to authenticated
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

-- 4) Ownership-based policies
-- app_user_roles: admin-only management (ownership not exposed).

-- user_progress: users can manage only their own progress.
drop policy if exists "rls_user_progress_select_own" on public.user_progress;
-- Policy: rls_user_progress_select_own
create policy "rls_user_progress_select_own"
  on public.user_progress
  for select
  to authenticated
  using (user_id::text = auth.uid()::text);

drop policy if exists "rls_user_progress_insert_own" on public.user_progress;
-- Policy: rls_user_progress_insert_own
create policy "rls_user_progress_insert_own"
  on public.user_progress
  for insert
  to authenticated
  with check (user_id::text = auth.uid()::text);

drop policy if exists "rls_user_progress_update_own" on public.user_progress;
-- Policy: rls_user_progress_update_own
create policy "rls_user_progress_update_own"
  on public.user_progress
  for update
  to authenticated
  using (user_id::text = auth.uid()::text)
  with check (user_id::text = auth.uid()::text);

drop policy if exists "rls_user_progress_delete_own" on public.user_progress;
-- Policy: rls_user_progress_delete_own
create policy "rls_user_progress_delete_own"
  on public.user_progress
  for delete
  to authenticated
  using (user_id::text = auth.uid()::text);

-- quiz_attempts: users can create/view/update/delete only their own attempts.
drop policy if exists "rls_quiz_attempts_select_own" on public.quiz_attempts;
-- Policy: rls_quiz_attempts_select_own
create policy "rls_quiz_attempts_select_own"
  on public.quiz_attempts
  for select
  to authenticated
  using (user_id::text = auth.uid()::text);

drop policy if exists "rls_quiz_attempts_insert_own" on public.quiz_attempts;
-- Policy: rls_quiz_attempts_insert_own
create policy "rls_quiz_attempts_insert_own"
  on public.quiz_attempts
  for insert
  to authenticated
  with check (user_id::text = auth.uid()::text);

drop policy if exists "rls_quiz_attempts_update_own" on public.quiz_attempts;
-- Policy: rls_quiz_attempts_update_own
create policy "rls_quiz_attempts_update_own"
  on public.quiz_attempts
  for update
  to authenticated
  using (user_id::text = auth.uid()::text)
  with check (user_id::text = auth.uid()::text);

drop policy if exists "rls_quiz_attempts_delete_own" on public.quiz_attempts;
-- Policy: rls_quiz_attempts_delete_own
create policy "rls_quiz_attempts_delete_own"
  on public.quiz_attempts
  for delete
  to authenticated
  using (user_id::text = auth.uid()::text);

-- user_gamification: users can view/update their own data.
drop policy if exists "rls_user_gamification_select_own" on public.user_gamification;
-- Policy: rls_user_gamification_select_own
create policy "rls_user_gamification_select_own"
  on public.user_gamification
  for select
  to authenticated
  using (user_id::text = auth.uid()::text);

drop policy if exists "rls_user_gamification_insert_own" on public.user_gamification;
-- Policy: rls_user_gamification_insert_own
create policy "rls_user_gamification_insert_own"
  on public.user_gamification
  for insert
  to authenticated
  with check (user_id::text = auth.uid()::text);

drop policy if exists "rls_user_gamification_update_own" on public.user_gamification;
-- Policy: rls_user_gamification_update_own
create policy "rls_user_gamification_update_own"
  on public.user_gamification
  for update
  to authenticated
  using (user_id::text = auth.uid()::text)
  with check (user_id::text = auth.uid()::text);

drop policy if exists "rls_user_gamification_delete_own" on public.user_gamification;
-- Policy: rls_user_gamification_delete_own
create policy "rls_user_gamification_delete_own"
  on public.user_gamification
  for delete
  to authenticated
  using (user_id::text = auth.uid()::text);

-- daily_challenge_stats: users can manage only their own records.
drop policy if exists "rls_daily_challenge_stats_select_own" on public.daily_challenge_stats;
-- Policy: rls_daily_challenge_stats_select_own
create policy "rls_daily_challenge_stats_select_own"
  on public.daily_challenge_stats
  for select
  to authenticated
  using (user_id::text = auth.uid()::text);

drop policy if exists "rls_daily_challenge_stats_insert_own" on public.daily_challenge_stats;
-- Policy: rls_daily_challenge_stats_insert_own
create policy "rls_daily_challenge_stats_insert_own"
  on public.daily_challenge_stats
  for insert
  to authenticated
  with check (user_id::text = auth.uid()::text);

drop policy if exists "rls_daily_challenge_stats_update_own" on public.daily_challenge_stats;
-- Policy: rls_daily_challenge_stats_update_own
create policy "rls_daily_challenge_stats_update_own"
  on public.daily_challenge_stats
  for update
  to authenticated
  using (user_id::text = auth.uid()::text)
  with check (user_id::text = auth.uid()::text);

drop policy if exists "rls_daily_challenge_stats_delete_own" on public.daily_challenge_stats;
-- Policy: rls_daily_challenge_stats_delete_own
create policy "rls_daily_challenge_stats_delete_own"
  on public.daily_challenge_stats
  for delete
  to authenticated
  using (user_id::text = auth.uid()::text);

-- daily_quest_progress: users can manage only their own records.
drop policy if exists "rls_daily_quest_progress_select_own" on public.daily_quest_progress;
-- Policy: rls_daily_quest_progress_select_own
create policy "rls_daily_quest_progress_select_own"
  on public.daily_quest_progress
  for select
  to authenticated
  using (user_id::text = auth.uid()::text);

drop policy if exists "rls_daily_quest_progress_insert_own" on public.daily_quest_progress;
-- Policy: rls_daily_quest_progress_insert_own
create policy "rls_daily_quest_progress_insert_own"
  on public.daily_quest_progress
  for insert
  to authenticated
  with check (user_id::text = auth.uid()::text);

drop policy if exists "rls_daily_quest_progress_update_own" on public.daily_quest_progress;
-- Policy: rls_daily_quest_progress_update_own
create policy "rls_daily_quest_progress_update_own"
  on public.daily_quest_progress
  for update
  to authenticated
  using (user_id::text = auth.uid()::text)
  with check (user_id::text = auth.uid()::text);

drop policy if exists "rls_daily_quest_progress_delete_own" on public.daily_quest_progress;
-- Policy: rls_daily_quest_progress_delete_own
create policy "rls_daily_quest_progress_delete_own"
  on public.daily_quest_progress
  for delete
  to authenticated
  using (user_id::text = auth.uid()::text);

-- 5) lesson_content / quizzes: published reads for users, teacher/admin own CRUD
-- lesson_content: authenticated users can read published rows.
drop policy if exists "rls_lesson_content_select_published" on public.lesson_content;
-- Policy: rls_lesson_content_select_published
create policy "rls_lesson_content_select_published"
  on public.lesson_content
  for select
  to authenticated
  using (status = 'published');

-- lesson_content: teachers can read all lessons.
drop policy if exists "rls_lesson_content_select_staff" on public.lesson_content;
-- Policy: rls_lesson_content_select_staff
create policy "rls_lesson_content_select_staff"
  on public.lesson_content
  for select
  to authenticated
  using (auth.jwt() ->> 'role' in ('teacher', 'admin'));

-- lesson_content: teachers can create/update/delete only their own content.
drop policy if exists "rls_lesson_content_insert_own" on public.lesson_content;
-- Policy: rls_lesson_content_insert_own
create policy "rls_lesson_content_insert_own"
  on public.lesson_content
  for insert
  to authenticated
  with check (
    auth.jwt() ->> 'role' in ('teacher', 'admin')
    and created_by::text = auth.uid()::text
  );

drop policy if exists "rls_lesson_content_update_own" on public.lesson_content;
-- Policy: rls_lesson_content_update_own
create policy "rls_lesson_content_update_own"
  on public.lesson_content
  for update
  to authenticated
  using (
    auth.jwt() ->> 'role' in ('teacher', 'admin')
    and created_by::text = auth.uid()::text
  )
  with check (
    auth.jwt() ->> 'role' in ('teacher', 'admin')
    and created_by::text = auth.uid()::text
  );

drop policy if exists "rls_lesson_content_delete_own" on public.lesson_content;
-- Policy: rls_lesson_content_delete_own
create policy "rls_lesson_content_delete_own"
  on public.lesson_content
  for delete
  to authenticated
  using (
    auth.jwt() ->> 'role' in ('teacher', 'admin')
    and created_by::text = auth.uid()::text
  );

-- quizzes: authenticated users can read quizzes for published lessons.
drop policy if exists "rls_quizzes_select_published" on public.quizzes;
-- Policy: rls_quizzes_select_published
create policy "rls_quizzes_select_published"
  on public.quizzes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.lesson_content lc
      where lc.id = quizzes.lesson_id
        and lc.status = 'published'
    )
  );

-- quizzes: teachers can read all quizzes.
drop policy if exists "rls_quizzes_select_staff" on public.quizzes;
-- Policy: rls_quizzes_select_staff
create policy "rls_quizzes_select_staff"
  on public.quizzes
  for select
  to authenticated
  using (auth.jwt() ->> 'role' in ('teacher', 'admin'));

-- quizzes: teachers can create/update/delete only their own content.
drop policy if exists "rls_quizzes_insert_own" on public.quizzes;
-- Policy: rls_quizzes_insert_own
create policy "rls_quizzes_insert_own"
  on public.quizzes
  for insert
  to authenticated
  with check (
    auth.jwt() ->> 'role' in ('teacher', 'admin')
    and created_by::text = auth.uid()::text
  );

drop policy if exists "rls_quizzes_update_own" on public.quizzes;
-- Policy: rls_quizzes_update_own
create policy "rls_quizzes_update_own"
  on public.quizzes
  for update
  to authenticated
  using (
    auth.jwt() ->> 'role' in ('teacher', 'admin')
    and created_by::text = auth.uid()::text
  )
  with check (
    auth.jwt() ->> 'role' in ('teacher', 'admin')
    and created_by::text = auth.uid()::text
  );

drop policy if exists "rls_quizzes_delete_own" on public.quizzes;
-- Policy: rls_quizzes_delete_own
create policy "rls_quizzes_delete_own"
  on public.quizzes
  for delete
  to authenticated
  using (
    auth.jwt() ->> 'role' in ('teacher', 'admin')
    and created_by::text = auth.uid()::text
  );
