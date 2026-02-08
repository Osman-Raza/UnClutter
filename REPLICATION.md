# UnClutter — Complete Project Replication Guide

> **Purpose:** Given this document alone, an AI or developer can recreate the entire UnClutter application from scratch — identical UI, identical functionality, identical file structure.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & Tech Stack](#2-architecture--tech-stack)
3. [Directory Structure](#3-directory-structure)
4. [External Services Setup](#4-external-services-setup)
5. [Database Schema (Supabase)](#5-database-schema-supabase)
6. [Environment Variables](#6-environment-variables)
7. [Root Package Configuration](#7-root-package-configuration)
8. [Backend — Server](#8-backend--server)
9. [Frontend — React + Vite](#9-frontend--react--vite)
10. [CSS & Styling](#10-css--styling)
11. [Feature Specification](#11-feature-specification)
12. [Data Flow & API Reference](#12-data-flow--api-reference)
13. [AI Integration Details](#13-ai-integration-details)
14. [Build & Run Instructions](#14-build--run-instructions)

---

## 1. Project Overview

**UnClutter** is an AI-powered email management web application. Users sign in with Google OAuth, and the app fetches their Gmail inbox. Emails are displayed in a Gmail-inspired UI with two view modes:

- **Tabs view** — horizontal tab bar with dynamic group-based tabs (All Mail, user groups, Unsorted)
- **Grouped view** — card-based grid layout where each group is a compact card containing its emails

An AI chatbot sidebar (powered by Groq or Gemini) can:
- Answer questions about inbox contents (deadlines, action items)
- Summarize individual emails or the whole inbox
- Create email groups via natural language ("Create a group for university emails")
- Suggest reply drafts

On first sync, default groups (Promotions, Updates, Social) are auto-created. Users can create custom groups via the chatbot, edit keywords/colors, or delete groups.

Email detail view renders HTML emails in a sandboxed iframe (with images/formatting preserved) and falls back to cleaned plain text. A "Summarize" button uses AI to produce bullet-point summaries.

---

## 2. Architecture & Tech Stack

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend (React 18 + Vite)  — http://localhost:5174        │
│  ├─ Pages: Landing, Login, Signup, Home                      │
│  ├─ Components: TopBar, InboxSidebar, CategoryTabs,          │
│  │   EmailList, EmailPreview, EmailDetail, GroupedEmailList,  │
│  │   ChatbotSidebar, SortControls, Toast, GroupEditModal     │
│  └─ Utils: auth.js, gmailApi.js, groupsApi.js, emailDisplay │
├──────────────────────────────────────────────────────────────┤
│  Vite Proxy: /api/* → http://localhost:3001/api/*            │
├──────────────────────────────────────────────────────────────┤
│  Backend (Express 4)  — http://localhost:3001                │
│  ├─ Routes: /api/auth, /api/gmail, /api/ai, /api/groups     │
│  ├─ Libs: google-oauth.js, session.js, gmail.js, groq.js,   │
│  │         gemini.js                                          │
│  └─ Config: load-env.js, config.js                           │
├──────────────────────────────────────────────────────────────┤
│  Database: Supabase (PostgreSQL)                              │
│  Tables: users, sessions, accounts, emails, user_groups,     │
│          user_preferences, attachments, ai_logs              │
├──────────────────────────────────────────────────────────────┤
│  External APIs:                                               │
│  ├─ Google OAuth 2.0 + Gmail API (email fetch/sync)          │
│  ├─ Groq API (LLama 3.1 8B — primary AI, OpenAI-compatible) │
│  └─ Google Gemini 2.5 Flash (fallback AI)                    │
└──────────────────────────────────────────────────────────────┘
```

### Key Dependencies

**Root (backend):**
- `express` ^4.21.0 — HTTP server
- `cors` ^2.8.5 — Cross-origin requests
- `dotenv` ^16.4.5 — Environment variable loading
- `@supabase/supabase-js` ^2.45.0 — Database client
- `googleapis` ^144.0.0 — Gmail API
- `@google/generative-ai` ^0.24.1 — Gemini AI SDK
- `concurrently` ^9.0.1 (dev) — Run server + frontend together

**Frontend:**
- `react` ^18.2.0, `react-dom` ^18.2.0
- `react-router-dom` ^6.20.0 — Client-side routing
- `vite` ^5.0.0, `@vitejs/plugin-react` ^4.2.0

---

## 3. Directory Structure

```
UnClutter/
├── .env                          # Environment variables (secrets)
├── .env.example                  # Template with key names
├── package.json                  # Root package (backend + scripts)
├── REPLICATION.md                # This document
│
├── server/
│   ├── index.js                  # Express app entry point
│   ├── config.js                 # Config from env vars
│   ├── load-env.js               # dotenv loader with diagnostics
│   ├── routes/
│   │   ├── auth.js               # Google OAuth flow + /me endpoint
│   │   ├── gmail.js              # Email sync, list, detail + default groups
│   │   ├── ai.js                 # Chat, summarize, categorize, create-group, suggest-reply
│   │   └── groups.js             # CRUD for user_groups
│   └── lib/
│       ├── google-oauth.js       # OAuth URL builder, token exchange, refresh
│       ├── session.js            # Session → account resolver with token refresh
│       ├── gmail.js              # Gmail API fetch + HTML-to-plaintext converter
│       ├── groq.js               # Groq (OpenAI-compatible) AI functions
│       └── gemini.js             # Google Gemini AI functions
│
├── frontend/
│   ├── package.json              # Frontend dependencies
│   ├── index.html                # SPA entry HTML (Roboto font)
│   ├── vite.config.js            # Vite config with /api proxy
│   └── src/
│       ├── main.jsx              # React root mount
│       ├── App.jsx               # Router + session check
│       ├── pages/
│       │   ├── Landing.jsx       # Marketing landing page
│       │   ├── Login.jsx         # Google OAuth login
│       │   ├── Signup.jsx        # Google OAuth signup
│       │   └── Home.jsx          # Main dashboard (588 lines)
│       ├── components/
│       │   ├── auth/
│       │   │   └── GoogleButton.jsx
│       │   ├── email/
│       │   │   ├── EmailDetail.jsx    # Full email view with iframe HTML rendering
│       │   │   └── EmailPreview.jsx   # List row item
│       │   └── layout/
│       │       ├── MainLayout.jsx     # Shell with TopBar
│       │       ├── TopBar.jsx         # Search, sync, user, chat toggle
│       │       ├── InboxSidebar.jsx   # Left nav: inbox, view mode, groups
│       │       ├── CategoryTabs.jsx   # Horizontal tab bar
│       │       ├── SortControls.jsx   # Date range filter
│       │       ├── EmailList.jsx      # Vertical email list
│       │       ├── GroupedEmailList.jsx # Card grid with expand/collapse
│       │       ├── ChatbotSidebar.jsx # AI chat panel
│       │       ├── Toast.jsx          # Notification toasts
│       │       └── GroupEditModal.jsx # Edit group name/keywords/color
│       ├── utils/
│       │   ├── auth.js            # Session storage + auth headers
│       │   ├── gmailApi.js        # Backend API wrapper (fetchWithAuth)
│       │   ├── groupsApi.js       # Groups CRUD + matchEmailToGroup
│       │   └── emailDisplay.js    # HTML entity decode + strip + clean
│       └── styles/
│           ├── global.css         # Reset + landing/login basics
│           ├── auth.css           # Auth page styling (138 lines)
│           └── home.css           # Main app styling (2383 lines)
│
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql   # Core tables
        ├── 002_user_groups.sql      # user_groups table
        └── 003_unique_group_names.sql # Unique constraint + dedup
```

---

## 4. External Services Setup

### 4.1 Supabase

1. Create a project at https://supabase.com
2. Go to **Settings → API** — copy the Project URL and service_role key
3. Run all three SQL migrations in order via the **SQL Editor**:
   - `001_initial_schema.sql` — users, sessions, accounts, emails, etc.
   - `002_user_groups.sql` — user_groups table
   - `003_unique_group_names.sql` — unique constraint on (account_id, name)

### 4.2 Google Cloud Console

1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID (Web application type)
3. Set **Authorized redirect URI**: `http://localhost:3001/api/auth/google/callback`
4. Enable these APIs in **Library**:
   - Gmail API
   - Google+ API (or People API for userinfo)
5. Copy Client ID and Client Secret

### 4.3 Groq (Primary AI)

1. Go to https://console.groq.com/keys
2. Create API key
3. Model used: `llama-3.1-8b-instant`

### 4.4 Gemini (Fallback AI)

1. Go to https://aistudio.google.com/apikey
2. Create API key
3. Models used: `gemini-2.5-flash` (primary), `gemini-2.0-flash` (fallback)

---

## 5. Database Schema (Supabase)

### Migration 001 — Core Tables

```sql
-- Users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  google_id text unique,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sessions (7-day expiry, backend-issued)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_expires on public.sessions(expires_at);

-- OAuth accounts (tokens stored here)
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

-- User preferences
create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  triage_keywords jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Emails cache (from Gmail API)
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

-- RLS (permissive — backend uses service role key)
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
```

### Migration 002 — User Groups

```sql
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
```

### Migration 003 — Unique Group Names

```sql
DELETE FROM public.user_groups a
USING public.user_groups b
WHERE a.account_id = b.account_id
  AND a.name = b.name
  AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_groups_unique_name
  ON public.user_groups (account_id, name);
```

---

## 6. Environment Variables

Create `.env` in the project root:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth2
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Gemini AI (fallback)
GEMINI_API_KEY=your-gemini-api-key

# Groq AI (primary — used when set)
GROQ_API_KEY=your-groq-api-key

# Server
PORT=3001
REDIRECT_URI_BASE=http://localhost:3001
```

The backend chooses Groq over Gemini when `GROQ_API_KEY` is set.

---

## 7. Root Package Configuration

Root `package.json` uses `"type": "module"` (ESM). Scripts:
- `npm run dev` — runs backend + frontend concurrently
- `npm run dev:server` — `node server/index.js`
- `npm run dev:frontend` — `cd frontend && npm run dev`

Frontend `vite.config.js` proxies `/api/*` to `http://localhost:3001`.

---

## 8. Backend — Server

### 8.1 Entry Point (`server/index.js`)
- Loads `.env` via `server/load-env.js` (dotenv with path diagnostics)
- Creates Express app with CORS (origins: localhost:5174-5176 and 127.0.0.1 equivalents)
- Mounts four route groups: `/api/auth`, `/api/gmail`, `/api/ai`, `/api/groups`
- Adds `/api/health` endpoint
- Handles EADDRINUSE with helpful error message

### 8.2 Auth Flow (`server/routes/auth.js`)
- `GET /api/auth/google` — redirects to Google OAuth consent screen. Passes `redirect_url` as state.
- `GET /api/auth/google/callback` — exchanges code for tokens, fetches profile, upserts user + account in Supabase, creates 7-day session, redirects to frontend with `?auth=ok&session_id=UUID`
- `GET /api/auth/me` — validates `X-Session-Id` header, returns user info

### 8.3 Gmail Routes (`server/routes/gmail.js`)
- All routes require valid session (middleware resolves session → account with token refresh)
- `POST /api/gmail/sync` — fetches 50 latest emails via Gmail API, upserts into `emails` table. On first sync (0 existing groups), auto-creates Promotions, Updates, Social default groups.
- `GET /api/gmail/list` — returns 100 most recent emails (no body_plain/body_html for list performance)
- `GET /api/gmail/email/:id` — returns full email including body_plain + body_html

### 8.4 AI Routes (`server/routes/ai.js`)
- `POST /api/ai/chat` — sends message + email context to AI. If AI responds with group-creation JSON (`{"action":"create_group",...}`), auto-creates the group and returns `action: 'group_created'`. Uses `extractJSON()` for robust parsing.
- `POST /api/ai/summarize-email` — 3-5 bullet summary of one email
- `POST /api/ai/categorize` — assigns School/Finance/Work/Personal/Other
- `POST /api/ai/summarize` — thread or multi-email summary
- `POST /api/ai/create-group` — takes natural language `intent`, uses AI to suggest name/keywords/domains, creates group in DB
- `POST /api/ai/suggest-reply` — drafts a reply based on thread

### 8.5 Groups Routes (`server/routes/groups.js`)
- `GET /api/groups` — list user's groups ordered by sort_order
- `POST /api/groups` — create group with duplicate name check (case-insensitive)
- `PATCH /api/groups/:id` — update name, description, color, keywords, domains, senders
- `DELETE /api/groups/:id` — delete group

### 8.6 Gmail Library (`server/lib/gmail.js`)
- `fetchLatestEmails(accessToken, maxResults)` — uses `googleapis` to list + get full messages
- Decodes base64url body data, handles quoted-printable encoding
- Walks multipart MIME parts to extract text/plain and text/html
- `htmlToPlainText(html)` — regex-based converter: removes head/style/script/nav/footer/hidden elements/tracking pixels, converts headings/paragraphs/lists/blockquotes to text, decodes HTML entities, removes boilerplate lines
- `cleanBody(text, subject)` — removes subject duplication from body start
- Stores both `body_plain` (cleaned text) and `body_html` (raw HTML) per email

### 8.7 Groq Library (`server/lib/groq.js`)
- Uses `https://api.groq.com/openai/v1/chat/completions` with model `llama-3.1-8b-instant`
- `groqChat()` — core function with retry logic (exponential backoff on 429)
- `chatWithGroq()` — builds system prompt with INBOX_CONTEXT_SYSTEM + email context block, sends chat history
- System prompt instructs AI to respond with JSON for group creation, plain text for everything else
- `suggestGroupFromIntent()` — dedicated group suggestion with temperature 0.1
- `extractJSON()` — robust JSON extractor handling markdown code blocks, text around JSON, trailing commas

### 8.8 Gemini Library (`server/lib/gemini.js`)
- Uses `@google/generative-ai` SDK with `gemini-2.5-flash` (falls back to `gemini-2.0-flash`)
- Same function signatures as Groq (categorize, summarize, chat, suggestGroup, suggestReply)
- For chat: prepends INBOX_CONTEXT_SYSTEM + email context to user message (Gemini doesn't have system role in startChat history)

### 8.9 Session Resolution (`server/lib/session.js`)
- `getAccountBySession()` — validates session expiry, fetches account, auto-refreshes expired access tokens using refresh_token

---

## 9. Frontend — React + Vite

### 9.1 App.jsx — Routing & Session
- Checks URL params for `?auth=ok&session_id=...` (post-OAuth redirect)
- Stores session ID in localStorage (`unclutter_session_id`)
- Routes: `/` (Landing), `/login`, `/signup`, `/home` (protected)

### 9.2 Home.jsx — Main Dashboard (602 lines)
This is the primary page. Key features:
- **State**: emails, userGroups, selectedEmail, viewMode (tabs/grouped), activeTab, chatOpen, searchQuery, sortRange, syncing, loading states
- **On mount**: fetches user info + email list, triggers background sync + categorization
- **Email selection**: fetches full email detail via `/api/gmail/email/:id`
- **Search**: filters by sender, subject, snippet (client-side)
- **Sort range**: Last 7/30/90 days or All time
- **View modes**:
  - `tabs` — CategoryTabs + EmailList for filtered emails
  - `grouped` — GroupedEmailList (card grid spanning both list+detail columns)
- **Dashboard grid**: CSS Grid with sidebar (220px), list-area (1fr), detail (minmax 320-480px), optional chat (320px)
- In grouped mode: `dashboard--grouped` class changes grid to sidebar + 1fr (detail panel becomes a slide-in overlay)
- **Keyboard shortcuts**: J (next), K (prev), Escape (close), C (toggle chat), / (focus search)
- **Group management**: edit modal, delete confirmation, toast notifications

### 9.3 GroupedEmailList.jsx — Card Grid
- `buildGroups()` — maps emails to user groups via `matchEmailToGroup()`, plus Unsorted bucket
- 8-color palette cycling for cards
- `GroupCard` component (memoized) with local `expanded` state
  - **Collapsed** (default): max-height 310px, shows 3 emails, gradient fade + "Show X more ▼"
  - **Expanded**: max-height 80vh, scrollable email list, "Collapse ▲" button
  - **Empty**: 220px with icon, message, keyword hint, edit/delete buttons
- Header clickable to toggle expand (with chevron indicator)
- `CompactEmail` — compact row: sender, date, subject, snippet (single-line truncated each)

### 9.4 EmailDetail.jsx — Email Viewer
- **HTML rendering**: When `body_html` exists, renders in sandboxed `<iframe srcDoc>` with:
  - Minimal CSS reset (fonts, image max-width, link colors)
  - Auto-height script (postMessage from iframe to parent)
  - `sandbox="allow-same-origin allow-popups"`
- **Plain text fallback**: Paragraphs split by double newlines, bullet list detection, blockquote detection
- **Toggle**: "Formatted / Plain text" button when HTML available
- **Summarize**: Calls `/api/ai/summarize-email`, displays bullet points
- **Toolbar**: Back, Reply, Forward, Summarize, HTML/text toggle

### 9.5 ChatbotSidebar.jsx — AI Chat
- **Group creation detection**: Broad regex matching ("create/make/add group for...", "I want a group for...", "sort my ... emails", etc.)
- Calls `/api/ai/create-group` directly for detected intents
- For regular chat: sends to `/api/ai/chat` which may also return `action: 'group_created'`
- Rate limit handling with countdown timer and retry button
- Suggested prompts (context-aware: general vs. email-focused)
- Auto-scroll to bottom on new messages

### 9.6 Utility Files
- **auth.js**: `getSessionId()`, `setSessionId()`, `clearSession()`, `getAuthHeaders()` (X-Session-Id header), `API_BASE` from `VITE_API_URL` or empty
- **gmailApi.js**: `fetchWithAuth()` wrapper with 15s timeout + abort, maps `/api/*` through Vite proxy. `mapEmailFromBackend()` normalizes field names.
- **groupsApi.js**: CRUD functions + `matchEmailToGroup(email, group)` — checks domains first, then senders, then keywords with word-boundary regex against subject + snippet + from_address
- **emailDisplay.js**: `getDisplayBody(email)` — decodes percent-encoding, strips HTML or decodes entities, removes email artifacts (quoted-printable soft breaks, separator lines), removes subject duplication

---

## 10. CSS & Styling

The app uses a single large CSS file (`home.css`, ~2383 lines) with Gmail-inspired design tokens:

### Design Tokens (CSS Custom Properties)
```css
--gmail-blue: #1a73e8
--gmail-text: #202124
--gmail-text-secondary: #5f6368
--gmail-border: #dadce0
--gmail-bg: #f6f8fc
--gmail-white: #fff
--gmail-hover: #f1f3f4
--gmail-radius: 8px
```

### Layout Structure
- `.main-layout` — full-height flex column
- `.top-bar` — sticky header with search, sync, user, chat toggle
- `.dashboard--gmail` — CSS Grid: `220px 1fr minmax(320px,480px)` (+320px when chat open)
- `.dashboard--grouped` — Grid changes to `220px 1fr` (detail becomes fixed overlay)

### Key CSS Sections
1. **Top Bar** (~200 lines) — search box, sync button, profile area
2. **Dashboard Grid** (~150 lines) — responsive grid with sidebar collapse
3. **Inbox Sidebar** (~100 lines) — nav, view mode toggle, group list
4. **Sort Controls** (~50 lines) — date range dropdown
5. **Category Tabs** (~80 lines) — horizontal scrolling tabs with dynamic --tab-color
6. **Grouped Card Grid** (~250 lines) — `.gc-grid` (3→2→1 columns), `.gc-card` (compact with expand), `.gc-email` (compact rows)
7. **Email Preview** (~100 lines) — list row with unread dot, star, sender/subject/snippet
8. **Email Detail** (~250 lines) — toolbar, sender block, body, summary box, HTML iframe
9. **Chatbot Sidebar** (~300 lines) — flex column with pinned input, scrollable thread, suggestions
10. **Modal/Toast** (~150 lines) — overlay modals, toast notifications
11. **Responsive** (~200 lines) — breakpoints at 1400px, 1200px, 768px, 600px

### Card Grid Colors (8-color palette)
```
Blue    #4285f4  (badge bg: #e8f0fe)
Green   #0f9d58  (badge bg: #e6f4ea)
Yellow  #f4b400  (badge bg: #fef7e0)
Red     #db4437  (badge bg: #fce8e6)
Purple  #ab47bc  (badge bg: #f3e8fd)
Orange  #ff6d00  (badge bg: #fff3e0)
Teal    #00897b  (badge bg: #e0f2f1)
Gray    #9e9e9e  (badge bg: #f1f3f4)
```

---

## 11. Feature Specification

### Authentication
- Google OAuth 2.0 with offline access (refresh tokens)
- Session-based (UUID in localStorage, sent as X-Session-Id header)
- 7-day session expiry
- Auto token refresh when expired

### Email Management
- Sync up to 50 latest emails from Gmail API
- Full-text search (client-side: sender, subject, snippet)
- Date range filtering (7/30/90 days or all time)
- Keyboard navigation (J/K/Escape/C//)
- Read/unread indicators, star indicators
- HTML email rendering with images in sandboxed iframe
- Plain text fallback with paragraph/list/blockquote detection

### AI Features (Groq primary, Gemini fallback)
- **Chat**: Full inbox context, answers questions about email content
- **Summarize**: 3-5 bullet points per email
- **Categorize**: School/Finance/Work/Personal/Other
- **Group Creation**: Natural language → AI suggests name/keywords/domains → DB insert
- **Reply Suggestion**: Draft based on thread context
- Rate limit handling with retry countdown

### Groups
- **Default groups** (auto-created on first sync): Promotions (yellow), Updates (purple), Social (red)
- **Custom groups** via chatbot or manual creation
- **Matching**: domain check → sender check → keyword word-boundary regex on subject+snippet+from
- **Views**: Tabs (horizontal tab bar) or Grouped (card grid)
- **Card behavior**: Collapsed (310px, 3 emails, gradient fade) → Expanded (80vh, scrollable)
- Edit modal for name/description/keywords/color
- Delete with confirmation dialog
- Duplicate name prevention (case-insensitive)

### UI/UX
- Gmail-inspired design with Google's color palette
- Responsive: 3-col → 2-col → 1-col cards; sidebar collapse on narrow screens
- Toast notifications for success/error feedback
- Loading skeletons during initial fetch
- Empty states with helpful guidance

---

## 12. Data Flow & API Reference

### Authentication Flow
```
1. User clicks "Sign in with Google"
2. Frontend redirects to /api/auth/google?redirect_url=http://localhost:5174/home
3. Backend redirects to Google OAuth consent
4. Google redirects back to /api/auth/google/callback?code=...&state=...
5. Backend exchanges code for tokens, creates/updates user+account+session in Supabase
6. Backend redirects to frontend: /home?auth=ok&session_id=UUID
7. Frontend stores session_id in localStorage
8. All subsequent API calls include X-Session-Id header
```

### Email Sync Flow
```
1. Frontend calls POST /api/gmail/sync
2. Backend fetches 50 messages from Gmail API (list + get each)
3. For each: decode base64 body, extract text/plain + text/html, clean boilerplate
4. Upsert into emails table (on conflict: account_id, gmail_id)
5. If user has 0 groups, create default groups (Promotions, Updates, Social)
6. Frontend refreshes via GET /api/gmail/list
7. Background: categorize uncategorized emails via AI
```

### Group Creation Flow (Chatbot)
```
1. User types "create a group for work emails"
2. Frontend regex detects group creation intent
3. Calls POST /api/ai/create-group with intent="work emails"
4. Backend fetches 30 sample emails, sends to AI with CREATE_GROUP_PROMPT
5. AI returns JSON: {name: "Work", keywords: ["meeting","deadline",...], domains: [...]}
6. Backend checks for duplicate name, inserts into user_groups
7. Frontend receives {group, suggested}, refreshes groups list, shows toast
```

---

## 13. AI Integration Details

### Groq System Prompt (Chat)
The system prompt includes:
1. Role description ("UnClutter email assistant with FULL ACCESS")
2. Capability list (questions, summaries, group creation)
3. Group creation JSON format specification
4. Email context block (up to 20 email previews + selected email body)

### Group Creation Prompt
Instructs AI to output JSON with: name (1-3 words), description, keywords (specific, lowercase), domains. Includes examples and anti-patterns.

### JSON Extraction
`extractJSON()` handles: markdown code blocks, text before/after JSON, trailing commas, single quotes. Returns parsed object or null.

### Temperature Settings
- Chat: 0.2 (balanced)
- Group suggestion: 0.1 (deterministic)
- All via Groq: exponential backoff retry on 429

---

## 14. Build & Run Instructions

### Prerequisites
- Node.js 18+
- npm
- Supabase project (with migrations run)
- Google Cloud OAuth credentials
- Groq API key (and/or Gemini API key)

### Setup
```bash
# Clone/create the project
cd UnClutter

# Install root dependencies (Express, Supabase, etc.)
npm install

# Install frontend dependencies (React, Vite)
cd frontend && npm install && cd ..

# Copy .env.example to .env and fill in all values
cp .env.example .env
# Edit .env with your actual keys

# Run database migrations in Supabase SQL Editor
# (paste contents of each file in supabase/migrations/ in order)
```

### Development
```bash
npm run dev
# → Backend: http://localhost:3001
# → Frontend: http://localhost:5174
# → Vite proxies /api/* to backend
```

### Production Build
```bash
npm run build
# → Builds frontend to frontend/dist/
# → Serve with any static file server + Express backend
```

### Troubleshooting
- **Port in use**: `npx kill-port 3001 5174`
- **CORS errors**: Check corsOrigins array in server/index.js includes your frontend port
- **OAuth errors**: Verify redirect URI in Google Console matches `REDIRECT_URI_BASE/api/auth/google/callback`
- **AI errors**: Check GROQ_API_KEY or GEMINI_API_KEY is set. Rate limits: wait 15s and retry.
- **DB errors**: Ensure all 3 migrations are run in order. Check Supabase service role key.
