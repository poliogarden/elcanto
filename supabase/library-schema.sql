-- Elcanto Library (run in Supabase SQL editor after schema.sql)

create table if not exists library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  youtube_id text not null,
  source_url text,
  title text not null,
  channel_name text,
  thumbnail_url text,
  duration text,
  duration_seconds int,
  metadata jsonb default '{}'::jsonb,
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, youtube_id)
);

create index if not exists library_items_user_id_idx on library_items(user_id);
create index if not exists library_items_saved_at_idx on library_items(saved_at desc);

-- P1: shelves (schema ready, CRUD in P1)
create table if not exists shelves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shelf_items (
  shelf_id uuid not null references shelves(id) on delete cascade,
  library_item_id uuid not null references library_items(id) on delete cascade,
  sort_order int not null default 0,
  primary key (shelf_id, library_item_id)
);
