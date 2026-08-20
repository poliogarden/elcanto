-- Personal Taste Engine tables (run after schema.sql)

create table if not exists youtube_connections (
  user_id uuid primary key references users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scopes text[] default '{}',
  last_synced_at timestamptz,
  connected_at timestamptz default now()
);

create table if not exists personal_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  source text not null,
  youtube_id text,
  title text not null,
  channel text,
  signal_at timestamptz not null,
  topics jsonb default '[]',
  concepts jsonb default '[]',
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  unique (user_id, source, youtube_id)
);

create index if not exists personal_signals_user_signal_at_idx
  on personal_signals(user_id, signal_at desc);

create table if not exists personal_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  profile jsonb not null,
  computed_at timestamptz default now()
);

create table if not exists youtube_playlist_imports (
  user_id uuid not null references users(id) on delete cascade,
  playlist_id text not null,
  playlist_title text,
  video_count int default 0,
  imported_at timestamptz default now(),
  primary key (user_id, playlist_id)
);
