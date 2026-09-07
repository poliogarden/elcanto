-- Creator OS tables (run in Supabase SQL editor)

create table if not exists creator_channels (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  youtube_channel_id text not null,
  title text not null,
  description text,
  thumbnail_url text,
  subscriber_count bigint,
  video_count int,
  indexing_status text not null default 'pending',
  indexing_progress jsonb default '{}'::jsonb,
  brand_kit jsonb,
  style_profile jsonb,
  is_sample boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists creator_channels_user_id_idx on creator_channels(user_id);

create table if not exists creator_channel_brains (
  channel_id uuid primary key references creator_channels(id) on delete cascade,
  brain jsonb not null,
  built_at timestamptz default now()
);

create table if not exists creator_video_projects (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references creator_channels(id) on delete cascade,
  user_id text not null,
  topic text not null,
  objective text,
  stage text not null default 'research',
  status text not null default 'draft',
  format text default '16:9',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists creator_video_projects_channel_id_idx on creator_video_projects(channel_id);
create index if not exists creator_video_projects_user_id_idx on creator_video_projects(user_id);

create table if not exists creator_render_jobs (
  id uuid primary key,
  project_id uuid not null references creator_video_projects(id) on delete cascade,
  status text not null default 'QUEUED',
  progress int default 0,
  progress_label text,
  output_url text,
  error text,
  version_label text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists creator_render_jobs_project_id_idx on creator_render_jobs(project_id);

-- RLS
alter table creator_channels enable row level security;
alter table creator_channel_brains enable row level security;
alter table creator_video_projects enable row level security;
alter table creator_render_jobs enable row level security;

create policy creator_channels_owner on creator_channels
  for all using (user_id = auth.uid()::text or is_sample = true);

create policy creator_brains_owner on creator_channel_brains
  for all using (
    exists (
      select 1 from creator_channels c
      where c.id = channel_id and (c.user_id = auth.uid()::text or c.is_sample = true)
    )
  );

create policy creator_projects_owner on creator_video_projects
  for all using (user_id = auth.uid()::text);

create policy creator_render_jobs_owner on creator_render_jobs
  for all using (
    exists (
      select 1 from creator_video_projects p
      where p.id = project_id and p.user_id = auth.uid()::text
    )
  );
