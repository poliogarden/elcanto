-- Render jobs for compose MP4 export (run in Supabase SQL editor)

create table if not exists render_jobs (
  id uuid primary key,
  composition_id text not null,
  status text not null default 'queued',
  progress int default 0,
  progress_label text,
  message text,
  error text,
  output_url text,
  manifest_version int,
  has_ffmpeg_script boolean default false,
  manifest jsonb,
  ffmpeg_script text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists render_jobs_composition_id_idx on render_jobs(composition_id);
create index if not exists render_jobs_status_idx on render_jobs(status);

-- Storage bucket (create in Supabase Dashboard → Storage):
--   Name: render-outputs
--   Public: true (or use signed URLs)
-- Policy: service role can upload; public read if bucket is public
