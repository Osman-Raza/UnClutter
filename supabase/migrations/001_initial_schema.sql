-- UnClutter: Initial schema for OAuth + Gmail cache + AI
-- Run via Supabase Dashboard SQL Editor or: supabase db push
-- Auth: Google OAuth handled by backend; users identified by session.

-- Users (id from our backend after Google OAuth)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  google_id text unique,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sessions (backend-issued; frontend sends session_id in API calls)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_expires on public.sessions(expires_at);

-- Linked Google accounts (OAuth tokens stored here)
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null default 'google',
  provider_account_id text not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(provider, provider_account_id)
);

create index if not exists idx_accounts_user_id on public.accounts(user_id);

-- User preferences (custom keywords for AI triage)
create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  triage_keywords jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Email cache (mirror from Gmail API)
create table if not exists public.emails (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  gmail_id text not null,
  thread_id text,
  subject text,
  snippet text,
  body_plain text,
  body_html text,
  from_address text,
  to_addresses text[],
  cc_addresses text[],
  received_at timestamptz,
  is_read boolean default false,
  is_starred boolean default false,
  label_ids text[],
  ai_category text,
  ai_summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(subject, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(snippet, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body_plain, '')), 'C')
  ) stored,
  unique(account_id, gmail_id)
);

create index if not exists idx_emails_account_id on public.emails(account_id);
create index if not exists idx_emails_received_at on public.emails(received_at desc);
create index if not exists idx_emails_ai_category on public.emails(ai_category);
create index if not exists idx_emails_thread_id on public.emails(thread_id);
create index if not exists idx_emails_search on public.emails using gin(search_vector);

-- Attachments metadata
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references public.emails(id) on delete cascade,
  gmail_attachment_id text,
  filename text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz default now()
);

create index if not exists idx_attachments_email_id on public.attachments(email_id);

-- AI processing log
create table if not exists public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  email_id uuid references public.emails(id) on delete set null,
  action text not null,
  input_summary text,
  output_summary text,
  model text,
  created_at timestamptz default now()
);

create index if not exists idx_ai_logs_user_id on public.ai_logs(user_id);
create index if not exists idx_ai_logs_email_id on public.ai_logs(email_id);

-- RLS
alter table public.users enable row level security;
alter table public.accounts enable row level security;
alter table public.user_preferences enable row level security;
alter table public.emails enable row level security;
alter table public.attachments enable row level security;
alter table public.ai_logs enable row level security;
alter table public.sessions enable row level security;

create policy "users_allow_service" on public.users for all using (true);
create policy "accounts_allow_service" on public.accounts for all using (true);
create policy "user_preferences_allow_service" on public.user_preferences for all using (true);
create policy "emails_allow_service" on public.emails for all using (true);
create policy "attachments_allow_service" on public.attachments for all using (true);
create policy "ai_logs_allow_service" on public.ai_logs for all using (true);
create policy "sessions_allow_service" on public.sessions for all using (true);
