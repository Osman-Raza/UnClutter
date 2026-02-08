import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import {
  fetchLatestEmails,
  fetchEmailsByLabel,
  fetchEmailsByQuery,
  fetchDrafts,
  fetchLabelCounts,
  sendEmail,
  trashEmail,
  archiveEmail,
  toggleStarEmail,
  toggleReadEmail,
} from '../lib/gmail.js';
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

const DEFAULT_GROUPS = [
  { name: 'Promotions', description: 'Deals, offers, and marketing emails', color: '#f4b400', match_keywords: ['sale', 'deal', 'offer', 'discount', 'coupon', 'promo', 'unsubscribe', 'newsletter'], match_domains: [], sort_order: 1 },
  { name: 'Updates', description: 'Receipts, confirmations, and account updates', color: '#ab47bc', match_keywords: ['receipt', 'confirmation', 'order', 'shipped', 'security alert', 'verify'], match_domains: [], sort_order: 2 },
  { name: 'Social', description: 'Social media notifications', color: '#db4437', match_keywords: ['facebook', 'twitter', 'linkedin', 'notification', 'commented', 'liked'], match_domains: ['facebookmail.com', 'linkedin.com'], sort_order: 3 },
];

async function ensureDefaultGroups(accountId) {
  const { data: existing } = await supabase.from('user_groups').select('id').eq('account_id', accountId).limit(1);
  if (existing?.length) return;
  for (const g of DEFAULT_GROUPS) {
    await supabase.from('user_groups').insert({
      account_id: accountId,
      name: g.name,
      description: g.description || '',
      color: g.color,
      match_keywords: g.match_keywords || [],
      match_domains: g.match_domains || [],
      sort_order: g.sort_order ?? 0,
      updated_at: new Date().toISOString(),
    });
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
    ensureDefaultGroups(account.accountId).catch(() => {});
    res.json({ synced: emails.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Sync failed' });
  }
});

gmailRouter.get('/list', async (req, res) => {
  const { account } = req;
  const { data, error } = await supabase
    .from('emails')
    .select('id, gmail_id, thread_id, subject, snippet, from_address, received_at, is_read, is_starred, is_pinned, pinned_at, label_ids, ai_category, ai_summary')
    .eq('account_id', account.accountId)
    .order('received_at', { ascending: false })
    .limit(100);
  if (error) return res.status(500).json({ error: 'Failed to fetch emails' });
  res.json({ emails: data || [] });
});

gmailRouter.get('/email/:id', async (req, res) => {
  const { account } = req;
  const { id } = req.params;
  const { data, error } = await supabase
    .from('emails')
    .select('id, gmail_id, thread_id, subject, from_address, to_addresses, cc_addresses, received_at, body_plain, body_html, snippet, ai_summary, ai_category, is_starred, is_read, is_pinned, pinned_at')
    .eq('id', id)
    .eq('account_id', account.accountId)
    .single();
  if (error || !data) return res.status(404).json({ error: 'Email not found' });
  res.json(data);
});

gmailRouter.delete('/email/:id', async (req, res) => {
  const { account } = req;
  const { id } = req.params;
  const { data: row } = await supabase.from('emails').select('gmail_id').eq('id', id).eq('account_id', account.accountId).single();
  if (!row) return res.status(404).json({ error: 'Email not found' });
  try {
    await trashEmail(account.access_token, row.gmail_id);
    await supabase.from('emails').delete().eq('id', id).eq('account_id', account.accountId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[gmail] Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete email' });
  }
});

gmailRouter.post('/email/:id/archive', async (req, res) => {
  const { account } = req;
  const { id } = req.params;
  const { data: row } = await supabase.from('emails').select('gmail_id, label_ids').eq('id', id).eq('account_id', account.accountId).single();
  if (!row) return res.status(404).json({ error: 'Email not found' });
  try {
    await archiveEmail(account.access_token, row.gmail_id);
    const newLabels = (row.label_ids || []).filter((l) => l !== 'INBOX');
    await supabase.from('emails').update({ label_ids: newLabels, updated_at: new Date().toISOString() }).eq('id', id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[gmail] Archive error:', err.message);
    res.status(500).json({ error: 'Failed to archive' });
  }
});

gmailRouter.post('/email/:id/star', async (req, res) => {
  const { account } = req;
  const { id } = req.params;
  const { data: email } = await supabase.from('emails').select('gmail_id, is_starred').eq('id', id).eq('account_id', account.accountId).single();
  if (!email) return res.status(404).json({ error: 'Email not found' });
  const newStarred = !email.is_starred;
  try {
    await toggleStarEmail(account.access_token, email.gmail_id, newStarred);
    await supabase.from('emails').update({ is_starred: newStarred, updated_at: new Date().toISOString() }).eq('id', id);
    res.json({ success: true, is_starred: newStarred });
  } catch (err) {
    console.error('[gmail] Star error:', err.message);
    res.status(500).json({ error: 'Failed to toggle star' });
  }
});

gmailRouter.post('/email/:id/read', async (req, res) => {
  const { account } = req;
  const { id } = req.params;
  const { data: email } = await supabase.from('emails').select('gmail_id, is_read').eq('id', id).eq('account_id', account.accountId).single();
  if (!email) return res.status(404).json({ error: 'Email not found' });
  const newRead = !email.is_read;
  try {
    await toggleReadEmail(account.access_token, email.gmail_id, newRead);
    await supabase.from('emails').update({ is_read: newRead, updated_at: new Date().toISOString() }).eq('id', id);
    res.json({ success: true, is_read: newRead });
  } catch (err) {
    console.error('[gmail] Read toggle error:', err.message);
    res.status(500).json({ error: 'Failed to toggle read status' });
  }
});

gmailRouter.post('/email/:id/pin', async (req, res) => {
  const { account } = req;
  const { id } = req.params;
  const { data: email } = await supabase.from('emails').select('id, is_pinned').eq('id', id).eq('account_id', account.accountId).single();
  if (!email) return res.status(404).json({ error: 'Email not found' });
  const newPinned = !email.is_pinned;
  const { error: updateErr } = await supabase
    .from('emails')
    .update({
      is_pinned: newPinned,
      pinned_at: newPinned ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (updateErr) {
    console.error('[gmail] Pin error:', updateErr.message);
    return res.status(500).json({ error: 'Failed to toggle pin' });
  }
  res.json({ success: true, is_pinned: newPinned });
});

gmailRouter.get('/folder/:label', async (req, res) => {
  const { account } = req;
  const label = (req.params.label || 'inbox').toLowerCase();
  const labelMap = { inbox: 'INBOX', sent: 'SENT', draft: 'DRAFT', trash: 'TRASH', spam: 'SPAM', starred: 'STARRED' };
  const labelId = labelMap[label] || 'INBOX';
  try {
    const emails = await fetchEmailsByLabel(account.access_token, labelId, 50);
    res.json({ emails });
  } catch (err) {
    console.error('[gmail] Folder error:', err.message);
    res.status(500).json({ error: 'Failed to fetch folder' });
  }
});

gmailRouter.get('/drafts', async (req, res) => {
  const { account } = req;
  try {
    const drafts = await fetchDrafts(account.access_token, 20);
    res.json({ emails: drafts });
  } catch (err) {
    console.error('[gmail] Drafts error:', err.message);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

gmailRouter.get('/label-counts', async (req, res) => {
  const { account } = req;
  try {
    const counts = await fetchLabelCounts(account.access_token);
    res.json(counts);
  } catch (err) {
    console.error('[gmail] Label counts error:', err.message);
    res.status(500).json({ error: 'Failed to fetch counts' });
  }
});

gmailRouter.post('/send', async (req, res) => {
  const { account } = req;
  const { to, cc, bcc, subject, body } = req.body || {};
  if (!to || !subject) return res.status(400).json({ error: 'to and subject required' });
  try {
    const result = await sendEmail(account.access_token, { to, cc, bcc, subject, body });
    res.json({ success: true, messageId: result.id, threadId: result.threadId });
  } catch (err) {
    console.error('[gmail] Send error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to send' });
  }
});

gmailRouter.post('/reply/:id', async (req, res) => {
  const { account } = req;
  const { id } = req.params;
  const { body, cc, bcc } = req.body || {};
  const { data: original } = await supabase.from('emails').select('gmail_id, thread_id, subject, from_address').eq('id', id).eq('account_id', account.accountId).single();
  if (!original) return res.status(404).json({ error: 'Email not found' });
  try {
    const result = await sendEmail(account.access_token, {
      to: original.from_address,
      subject: original.subject?.startsWith('Re:') ? original.subject : `Re: ${original.subject || ''}`,
      body: body || '',
      cc,
      bcc,
      threadId: original.thread_id,
    });
    res.json({ success: true, messageId: result.id, threadId: result.threadId });
  } catch (err) {
    console.error('[gmail] Reply error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to send reply' });
  }
});
