# UnClutter – Feature Specification for Project Replication

This document describes all features, architecture, and implementation details needed to replicate the UnClutter project.

---

## 1. Project Overview

**UnClutter** is a Gmail inbox management app with:
- Google OAuth login/signup
- Gmail sync and display
- Sort by date range (7/30/90 days, all time)
- AI chatbot (Gemini 2.5 Flash)
- Email summarization (Gemini 2.5 Flash)

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 5, React Router 6 |
| Backend | Node.js, Express 4 |
| Database | Supabase (PostgreSQL) |
| Auth | Google OAuth 2.0 |
| AI | Google Gemini 2.5 Flash (@google/generative-ai) |
| Gmail | Google Gmail API (googleapis) |

---

## 3. Project Structure

```
unclutter/
├── package.json          # Root: concurrently runs server + frontend
├── .env                  # Env vars (see section 4)
├── .env.example
├── server/
│   ├── index.js          # Express app entry
│   ├── load-env.js       # Loads .env before config
│   ├── config.js         # Reads SUPABASE_URL, etc.
│   ├── routes/
│   │   ├── auth.js       # /api/auth/*
│   │   ├── gmail.js      # /api/gmail/*
│   │   └── ai.js         # /api/ai/*
│   └── lib/
│       ├── google-oauth.js   # OAuth URL, token exchange, refresh
│       ├── session.js        # getAccountBySession (validates session, refreshes token)
│       ├── gmail.js          # fetchLatestEmails (Gmail API)
│       └── gemini.js         # chat, summarize, categorize, suggest-reply
├── frontend/
│   ├── package.json
│   ├── vite.config.js    # Port 5174, proxy /api → localhost:3001
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   └── Home.jsx
│   │   ├── components/
│   │   │   ├── auth/GoogleButton.jsx
│   │   │   ├── cards/CardGrid.jsx, CategoryCard.jsx
│   │   │   ├── email/EmailDetail.jsx, EmailPreview.jsx
│   │   │   └── layout/MainLayout.jsx, TopBar.jsx, SortControls.jsx, ChatbotSidebar.jsx
│   │   ├── styles/
│   │   │   ├── global.css
│   │   │   ├── auth.css
│   │   │   └── home.css
│   │   └── utils/
│   │       ├── auth.js      # getSessionId, setSessionId, getAuthHeaders
│   │       └── gmailApi.js  # fetchMe, syncEmails, fetchEmails, fetchEmail, mapEmailFromBackend
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```

---

## 4. Environment Variables

Required in `.env` at project root:

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GEMINI_API_KEY=AIzaSy...
PORT=3001
REDIRECT_URI_BASE=http://localhost:3001
```

---

## 5. Database Schema (Supabase)

Tables (create if not exists):

- **users**: id (uuid), google_id (unique), email, full_name, avatar_url, created_at, updated_at
- **sessions**: id (uuid), user_id (fk users), expires_at, created_at
- **accounts**: id (uuid), user_id (fk users), provider, provider_account_id, access_token, refresh_token, expires_at, scope, unique(provider, provider_account_id)
- **user_preferences**: id, user_id (unique), triage_keywords (jsonb)
- **emails**: id (uuid), account_id (fk accounts), gmail_id, thread_id, subject, snippet, body_plain, body_html, from_address, to_addresses (array), cc_addresses (array), received_at, is_read, is_starred, label_ids (array), ai_category, ai_summary, search_vector (tsvector generated), unique(account_id, gmail_id)
- **attachments**: id, email_id (fk emails), gmail_attachment_id, filename, mime_type, size_bytes
- **ai_logs**: id, user_id, email_id, action, input_summary, output_summary, model

Indexes: use `CREATE INDEX IF NOT EXISTS` for idx_sessions_user_id, idx_sessions_expires, idx_accounts_user_id, idx_emails_account_id, idx_emails_received_at, idx_emails_ai_category, idx_emails_thread_id, idx_emails_search (gin), idx_attachments_email_id, idx_ai_logs_user_id, idx_ai_logs_email_id.

RLS: enable on all tables; policies allow service role (true).

---

## 6. API Specification

Base URL: `http://localhost:3001` (backend). Frontend uses Vite proxy: `/api` → `http://localhost:3001`.

