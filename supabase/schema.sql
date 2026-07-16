-- AssetTrack IT — shared workspace storage (run once in Supabase SQL editor)
-- https://supabase.com/docs/guides/database

create table if not exists public.workspace_snapshots (
  workspace_id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

create index if not exists workspace_snapshots_updated_at_idx
  on public.workspace_snapshots (updated_at desc);

alter table public.workspace_snapshots enable row level security;

-- Internal-tool default: open read/write for anon key.
-- Tighten this policy before production (auth, service role, or IP allowlist).
drop policy if exists "workspace_snapshots_anon_all" on public.workspace_snapshots;
create policy "workspace_snapshots_anon_all"
  on public.workspace_snapshots
  for all
  to anon, authenticated
  using (true)
  with check (true);

comment on table public.workspace_snapshots is
  'Single JSON snapshot per workspace for AssetTrack IT team sync.';
