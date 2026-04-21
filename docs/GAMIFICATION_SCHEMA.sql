-- MVP gamification schema for XP, streaks, and daily quests.
-- Designed for Supabase/Postgres and aligned with mobile app types.

create table if not exists public.user_gamification (
  user_id text primary key,
  total_xp integer not null default 0 check (total_xp >= 0),
  level integer not null default 1 check (level > 0),
  streak_days integer not null default 0 check (streak_days >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_activity_date date,
  daily_xp_goal integer not null default 120 check (daily_xp_goal > 0),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  lesson_id text not null,
  score integer not null check (score >= 0 and score <= 100),
  quiz_xp_awarded integer not null default 0 check (quiz_xp_awarded >= 0),
  quest_xp_awarded integer not null default 0 check (quest_xp_awarded >= 0),
  total_xp_awarded integer not null default 0 check (total_xp_awarded >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_quiz_attempts_user_created
  on public.quiz_attempts (user_id, created_at desc);

create table if not exists public.daily_challenge_stats (
  user_id text not null,
  activity_date date not null,
  xp_earned integer not null default 0 check (xp_earned >= 0),
  quizzes_completed integer not null default 0 check (quizzes_completed >= 0),
  high_score_quizzes integer not null default 0 check (high_score_quizzes >= 0),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, activity_date)
);

create table if not exists public.daily_quest_progress (
  user_id text not null,
  activity_date date not null,
  quest_id text not null,
  target integer not null check (target > 0),
  progress integer not null default 0 check (progress >= 0),
  completed boolean not null default false,
  reward_claimed boolean not null default false,
  reward_xp integer not null default 0 check (reward_xp >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, activity_date, quest_id)
);

create index if not exists idx_daily_quests_user_date
  on public.daily_quest_progress (user_id, activity_date desc);
