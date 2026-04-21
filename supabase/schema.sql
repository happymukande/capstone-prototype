create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Shared timestamp trigger utility.
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Role assignments for authenticated users.
-- Roles: student, teacher, admin.
create table if not exists public.app_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'teacher', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_app_user_roles_updated_at on public.app_user_roles;
create trigger trg_app_user_roles_updated_at
before update on public.app_user_roles
for each row
execute function public.set_updated_at_timestamp();

alter table public.app_user_roles enable row level security;

-- Keep security-definer helpers out of public/exposed schemas.
create or replace function private.has_app_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.app_user_roles aur
      where aur.user_id = (select auth.uid())
        and aur.role = any(required_roles)
    );
$$;

revoke all on function private.has_app_role(text[]) from public;
grant execute on function private.has_app_role(text[]) to authenticated;

-- Optional but useful: every new auth user gets a default student role.
create or replace function private.handle_new_user_default_role()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.app_user_roles (user_id, role)
  values (new.id, 'student')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_handle_new_user_default_role on auth.users;
create trigger trg_handle_new_user_default_role
after insert on auth.users
for each row
execute function private.handle_new_user_default_role();

revoke all on table public.app_user_roles from anon;
grant select, insert, update, delete on table public.app_user_roles to authenticated;

drop policy if exists "read_own_or_admin_user_role" on public.app_user_roles;
create policy "read_own_or_admin_user_role"
  on public.app_user_roles
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.has_app_role(array['admin']))
  );

drop policy if exists "admin_insert_user_role" on public.app_user_roles;
create policy "admin_insert_user_role"
  on public.app_user_roles
  for insert
  to authenticated
  with check ((select private.has_app_role(array['admin'])));

drop policy if exists "admin_update_user_role" on public.app_user_roles;
create policy "admin_update_user_role"
  on public.app_user_roles
  for update
  to authenticated
  using ((select private.has_app_role(array['admin'])))
  with check ((select private.has_app_role(array['admin'])));

drop policy if exists "admin_delete_user_role" on public.app_user_roles;
create policy "admin_delete_user_role"
  on public.app_user_roles
  for delete
  to authenticated
  using ((select private.has_app_role(array['admin'])));

-- Progress sync table used by the mobile client.
create table if not exists public.user_progress (
  user_id text primary key,
  progress_map jsonb not null default '{}'::jsonb,
  gamification_state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_progress
  add column if not exists gamification_state jsonb not null default '{}'::jsonb;

drop trigger if exists trg_user_progress_updated_at on public.user_progress;
create trigger trg_user_progress_updated_at
before update on public.user_progress
for each row
execute function public.set_updated_at_timestamp();

alter table public.user_progress enable row level security;

revoke all on table public.user_progress from anon;
grant select, insert, update, delete on table public.user_progress to authenticated;

drop policy if exists "read_own_or_staff_user_progress" on public.user_progress;
create policy "read_own_or_staff_user_progress"
  on public.user_progress
  for select
  to authenticated
  using (
    user_id = (select auth.uid())::text
    or (select private.has_app_role(array['teacher', 'admin']))
  );

drop policy if exists "insert_own_or_staff_user_progress" on public.user_progress;
create policy "insert_own_or_staff_user_progress"
  on public.user_progress
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())::text
    or (select private.has_app_role(array['teacher', 'admin']))
  );

drop policy if exists "update_own_or_staff_user_progress" on public.user_progress;
create policy "update_own_or_staff_user_progress"
  on public.user_progress
  for update
  to authenticated
  using (
    user_id = (select auth.uid())::text
    or (select private.has_app_role(array['teacher', 'admin']))
  )
  with check (
    user_id = (select auth.uid())::text
    or (select private.has_app_role(array['teacher', 'admin']))
  );

drop policy if exists "admin_delete_user_progress" on public.user_progress;
create policy "admin_delete_user_progress"
  on public.user_progress
  for delete
  to authenticated
  using ((select private.has_app_role(array['admin'])));

-- Curriculum content table for teacher-managed lessons.
-- lecture_notes and quizzes are JSON arrays aligned with the app shape.
create table if not exists public.lesson_content (
  id text primary key,
  title text not null,
  description text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  duration_minutes integer not null default 20
    check (duration_minutes > 0),
  audience text not null default 'secondary-school',
  tags text[] not null default '{}'::text[],
  lecture_notes jsonb not null default '[]'::jsonb,
  quizzes jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.lesson_content
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists idx_lesson_content_status on public.lesson_content(status);
create index if not exists idx_lesson_content_updated_at on public.lesson_content(updated_at desc);
create index if not exists idx_lesson_content_created_by on public.lesson_content(created_by);

create or replace function private.set_lesson_content_creator()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.created_by is null then
      new.created_by = auth.uid();
    end if;
  elsif tg_op = 'UPDATE' then
    new.created_by = old.created_by;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_lesson_content_set_creator on public.lesson_content;
create trigger trg_lesson_content_set_creator
before insert or update on public.lesson_content
for each row
execute function private.set_lesson_content_creator();

drop trigger if exists trg_lesson_content_updated_at on public.lesson_content;
create trigger trg_lesson_content_updated_at
before update on public.lesson_content
for each row
execute function public.set_updated_at_timestamp();

alter table public.lesson_content enable row level security;

revoke all on table public.lesson_content from anon;
grant select on table public.lesson_content to anon;
grant select, insert, update, delete on table public.lesson_content to authenticated;

-- Public can only read published lessons.
drop policy if exists "read_published_lesson_content" on public.lesson_content;
create policy "read_published_lesson_content"
  on public.lesson_content
  for select
  to anon, authenticated
  using (status = 'published');

-- Teachers/admins can read all lessons including draft/archived.
drop policy if exists "staff_read_all_lesson_content" on public.lesson_content;
create policy "staff_read_all_lesson_content"
  on public.lesson_content
  for select
  to authenticated
  using ((select private.has_app_role(array['teacher', 'admin'])));

drop policy if exists "teacher_or_admin_insert_lesson_content" on public.lesson_content;
create policy "teacher_or_admin_insert_lesson_content"
  on public.lesson_content
  for insert
  to authenticated
  with check (
    (select private.has_app_role(array['teacher', 'admin']))
    and (
      created_by is null
      or created_by = (select auth.uid())
    )
  );

drop policy if exists "teacher_or_admin_update_lesson_content" on public.lesson_content;
create policy "teacher_or_admin_update_lesson_content"
  on public.lesson_content
  for update
  to authenticated
  using ((select private.has_app_role(array['teacher', 'admin'])))
  with check ((select private.has_app_role(array['teacher', 'admin'])));

drop policy if exists "admin_delete_lesson_content" on public.lesson_content;
create policy "admin_delete_lesson_content"
  on public.lesson_content
  for delete
  to authenticated
  using ((select private.has_app_role(array['admin'])));

-- Bootstrap example:
-- Upgrade a specific user after signup created their default 'student' role row.
-- insert into public.app_user_roles (user_id, role)
-- values ('<auth-user-uuid>', 'teacher')
-- on conflict (user_id) do update set role = excluded.role;