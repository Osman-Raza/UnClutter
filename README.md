# UnClutter

Your inbox, simplified. Login with Google, sync Gmail, sort emails, and chat with AI (Gemini 2.5 Flash).

## Setup

### 1. Environment

Copy `.env.example` to `.env` and fill in:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GEMINI_API_KEY=...
PORT=3001
REDIRECT_URI_BASE=http://localhost:3001
```

### 2. Supabase

- Create a project at [supabase.com](https://supabase.com)
- Run the migration in `supabase/migrations/001_initial_schema.sql` via the Supabase SQL Editor

### 3. Google Cloud

- Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- Create OAuth 2.0 credentials (Web application)
- Add redirect URI: `http://localhost:3001/api/auth/google/callback`
- Enable Gmail API

### 4. Run

```bash
npm install
npm run dev
```

This starts:
- **Backend** (Node.js) on port 3001
- **Frontend** (Vite + React) on port 5174

Open http://localhost:5174 and sign in with Google.
