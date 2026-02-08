import { Router } from 'express';
import { config } from '../config.js';
import { getAuthUrl, getTokensFromCode } from '../lib/google-oauth.js';
import { createClient } from '@supabase/supabase-js';
import { getAccountBySession } from '../lib/session.js';

export const authRouter = Router();
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

authRouter.get('/google', (req, res) => {
  if (!config.google.clientId || !config.google.clientSecret) {
    const state = (req.query.redirect_url || 'http://localhost:5174').toString();
    return res.redirect(`${state}?error=oauth_not_configured`);
  }
  const state = (req.query.redirect_url || 'http://localhost:5174').toString();
  const url = getAuthUrl(config.google.clientId, state);
  res.redirect(url);
});

authRouter.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const redirectUrl = typeof state === 'string' ? state : 'http://localhost:5174';

  if (typeof code !== 'string') {
    return res.redirect(`${redirectUrl}?error=missing_code`);
  }

  if (!config.google.clientId || !config.google.clientSecret) {
    return res.redirect(`${redirectUrl}?error=oauth_not_configured`);
  }

  try {
    const tokens = await getTokensFromCode(
      code,
      config.google.clientId,
      config.google.clientSecret
    );

    const profile = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    }).then((r) => r.json());

    const googleId = profile?.id;
    const email = profile?.email;
    const name = profile?.name;
    const picture = profile?.picture;

    if (!googleId || !email) {
      return res.redirect(`${redirectUrl}?error=no_profile`);
    }

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null;

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('google_id', googleId)
      .single();

    let userId;
    if (existingUser?.id) {
      userId = existingUser.id;
      await supabase
        .from('users')
        .update({
          email,
          full_name: name,
          avatar_url: picture,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    } else {
      const { data: newUser, error: userErr } = await supabase
        .from('users')
        .insert({ google_id: googleId, email, full_name: name, avatar_url: picture })
        .select('id')
        .single();
      if (userErr) {
        console.error(userErr);
        return res.redirect(`${redirectUrl}?error=db_user`);
      }
      userId = newUser.id;
    }

    await supabase.from('accounts').upsert(
      {
        user_id: userId,
        provider: 'google',
        provider_account_id: googleId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: expiresAt,
        scope: tokens.scope ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider,provider_account_id' }
    );

    const sessionExpires = new Date();
    sessionExpires.setDate(sessionExpires.getDate() + 7);
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .insert({ user_id: userId, expires_at: sessionExpires.toISOString() })
      .select('id')
      .single();

    if (sessionErr || !session) {
      console.error(sessionErr);
      return res.redirect(`${redirectUrl}?error=session`);
    }

    res.redirect(`${redirectUrl}?auth=ok&session_id=${session.id}`);
  } catch (e) {
    console.error(e);
    res.redirect(`${redirectUrl}?error=callback`);
  }
});

authRouter.get('/me', async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    return res.status(401).json({ error: 'Missing X-Session-Id' });
  }
  const account = await getAccountBySession(supabase, sessionId, config);
  if (!account) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  const { data: user } = await supabase.from('users').select('id, email, full_name, avatar_url').eq('id', account.userId).single();
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({ user });
});
