import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { getAccountBySession } from '../lib/session.js';

export const groupsRouter = Router();
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

function requireSession(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    res.status(401).json({ error: 'Missing X-Session-Id' });
    return;
  }
  getAccountBySession(supabase, sessionId, config).then((account) => {
    if (!account) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }
    req.accountId = account.accountId;
    next();
  });
}

groupsRouter.use(requireSession);

groupsRouter.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('user_groups')
    .select('*')
    .eq('account_id', req.accountId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch groups' });
  }
  res.json({ groups: data || [] });
});

groupsRouter.post('/', async (req, res) => {
  const { name, description = '', color = '#5f6368', match_keywords = [], match_domains = [], match_senders = [] } = req.body ?? {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name required' });
  }
  const trimmedName = name.trim();

  // Check for duplicate group name
  const { data: existing } = await supabase
    .from('user_groups')
    .select('id')
    .eq('account_id', req.accountId)
    .ilike('name', trimmedName)
    .limit(1);

  if (existing && existing.length > 0) {
    return res.status(409).json({ error: `A group named "${trimmedName}" already exists. Try a different name or edit the existing group.` });
  }

  const { data: groups } = await supabase.from('user_groups').select('sort_order').eq('account_id', req.accountId);
  const maxOrder = (groups || []).reduce((m, g) => Math.max(m, g.sort_order || 0), 0);
  const { data, error } = await supabase
    .from('user_groups')
    .insert({
      account_id: req.accountId,
      name: trimmedName,
      description: String(description || '').trim(),
      color: String(color || '#5f6368').trim(),
      match_keywords: Array.isArray(match_keywords) ? match_keywords : [],
      match_domains: Array.isArray(match_domains) ? match_domains : [],
      match_senders: Array.isArray(match_senders) ? match_senders : [],
      sort_order: maxOrder + 1,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    console.error(error);
    if (error.code === '23505') {
      return res.status(409).json({ error: `A group named "${trimmedName}" already exists` });
    }
    return res.status(500).json({ error: 'Failed to create group' });
  }
  res.json({ group: data });
});

groupsRouter.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = {};
  const allowed = ['name', 'description', 'color', 'match_keywords', 'match_domains', 'match_senders', 'sort_order'];
  for (const k of allowed) {
    if (req.body?.[k] !== undefined) {
      updates[k] = req.body[k];
    }
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }
  updates.updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('user_groups')
    .update(updates)
    .eq('id', id)
    .eq('account_id', req.accountId)
    .select()
    .single();
  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update group' });
  }
  if (!data) return res.status(404).json({ error: 'Group not found' });
  res.json({ group: data });
});

groupsRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('user_groups').delete().eq('id', id).eq('account_id', req.accountId);
  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to delete group' });
  }
  res.json({ ok: true });
});
