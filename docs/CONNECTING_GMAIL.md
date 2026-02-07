# Connecting Gmail to UnClutter

Follow these steps to use real Gmail data instead of mock data.

---

## 1. Google Cloud Console setup

### 1.1 Create or select a project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. "UnClutter") or select an existing one.
3. Note your **Project ID**; you’ll use it in the OAuth consent screen and credentials.

### 1.2 Enable the Gmail API

1. In the left sidebar: **APIs & Services** → **Library**.
2. Search for **Gmail API** and open it.
3. Click **Enable**.

### 1.3 Configure the OAuth consent screen

1. **APIs & Services** → **OAuth consent screen**.
2. Choose **External** (so any Google account can sign in). Click **Create**.
3. Fill in:
   - **App name:** UnClutter
   - **User support email:** your email
   - **Developer contact:** your email
4. Click **Save and Continue**.
5. **Scopes:** Click **Add or Remove Scopes**. Add:
   - `https://www.googleapis.com/auth/gmail.readonly` (read email)
   - `https://www.googleapis.com/auth/gmail.send` (send replies)
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
6. Save and continue through **Test users** (add your Gmail for testing) and **Summary**.

### 1.4 Create OAuth 2.0 credentials

1. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
2. **Application type:** Web application.
3. **Name:** e.g. UnClutter Web.
4. **Authorized JavaScript origins:**
   - `http://localhost:5174` (your Vite dev server)
   - `http://localhost:5173` (if you use it)
   - Add your production URL later (e.g. `https://yourdomain.com`).
5. **Authorized redirect URIs:**
   - `http://localhost:5001/api/auth/google/callback` (backend uses 5001 to avoid conflict with macOS AirPlay on 5000)
   - Add production callback later (e.g. `https://yourdomain.com/api/auth/callback`).
6. Click **Create**. Download or copy the **Client ID** and **Client secret**; you’ll put the secret only in the backend.

---

## 2. Backend: auth + Gmail API proxy

The backend must:

- Run the OAuth flow (redirect to Google, handle callback, exchange code for tokens).
- Store refresh tokens (e.g. in a small DB or file) so you can get new access tokens.
- Expose endpoints that use the Gmail API (list messages, get a message, etc.) so the frontend never sees tokens or the client secret.

### 2.1 Environment variables (backend)

Create `backend/.env` (and add it to `.gitignore`):

```env
GOOGLE_CLIENT_ID=your_client_id_from_console.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
FLASK_SECRET_KEY=any_random_string_for_sessions
FRONTEND_URL=http://localhost:5174
```

Never commit the client secret or put it in the frontend.

### 2.2 Backend endpoints (high level)

| Endpoint | Purpose |
|----------|--------|
| `GET /api/auth/login` | Redirects user to Google OAuth. |
| `GET /api/auth/callback` | Google redirects here with `?code=...`; backend exchanges code for tokens, stores refresh token, redirects to frontend with session. |
| `GET /api/auth/me` | Returns current user email (or 401 if not logged in). |
| `POST /api/auth/logout` | Clears session. |
| `GET /api/emails` | List emails (query params: `maxResults`, `q`, `labelIds`, etc.). Backend uses stored access/refresh token. |
| `GET /api/emails/:id` | Get one email by id. |

Backend uses the Gmail API with the user’s token (e.g. `users().messages().list()` and `users().messages().get()`), then returns JSON to the frontend.

### 2.3 Token storage

- **Access token:** Use it until it expires (often ~1 hour). Don’t store long-term.
- **Refresh token:** Store it securely (DB or encrypted file) and associate it with the user (e.g. by email or a user id). Use it to get new access tokens when needed.
- Prefer storing only server-side; use cookies or a short-lived session so the frontend never sees refresh/access tokens.

---

## 3. Frontend changes

1. **Login**
   - “Sign in with Google” should send the user to the backend:  
     `window.location.href = 'http://localhost:5001/api/auth/login'`  
     (or your backend URL). No client-side OAuth with the client secret.

2. **After login**
   - Backend redirects to e.g. `http://localhost:5174/home?logged_in=1` (or `/home` with a cookie set). Frontend loads `/home` and then calls `GET /api/auth/me` to get the user and show the inbox.

3. **Fetching emails**
   - Replace mock data in `Home.jsx` (and any other inbox views) with:
     - `GET /api/emails?maxResults=50&q=...` for the list.
     - `GET /api/emails/:id` for the email detail when the user clicks an email.
   - Map Gmail API response (e.g. `messages[].id`, `snippet`, `payload.headers` for subject/from/date) into the shape your existing components expect (or adapt components to the Gmail shape).

4. **Logout**
   - Call `POST /api/auth/logout` and/or clear local state, then redirect to `/login` or `/`.

---

## 4. Suggested order of implementation

1. **Google Cloud:** Create project, enable Gmail API, set OAuth consent screen, create OAuth client (Web), copy Client ID and Client secret.
2. **Backend:** Implement auth routes (`/api/auth/login`, `/api/auth/callback`, `/api/auth/me`, `/api/auth/logout`) and a simple token store (e.g. in-memory or SQLite by user email). Test login in the browser.
3. **Backend:** Add Gmail API calls (list messages, get message) and expose `GET /api/emails` and `GET /api/emails/:id`. Test with curl or Postman using a logged-in session.
4. **Frontend:** Point “Sign in with Google” to the backend login URL; after redirect, call `/api/auth/me` and then `/api/emails` and render the list and detail views with real data.

---

## 5. Security reminders

- **Client secret:** Only in the backend `.env`, never in the frontend or in git.
- **Redirect URIs:** Must match exactly what you set in the OAuth client (including `http` vs `https` and port).
- **Tokens:** Keep refresh and access tokens only on the backend; use HTTP-only cookies or short-lived session IDs for the browser.
- **HTTPS in production:** Use `https` for your app and callback URL in production.

---

## 6. Optional: backend tech choices

- **Python:** Flask or FastAPI with `google-auth-oauthlib` and `google-api-python-client` for Gmail.
- **Node:** Express with `googleapis` and `google-auth-library` (or Passport.js for OAuth).

If you tell me your preferred backend (e.g. Flask vs FastAPI vs Node), I can outline or write the exact auth and Gmail endpoints next.