### Auth Header

All protected routes expect: `X-Session-Id: <session_id>`.

### Auth Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/auth/google | No | Redirects to Google OAuth. Query: `redirect_url` (URL to return to after login) |
| GET | /api/auth/google/callback | No | OAuth callback. Exchanges code for tokens, upserts user/account, creates session, redirects to `redirect_url?auth=ok&session_id=<id>` |
| GET | /api/auth/me | Yes | Returns `{ user: { id, email, full_name, avatar_url } }` |

### Gmail Routes (all require X-Session-Id)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/gmail/sync | Fetches latest 50 emails from Gmail API, upserts into `emails` table. Returns `{ synced: number }` |
| GET | /api/gmail/list | Returns cached emails from Supabase: `{ emails: [...] }`. Fields: id, gmail_id, thread_id, subject, snippet, from_address, received_at, is_read, is_starred, ai_category, ai_summary |
| GET | /api/gmail/email/:id | Returns full email by Supabase id (not gmail_id). Fields: id, subject, from_address, to_addresses, cc_addresses, received_at, body_plain, body_html, snippet, ai_summary, ai_category |

### AI Routes (all require X-Session-Id)

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | /api/ai/chat | `{ messages: [{role, text}], message }` | Chat with Gemini 2.5 Flash. Returns `{ text }` |
| POST | /api/ai/summarize-email | `{ subject, body }` | One-shot email summary. Returns `{ text }` |
| POST | /api/ai/categorize | `{ emailId }` | Categorizes email (School/Finance/Work/Personal/Other), updates DB. Returns `{ category }` |
| POST | /api/ai/summarize | `{ emailId }` or `{ threadEmails }` | Thread summary. Updates ai_summary. Returns `{ summary }` |
| POST | /api/ai/suggest-reply | `{ emailId }` | Reply draft from last 3 messages. Returns `{ draft }` |

---

## 7. Auth Flow

1. User clicks "Sign in with Google" on Login/Signup page.
2. Frontend redirects to: `GET /api/auth/google?redirect_url=<origin>/home`
3. Backend redirects to Google OAuth.
4. Google redirects to backend: `GET /api/auth/google/callback?code=...&state=<redirect_url>`
5. Backend exchanges code for tokens, fetches profile from `https://www.googleapis.com/oauth2/v2/userinfo`, upserts `users` and `accounts`, creates `sessions` row, redirects to `redirect_url?auth=ok&session_id=<uuid>`
6. Frontend lands on `/home`, App.jsx `useEffect` reads `session_id` from URL, calls `setSessionId(sid)`, `setHasSession(true)`, replaces URL to remove params.
7. Session stored in `localStorage` under key `unclutter_session_id`.
8. All API calls send `X-Session-Id` header.

### Session Validation

`getAccountBySession(supabase, sessionId, config)`:
- Look up `sessions` by id, check `expires_at`
- Look up `accounts` for that user, provider=google
- If access token expired, refresh via `refreshAccessToken`, update `accounts`
- Return `{ accountId, userId, access_token, refresh_token }`

---

## 8. Gmail Sync Flow

1. Frontend calls `syncEmails()` → `GET /api/gmail/sync`
2. Backend uses `getAccountBySession` to get access token.
3. Backend calls Gmail API: `gmail.users.messages.list(maxResults: 50)`, then for each message `gmail.users.messages.get`.
4. Parses subject, from, to, cc, date, body (plain + html), labels (is_read = not UNREAD, is_starred = STARRED).
5. Upserts into `emails` with `onConflict: 'account_id,gmail_id'`.

---

## 9. Frontend Pages & Routing

| Path | Component | Auth | Description |
|------|-----------|------|-------------|
| / | Landing | No | Hero with "Get Started" / "Sign in" links |
| /login | Login | No | Google sign-in button |
| /signup | Signup | No | Google sign-up button (same OAuth flow) |
| /home | Home | Yes | Main inbox: cards, sort, email detail, chat sidebar |
| * | Redirect | - | Navigate to / |

