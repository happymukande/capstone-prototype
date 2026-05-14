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

-- Public profile records used by Profile and Admin Dashboard.
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text not null default '',
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  avatar_url text,
  last_active_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_profiles
  add column if not exists avatar_url text,
  add column if not exists last_active_at timestamptz;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at_timestamp();

alter table public.user_profiles enable row level security;

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

-- Automatically assign a safe default role on signup.
-- Allows signup metadata role='teacher' to become teacher.
-- Any other value (including admin) falls back to student.
create or replace function private.handle_new_user_default_role()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  requested_role text;
  safe_role text;
begin
  requested_role := lower(coalesce(new.raw_user_meta_data ->> 'role', 'student'));

  if requested_role = 'teacher' then
    safe_role := 'teacher';
  else
    safe_role := 'student';
  end if;

  insert into public.app_user_roles (user_id, role)
  values (new.id, safe_role)
  on conflict (user_id) do nothing;

  insert into public.user_profiles (user_id, username, email, role, last_active_at)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(coalesce(new.email, ''), '@', 1), 'user'),
    coalesce(new.email, ''),
    safe_role,
    timezone('utc', now())
  )
  on conflict (user_id) do update
    set email = excluded.email,
        role = excluded.role,
        updated_at = timezone('utc', now());

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

revoke all on table public.user_profiles from anon;
grant select, update on table public.user_profiles to authenticated;

drop policy if exists "read_own_or_admin_user_profiles" on public.user_profiles;
create policy "read_own_or_admin_user_profiles"
  on public.user_profiles
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.has_app_role(array['admin']))
  );

drop policy if exists "update_own_user_profile" on public.user_profiles;
create policy "update_own_user_profile"
  on public.user_profiles
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function private.sync_user_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  update public.user_profiles
  set role = new.role,
      updated_at = timezone('utc', now())
  where user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists trg_sync_user_profile_role on public.app_user_roles;
create trigger trg_sync_user_profile_role
after insert or update on public.app_user_roles
for each row
execute function private.sync_user_profile_role();

insert into public.user_profiles (user_id, username, email, role, created_at, last_active_at)
select
  users.id,
  coalesce(nullif(users.raw_user_meta_data ->> 'username', ''), split_part(coalesce(users.email, ''), '@', 1), 'user'),
  coalesce(users.email, ''),
  coalesce(roles.role, 'student'),
  users.created_at,
  users.last_sign_in_at
from auth.users users
left join public.app_user_roles roles on roles.user_id = users.id
on conflict (user_id) do update
  set email = excluded.email,
      role = excluded.role,
      updated_at = timezone('utc', now());

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

-- Chat history for the AI assistant feature.
create table if not exists public.chat_messages (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sender text not null check (sender in ('user', 'bot')),
  message text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_chat_messages_user_created_at
  on public.chat_messages(user_id, created_at asc);

alter table public.chat_messages enable row level security;

revoke all on table public.chat_messages from anon;
grant select, insert, delete on table public.chat_messages to authenticated;

drop policy if exists "read_own_chat_messages" on public.chat_messages;
create policy "read_own_chat_messages"
  on public.chat_messages
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "insert_own_chat_messages" on public.chat_messages;
create policy "insert_own_chat_messages"
  on public.chat_messages
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "delete_own_chat_messages" on public.chat_messages;
create policy "delete_own_chat_messages"
  on public.chat_messages
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Profile photo storage. Users can manage only their own folder.
-- Current lightweight avatar system: public avatars bucket, one jpg per user.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public_read_avatars" on storage.objects;
create policy "public_read_avatars"
  on storage.objects
  for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "users_insert_own_avatar" on storage.objects;
create policy "users_insert_own_avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and storage.filename(name) = (select auth.uid())::text || '.jpg'
  );

drop policy if exists "users_update_own_avatar" on storage.objects;
create policy "users_update_own_avatar"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and storage.filename(name) = (select auth.uid())::text || '.jpg'
  )
  with check (
    bucket_id = 'avatars'
    and storage.filename(name) = (select auth.uid())::text || '.jpg'
  );

