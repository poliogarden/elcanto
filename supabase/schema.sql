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

-- ── AI cost optimization (see also supabase/ai-cost-schema.sql) ─────────────

create table if not exists ai_usage (
  id uuid primary key,
  request_id text,
  user_id uuid references users(id) on delete set null,
  synthesis_id uuid,
  youtube_video_id text,
  operation text not null,
  model text not null,
  input_tokens int,
  output_tokens int,
  cached_input_tokens int,
  reasoning_tokens int,
  estimated_cost_usd numeric(12, 6),
  duration_ms int not null,
  success boolean not null default true,
  retry_count int not null default 0,
  created_at timestamptz default now()
);

create index if not exists ai_usage_created_at_idx on ai_usage(created_at desc);
create index if not exists ai_usage_operation_idx on ai_usage(operation);
create index if not exists ai_usage_youtube_id_idx on ai_usage(youtube_video_id);

create table if not exists relationship_cache (
  relationship_hash text primary key,
  graph jsonb not null,
  engine_version text not null,
  cached_at timestamptz default now()
);

create table if not exists knowledge_extension_cache (
  extension_hash text primary key,
  extension jsonb not null,
  engine_version text not null,
  cached_at timestamptz default now()
);

alter table video_analyses
  add column if not exists analysis_version text,
  add column if not exists schema_version text,
  add column if not exists prompt_version text,
  add column if not exists status text default 'ready',
  add column if not exists processing_started_at timestamptz;

create index if not exists video_analyses_status_idx on video_analyses(status);
