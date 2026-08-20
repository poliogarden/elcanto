-- AI cost optimization schema (run in Supabase SQL editor after schema.sql)

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
