-- Pin support: groups and emails
alter table public.user_groups
  add column if not exists is_pinned boolean default false,
  add column if not exists pinned_at timestamptz;

alter table public.emails
  add column if not exists is_pinned boolean default false,
  add column if not exists pinned_at timestamptz;

create index if not exists idx_user_groups_pinned on public.user_groups(account_id, is_pinned) where is_pinned = true;
create index if not exists idx_emails_pinned on public.emails(account_id, is_pinned) where is_pinned = true;
