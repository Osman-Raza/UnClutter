-- User-defined groups (AI-assisted categorization)
-- Each group has match rules: keywords, domains, senders
create table if not exists public.user_groups (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  description text default '',
  color text default '#5f6368',
  match_keywords text[] default '{}',
  match_domains text[] default '{}',
  match_senders text[] default '{}',
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_user_groups_account_id on public.user_groups(account_id);
alter table public.user_groups enable row level security;
create policy "user_groups_allow_service" on public.user_groups for all using (true);
