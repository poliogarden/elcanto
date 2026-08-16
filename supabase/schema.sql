-- elcanto Supabase schema (run in Supabase SQL editor)

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  google_id text unique not null,
  email text unique not null,
  display_name text,
  profile_image text,
  created_at timestamptz default now(),
  last_login_at timestamptz
);

create table if not exists videos (
  youtube_id text primary key,
  title text,
  channel text,
  thumbnail text,
  duration_seconds int,
  metadata jsonb,
  cached_at timestamptz default now()
);

create table if not exists transcripts (
  youtube_id text primary key references videos(youtube_id) on delete cascade,
  segments jsonb not null,
  language text,
  cached_at timestamptz default now()
);

create table if not exists video_analyses (
  youtube_id text primary key,
  analysis jsonb not null,
  model_version text,
  cached_at timestamptz default now()
);

create table if not exists synthesis_results (
  collection_hash text primary key,
  result jsonb not null,
  cached_at timestamptz default now()
);

create table if not exists syntheses (
  id uuid primary key,
  user_id uuid references users(id) on delete cascade,
  number text not null,
  topic text not null,
  voice_count int not null,
  collection_hash text,
  status text not null default 'complete',
  document jsonb not null,
  created_at timestamptz default now()
);

create index if not exists syntheses_user_id_idx on syntheses(user_id);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  synthesis_id uuid references syntheses(id) on delete cascade,
  question text not null,
  created_at timestamptz default now()
);

create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade,
  answer jsonb not null,
  created_at timestamptz default now()
);

-- Relax FK on transcripts if videos row may not exist yet
alter table transcripts drop constraint if exists transcripts_youtube_id_fkey;