drop policy if exists "users_delete_own_avatar" on storage.objects;
create policy "users_delete_own_avatar"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and storage.filename(name) = (select auth.uid())::text || '.jpg'
  );

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public_read_profile_photos" on storage.objects;
create policy "public_read_profile_photos"
  on storage.objects
  for select
  to public
  using (bucket_id = 'profile-photos');

drop policy if exists "users_insert_own_profile_photos" on storage.objects;
create policy "users_insert_own_profile_photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users_update_own_profile_photos" on storage.objects;
create policy "users_update_own_profile_photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users_delete_own_profile_photos" on storage.objects;
create policy "users_delete_own_profile_photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

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

-- Teachers/admins can insert lessons.
-- Teachers can only create lessons for themselves.
drop policy if exists "teacher_or_admin_insert_lesson_content" on public.lesson_content;
create policy "teacher_or_admin_insert_lesson_content"
  on public.lesson_content
  for insert
  to authenticated
  with check (
    (
      (select private.has_app_role(array['admin']))
    )
    or (
      (select private.has_app_role(array['teacher']))
      and (
        created_by is null
        or created_by = (select auth.uid())
      )
    )
  );

-- Teachers can update/publish only their own lessons.
-- Admins can update any lesson.
drop policy if exists "teacher_or_admin_update_lesson_content" on public.lesson_content;
drop policy if exists "teacher_or_admin_update_own_lesson_content" on public.lesson_content;
create policy "teacher_or_admin_update_own_lesson_content"
  on public.lesson_content
  for update
  to authenticated
  using (
    (
      (select private.has_app_role(array['admin']))
    )
    or (
      (select private.has_app_role(array['teacher']))
      and created_by = (select auth.uid())
    )
  )
  with check (
    (
      (select private.has_app_role(array['admin']))
    )
    or (
      (select private.has_app_role(array['teacher']))
      and created_by = (select auth.uid())
    )
  );

-- Teachers can delete their own lessons.
-- Admins can delete any lesson.
drop policy if exists "admin_delete_lesson_content" on public.lesson_content;
drop policy if exists "teacher_or_admin_delete_own_lesson_content" on public.lesson_content;
create policy "teacher_or_admin_delete_own_lesson_content"
  on public.lesson_content
  for delete
  to authenticated
  using (
    (
      (select private.has_app_role(array['admin']))
    )
    or (
      (select private.has_app_role(array['teacher']))
      and created_by = (select auth.uid())
    )
  );

-- Community posts table for the Reddit-style community page.
create table if not exists public.community_posts (
  id text primary key,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_username text not null,
  author_avatar_url text,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  upvotes integer not null default 0,
  downvotes integer not null default 0
);

create index if not exists idx_community_posts_author_id on public.community_posts(author_id);
create index if not exists idx_community_posts_created_at on public.community_posts(created_at desc);

drop trigger if exists trg_community_posts_updated_at on public.community_posts;
create trigger trg_community_posts_updated_at
before update on public.community_posts
for each row
execute function public.set_updated_at_timestamp();

alter table public.community_posts enable row level security;

revoke all on table public.community_posts from anon;
grant select, insert, update, delete on table public.community_posts to authenticated;

drop policy if exists "read_all_community_posts" on public.community_posts;
create policy "read_all_community_posts"
  on public.community_posts
  for select
  to authenticated
  using (true);

drop policy if exists "insert_own_community_posts" on public.community_posts;
create policy "insert_own_community_posts"
  on public.community_posts
  for insert
  to authenticated
  with check (author_id = (select auth.uid()));

drop policy if exists "update_own_community_posts" on public.community_posts;
create policy "update_own_community_posts"
  on public.community_posts
  for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "delete_own_or_admin_community_posts" on public.community_posts;
create policy "delete_own_or_admin_community_posts"
  on public.community_posts
  for delete
  to authenticated
  using (
    author_id = (select auth.uid())
    or (select private.has_app_role(array['admin']))
  );