`/home` is protected: if no session, redirect to `/login`.

---

## 10. Home Page Logic

- On mount (with session): fetch `fetchMe()`, `syncEmails()`, `fetchEmails()`.
- Map backend emails via `mapEmailFromBackend`: `from_address` → `sender`, `received_at` → `date` (keep `received_at` for sorting).
- Format date for display: same-day → time; within week → weekday; else → "Mon D".
- Sort range: Last 7 days, Last 30 days, Last 90 days, All time. Filter by `received_at` cutoff, sort desc.
- Search: client-side filter on sender, subject, snippet.
- "Run Sort" button: calls `syncEmails()`, then refreshes list.
- Selected email: `fetchEmail(id)` → full body, display in EmailDetail.
- Logout: clear session, redirect to /login.

---

## 11. UI Components

- **MainLayout**: TopBar + children.
- **TopBar**: logo "UnClutter", search input, user email, Sign out, Run Sort.
- **SortControls**: select (Last 7/30/90 days, All time), "Show keyword chips" toggle, "Run Sorting" button.
- **CardGrid**: Renders categories with emails. Each category = CategoryCard.
- **CategoryCard**: Header (name, count), description, list of EmailPreview.
- **EmailPreview**: sender, date, subject, snippet. Clickable, selected state.
- **EmailDetail**: Back button, subject, From/To/Date, labels, body, Summary box (Summarize button calls `/api/ai/summarize-email`).
- **ChatbotSidebar**: Message thread, suggested prompts, input. Sends to `/api/ai/chat` with `{ messages, message }`. Uses Gemini 2.5 Flash.

---

## 12. Gemini Prompts

- **Chat**: Standard conversational chat with history. Model: `gemini-2.5-flash`.
- **Summarize email**: "Summarize this email in 3–5 short bullet points. Output only the bullets, one per line."
- **Categorize**: "Assign exactly one category: School, Finance, Work, Personal, Other. macID→School, order/coupons→Finance. Reply with single category word."
- **Thread summary**: "Summarize this email thread in exactly 3 bullet points."
- **Suggest reply**: "Write a short, professional reply. Output only the reply body."

---

## 13. Google OAuth Configuration

- Scopes: gmail.readonly, gmail.send, gmail.modify, userinfo.email, userinfo.profile
- Redirect URI (in Google Cloud Console): `http://localhost:3001/api/auth/google/callback`
- `REDIRECT_URI_BASE` must match backend origin (e.g. http://localhost:3001)

---

## 14. npm Scripts

**Root:**
- `npm run dev` – concurrently runs `dev:server` and `dev:frontend`
- `npm run dev:server` – `node server/index.js` (port 3001)
- `npm run dev:frontend` – `cd frontend && npm run dev` (port 5174)
- `npm run build` – build frontend
- `npm run db:migrate` – `supabase db push`

**Frontend:**
- `npm run dev` – Vite dev server
- `npm run build` – Vite build
- `npm run preview` – Vite preview

---

## 15. Dependencies

**Root (backend):**
- express, cors, dotenv, @supabase/supabase-js, googleapis, @google/generative-ai
- dev: concurrently

**Frontend:**
- react, react-dom, react-router-dom
- dev: vite, @vitejs/plugin-react

---

## 16. Vite Config

- Port: 5174
- host: true
- Proxy: `/api` → `http://localhost:3001`

---

## 17. Styling Notes

- Gmail-inspired: --gmail-blue (#1a73e8), --gmail-red, --gmail-text, --gmail-border, etc.
- Auth pages: gradient background, card with rounded corners, Google button styling.
- Home: top bar, left panel (sort + cards), center (email detail), right (chat sidebar when open).
- Chat FAB: fixed bottom-right, toggles ChatbotSidebar.

---

This document, together with the actual codebase, should be sufficient to fully replicate UnClutter.
