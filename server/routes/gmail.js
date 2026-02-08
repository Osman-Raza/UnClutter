import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { fetchLatestEmails } from '../lib/gmail.js';
import { getAccountBySession } from '../lib/session.js';

export const gmailRouter = Router();
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

gmailRouter.use(async (req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    return res.status(401).json({ error: 'Missing X-Session-Id' });
  }
  const account = await getAccountBySession(supabase, sessionId, config);
  if (!account) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  req.account = account;
  next();
});

/* ── Default groups created on first sync ── */
const DEFAULT_GROUPS = [
  {
    name: 'Promotions',
    description: 'Deals, offers, and marketing emails',
    color: '#f4b400',
    match_keywords: [
      'sale', 'deal', 'offer', 'discount', 'coupon', 'promo',
      'limited time', 'special offer', 'shop now', 'buy now',
      'unsubscribe', 'newsletter', 'promotional', 'off your',
      'free shipping', 'exclusive', 'save', 'clearance',
    ],
    match_domains: [],
    sort_order: 1,
  },
  {
    name: 'Updates',
    description: 'Receipts, confirmations, and account updates',
    color: '#ab47bc',
    match_keywords: [
      'receipt', 'confirmation', 'order', 'shipped', 'delivered',
      'tracking', 'invoice', 'payment', 'statement', 'your account',
      'security alert', 'verify', 'password', 'signed in',
    ],
    match_domains: [],
    sort_order: 2,
  },
  {
    name: 'Social',
    description: 'Social media notifications',
    color: '#db4437',
    match_keywords: [
      'facebook', 'twitter', 'instagram', 'linkedin', 'reddit',
      'notification', 'commented', 'liked', 'mentioned you',
      'tagged you', 'friend request', 'new follower',
    ],
    match_domains: ['facebookmail.com', 'linkedin.com', 'twitter.com', 'reddit.com'],
    sort_order: 3,
  },
];

async function ensureDefaultGroups(accountId) {
  try {
    const { data: existing } = await supabase
      .from('user_groups')
      .select('id')
      .eq('account_id', accountId)
      .limit(1);

    // If user already has groups, skip
    if (existing && existing.length > 0) return;

    console.log('[sync] Creating default groups for account:', accountId);
    for (const g of DEFAULT_GROUPS) {
      const { error } = await supabase.from('user_groups').insert({
        account_id: accountId,
        name: g.name,
        description: g.description,
        color: g.color,
        match_keywords: g.match_keywords,
        match_domains: g.match_domains,
        match_senders: [],
        sort_order: g.sort_order,
        updated_at: new Date().toISOString(),
      });
      if (error && error.code !== '23505') {
        console.error('[sync] Error creating default group:', g.name, error.message);
      }
    }
    console.log('[sync] Default groups created');
  } catch (err) {
    console.error('[sync] ensureDefaultGroups error:', err.message);
  }
}

gmailRouter.post('/sync', async (req, res) => {
  const { account } = req;
  try {
    const emails = await fetchLatestEmails(account.access_token, 50);

    for (const e of emails) {
      await supabase.from('emails').upsert(
        {
          account_id: account.accountId,
          gmail_id: e.gmail_id,
          thread_id: e.thread_id,
          subject: e.subject,
          snippet: e.snippet,
          body_plain: e.body_plain,
          body_html: e.body_html,
          from_address: e.from_address,
          to_addresses: e.to_addresses,
          cc_addresses: e.cc_addresses,
          received_at: e.received_at,
          is_read: e.is_read,
          is_starred: e.is_starred,
          label_ids: e.label_ids,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account_id,gmail_id' }
      );
    }

    // Create default groups on first sync (non-blocking)
    ensureDefaultGroups(account.accountId).catch(() => {});

    res.json({ synced: emails.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

gmailRouter.get('/list', async (req, res) => {
  const { account } = req;
  const { data, error } = await supabase
    .from('emails')
    .select('id, gmail_id, thread_id, subject, snippet, from_address, received_at, is_read, is_starred, label_ids, ai_category, ai_summary')
    .eq('account_id', account.accountId)
    .order('received_at', { ascending: false })
    .limit(100);

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ emails: data });
});

gmailRouter.get('/email/:id', async (req, res) => {
  const { account } = req;
  const { id } = req.params;
  const { data, error } = await supabase
    .from('emails')
    .select('id, subject, from_address, to_addresses, cc_addresses, received_at, body_plain, body_html, snippet, ai_summary, ai_category')
    .eq('id', id)
    .eq('account_id', account.accountId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(data);
});
