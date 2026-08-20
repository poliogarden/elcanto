-- Synthesis async jobs (run in Supabase SQL editor)

create table if not exists synthesis_jobs (
  id uuid primary key,
  synthesis_id uuid not null,
  status text not null default 'queued',
  phase text not null default 'queued',
  analyze_completed int not null default 0,
  analyze_total int not null default 0,
  error text,
  draft jsonb not null,
  document jsonb,
  result jsonb,
  perf_summary jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists synthesis_jobs_synthesis_id_idx on synthesis_jobs(synthesis_id);
create index if not exists synthesis_jobs_status_idx on synthesis_jobs(status);
create index if not exists synthesis_jobs_created_at_idx on synthesis_jobs(created_at desc);
