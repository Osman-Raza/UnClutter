import { refreshAccessToken } from './google-oauth.js';

export async function getAccountBySession(supabase, sessionId, cfg) {
  const { data: session } = await supabase
    .from('sessions')
    .select('user_id, expires_at')
    .eq('id', sessionId)
    .single();

  if (!session || new Date(session.expires_at) < new Date()) {
    return null;
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('id, user_id, access_token, refresh_token, expires_at')
    .eq('user_id', session.user_id)
    .eq('provider', 'google')
    .single();

  if (!account) return null;

  let accessToken = account.access_token;
  const expiresAt = account.expires_at ? new Date(account.expires_at) : null;
  if (expiresAt && expiresAt < new Date() && account.refresh_token) {
    const refreshed = await refreshAccessToken(
      account.refresh_token,
      cfg.google.clientId,
      cfg.google.clientSecret
    );
    accessToken = refreshed.access_token;
    await supabase
      .from('accounts')
      .update({
        access_token: accessToken,
        expires_at: refreshed.expiry_date ? new Date(refreshed.expiry_date).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id);
  }

  return {
    accountId: account.id,
    userId: account.user_id,
    access_token: accessToken,
    refresh_token: account.refresh_token,
  };
}