-- Community post reactions table for upvote/downvote tracking.
create table if not exists public.community_post_reactions (
  id text primary key,
  post_id text not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('upvote', 'downvote')),
  created_at timestamptz not null default timezone('utc', now()),
  unique(post_id, user_id)
);

create index if not exists idx_community_post_reactions_post_id on public.community_post_reactions(post_id);
create index if not exists idx_community_post_reactions_user_id on public.community_post_reactions(user_id);

alter table public.community_post_reactions enable row level security;

revoke all on table public.community_post_reactions from anon;
grant select, insert, update, delete on table public.community_post_reactions to authenticated;

drop policy if exists "read_all_community_post_reactions" on public.community_post_reactions;
create policy "read_all_community_post_reactions"
  on public.community_post_reactions
  for select
  to authenticated
  using (true);

drop policy if exists "insert_own_community_post_reactions" on public.community_post_reactions;
create policy "insert_own_community_post_reactions"
  on public.community_post_reactions
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "delete_own_community_post_reactions" on public.community_post_reactions;
create policy "delete_own_community_post_reactions"
  on public.community_post_reactions
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Community replies table for Reddit-style comments.
create table if not exists public.community_replies (
  id text primary key,
  post_id text not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_username text not null,
  author_avatar_url text,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  upvotes integer not null default 0,
  downvotes integer not null default 0
);

create index if not exists idx_community_replies_post_id on public.community_replies(post_id);
create index if not exists idx_community_replies_author_id on public.community_replies(author_id);
create index if not exists idx_community_replies_created_at on public.community_replies(created_at asc);

drop trigger if exists trg_community_replies_updated_at on public.community_replies;
create trigger trg_community_replies_updated_at
before update on public.community_replies
for each row
execute function public.set_updated_at_timestamp();

alter table public.community_replies enable row level security;

revoke all on table public.community_replies from anon;
grant select, insert, update, delete on table public.community_replies to authenticated;

drop policy if exists "read_all_community_replies" on public.community_replies;
create policy "read_all_community_replies"
  on public.community_replies
  for select
  to authenticated
  using (true);

drop policy if exists "insert_own_community_replies" on public.community_replies;
create policy "insert_own_community_replies"
  on public.community_replies
  for insert
  to authenticated
  with check (author_id = (select auth.uid()));

drop policy if exists "update_own_community_replies" on public.community_replies;
create policy "update_own_community_replies"
  on public.community_replies
  for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "delete_own_or_admin_community_replies" on public.community_replies;
create policy "delete_own_or_admin_community_replies"
  on public.community_replies
  for delete
  to authenticated
  using (
    author_id = (select auth.uid())
    or (select private.has_app_role(array['admin']))
  );

-- Community reply reactions table for upvote/downvote tracking on replies.
create table if not exists public.community_reply_reactions (
  id text primary key,
  reply_id text not null references public.community_replies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('upvote', 'downvote')),
  created_at timestamptz not null default timezone('utc', now()),
  unique(reply_id, user_id)
);

create index if not exists idx_community_reply_reactions_reply_id on public.community_reply_reactions(reply_id);
create index if not exists idx_community_reply_reactions_user_id on public.community_reply_reactions(user_id);

alter table public.community_reply_reactions enable row level security;

revoke all on table public.community_reply_reactions from anon;
grant select, insert, update, delete on table public.community_reply_reactions to authenticated;

drop policy if exists "read_all_community_reply_reactions" on public.community_reply_reactions;
create policy "read_all_community_reply_reactions"
  on public.community_reply_reactions
  for select
  to authenticated
  using (true);

drop policy if exists "insert_own_community_reply_reactions" on public.community_reply_reactions;
create policy "insert_own_community_reply_reactions"
  on public.community_reply_reactions
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "delete_own_community_reply_reactions" on public.community_reply_reactions;
create policy "delete_own_community_reply_reactions"
  on public.community_reply_reactions
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Optional bootstrap example:
-- Promote a specific existing user to admin manually.
-- insert into public.app_user_roles (user_id, role)
-- values ('<auth-user-uuid>', 'admin')
-- on conflict (user_id) do update set role = excluded.role;
