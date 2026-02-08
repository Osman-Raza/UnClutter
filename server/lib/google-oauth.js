const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const REDIRECT_URI_BASE = process.env.REDIRECT_URI_BASE ?? 'http://localhost:3001';

export function getAuthUrl(clientId, state) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${REDIRECT_URI_BASE}/api/auth/google/callback`,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });
  if (state) params.set('state', state);
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function getTokensFromCode(code, clientId, clientSecret) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${REDIRECT_URI_BASE}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${t}`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken, clientId, clientSecret) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Refresh failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  return { access_token: data.access_token, expiry_date: data.expiry_date };
}
