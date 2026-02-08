import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { getAccountBySession } from '../lib/session.js';
import {
  categorizeWithGemini,
  summarizeWithGemini,
  suggestReplyWithGemini,
  chatWithGemini,
  summarizeEmailWithGemini,
} from '../lib/gemini.js';
import {
  categorizeWithGroq,
  summarizeWithGroq,
  suggestReplyWithGroq,
  chatWithGroq,
  summarizeEmailWithGroq,
  suggestGroupFromIntent as suggestGroupFromIntentGroq,
  extractJSON,
} from '../lib/groq.js';
import { suggestGroupFromIntent as suggestGroupFromIntentGemini } from '../lib/gemini.js';

export const aiRouter = Router();
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

/* Color palette for AI-created groups — cycles so each new group gets a different color */
const GROUP_COLORS = [
  '#4285f4', '#0f9d58', '#f4b400', '#db4437', '#ab47bc',
  '#ff6d00', '#00897b', '#e8710a', '#185abc', '#c5221f',
];

async function pickGroupColor(accountId) {
  const { data: groups } = await supabase
    .from('user_groups')
    .select('color')
    .eq('account_id', accountId);
  const usedColors = (groups || []).map((g) => g.color);
  // Pick the first color not yet used, or cycle back
  const unused = GROUP_COLORS.find((c) => !usedColors.includes(c));
  return unused || GROUP_COLORS[(groups || []).length % GROUP_COLORS.length];
}

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
    req.userId = account.userId;
    req.accountId = account.accountId;
    next();
  });
}

aiRouter.use(requireSession);

function getAiProvider() {
  if (config.groq.apiKey) return 'groq';
  if (config.gemini.apiKey) return 'gemini';
  return null;
}

aiRouter.post('/summarize-email', async (req, res) => {
  const provider = getAiProvider();
  if (!provider) return res.status(503).json({ error: 'AI not configured (set GROQ_API_KEY or GEMINI_API_KEY)' });
  const { subject = '', body = '' } = req.body ?? {};
  try {
    const text =
      provider === 'groq'
        ? await summarizeEmailWithGroq(config.groq.apiKey, subject, body)
        : await summarizeEmailWithGemini(config.gemini.apiKey, subject, body);
    res.json({ text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Summarization failed' });
  }
});

aiRouter.post('/chat', async (req, res) => {
  const provider = getAiProvider();
  if (!provider) return res.status(503).json({ error: 'AI not configured (set GROQ_API_KEY or GEMINI_API_KEY)' });
  const { messages = [], message, selectedEmail, emails: emailsPreview } = req.body ?? {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message required' });
  }
  const history = Array.isArray(messages) ? messages : [];
  const context = { selectedEmail, emailsPreview: Array.isArray(emailsPreview) ? emailsPreview.slice(0, 25) : [] };

  console.log('=== CHAT REQUEST ===');
  console.log('User message:', message);
  console.log('Provider:', provider);

  try {
    const aiText =
      provider === 'groq'
        ? await chatWithGroq(config.groq.apiKey, history, message, context)
        : await chatWithGemini(config.gemini.apiKey, history, message, context);

    console.log('AI response (first 500):', (aiText || '').slice(0, 500));

    // ── Check if AI responded with a group creation JSON ──
    const parsed = extractJSON(aiText);
    if (parsed && parsed.action === 'create_group' && parsed.name && Array.isArray(parsed.keywords) && parsed.keywords.length > 0) {
      console.log('=== GROUP CREATION DETECTED IN CHAT ===');
      console.log('Group name:', parsed.name);
      console.log('Keywords:', parsed.keywords);
      console.log('Description:', parsed.description);

      try {
        const name = String(parsed.name).trim().slice(0, 50);
        const description = String(parsed.description || '').trim();
        const keywords = parsed.keywords.map(k => String(k).toLowerCase().trim()).filter(Boolean);
        const domains = Array.isArray(parsed.domains) ? parsed.domains.map(d => String(d).toLowerCase().trim()).filter(Boolean) : [];

        // Check for duplicate
        const { data: existingGroup } = await supabase
          .from('user_groups')
          .select('id, name')
          .eq('account_id', req.accountId)
          .ilike('name', name)
          .limit(1);

        if (existingGroup && existingGroup.length > 0) {
          console.log('Duplicate group name found:', name);
          return res.json({
            text: `A group named "${name}" already exists. Try a different name or edit the existing group.`,
            action: 'chat',
          });
        }

        const { data: groups } = await supabase.from('user_groups').select('sort_order').eq('account_id', req.accountId);
        const maxOrder = (groups || []).reduce((m, g) => Math.max(m, g.sort_order || 0), 0);
        const groupColor = await pickGroupColor(req.accountId);

        const { data: group, error: dbError } = await supabase
          .from('user_groups')
          .insert({
            account_id: req.accountId,
            name,
            description,
            color: groupColor,
            match_keywords: keywords,
            match_domains: domains,
            match_senders: [],
            sort_order: maxOrder + 1,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (dbError) {
          console.error('DB error creating group from chat:', dbError);
          if (dbError.code === '23505') {
            return res.json({ text: `A group named "${name}" already exists.`, action: 'chat' });
          }
          return res.json({ text: `Failed to create group: ${dbError.message}`, action: 'chat' });
        }

        console.log('Group created from chat:', group.id, group.name);
        return res.json({
          text: `Created group "${name}"${description ? ` — ${description}` : ''}.\n\nKeywords: ${keywords.join(', ')}\n\nSwitch to Grouped view to see your new group.`,
          action: 'group_created',
          group,
        });
      } catch (createErr) {
        console.error('Error creating group from chat response:', createErr);
        return res.json({ text: `I tried to create the group but hit an error: ${createErr.message}`, action: 'chat' });
      }
    }

    // ── Normal chat response ──
    const chatText = parsed?.message || aiText;
    res.json({ text: chatText, action: 'chat' });
  } catch (e) {
    console.error('Chat error:', e);
    const msg = e?.message || String(e);
    const isRateLimit = msg.includes('rate limit') || msg.includes('429') || msg.includes('Rate limit');
    if (isRateLimit) {
      return res.status(429).json({
        error: 'AI is temporarily busy due to rate limits. Please wait a moment and try again.',
        retryAfter: 15,
      });
    }
    res.status(500).json({ error: 'Chat failed. Please try again.' });
  }
});

aiRouter.post('/categorize', async (req, res) => {
  const provider = getAiProvider();
  if (!provider) return res.status(503).json({ error: 'AI not configured (set GROQ_API_KEY or GEMINI_API_KEY)' });
  const emailId = req.body?.emailId;
  if (!emailId) return res.status(400).json({ error: 'emailId required' });
  const { data: email } = await supabase
    .from('emails')
    .select('id, subject, snippet, body_plain')
    .eq('id', emailId)
    .single();
  if (!email) return res.status(404).json({ error: 'Email not found' });
  try {
    const categorize = provider === 'groq' ? categorizeWithGroq : categorizeWithGemini;
    const apiKey = provider === 'groq' ? config.groq.apiKey : config.gemini.apiKey;
    const category = await categorize(apiKey, {
      subject: email.subject,
      snippet: email.snippet,
      body: (email.body_plain || '').slice(0, 4000),
    });
    await supabase
      .from('emails')
      .update({ ai_category: category, updated_at: new Date().toISOString() })
      .eq('id', emailId);
    res.json({ category });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Categorization failed' });
  }
});

aiRouter.post('/summarize', async (req, res) => {
  const provider = getAiProvider();
  if (!provider) return res.status(503).json({ error: 'AI not configured (set GROQ_API_KEY or GEMINI_API_KEY)' });
  const { emailId, threadEmails } = req.body ?? {};
  const summarize = provider === 'groq' ? summarizeWithGroq : summarizeWithGemini;
  const apiKey = provider === 'groq' ? config.groq.apiKey : config.gemini.apiKey;
  if (threadEmails && Array.isArray(threadEmails) && threadEmails.length > 0) {
    try {
      const summary = await summarize(apiKey, threadEmails);
      if (emailId) {
        await supabase
          .from('emails')
          .update({ ai_summary: summary, updated_at: new Date().toISOString() })
          .eq('id', emailId);
      }
      return res.json({ summary });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Summarization failed' });
    }
  }
  if (!emailId) return res.status(400).json({ error: 'emailId or threadEmails required' });
  const { data: email } = await supabase.from('emails').select('thread_id, account_id').eq('id', emailId).single();
  if (!email) return res.status(404).json({ error: 'Email not found' });
  const { data: thread } = await supabase
    .from('emails')
    .select('subject, snippet, body_plain, from_address, received_at')
    .eq('account_id', email.account_id)
    .eq('thread_id', email.thread_id)
    .order('received_at', { ascending: true });
  if (!thread?.length) return res.status(404).json({ error: 'Thread not found' });
  try {
    const summary = await summarize(apiKey, thread);
    await supabase
      .from('emails')
      .update({ ai_summary: summary, updated_at: new Date().toISOString() })
      .eq('id', emailId);
    res.json({ summary });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Summarization failed' });
  }
});

aiRouter.post('/create-group', async (req, res) => {
  console.log('=== CREATE GROUP REQUEST ===');
  const provider = getAiProvider();
  if (!provider) return res.status(503).json({ error: 'AI not configured (set GROQ_API_KEY or GEMINI_API_KEY)' });
  const { intent } = req.body ?? {};
  console.log('Intent:', intent);
  console.log('Account ID:', req.accountId);
  if (!intent || typeof intent !== 'string') {
    return res.status(400).json({ error: 'intent required (e.g. "create a group for university emails")' });
  }
  const { data: sampleEmails } = await supabase
    .from('emails')
    .select('id, subject, snippet, from_address')
    .eq('account_id', req.accountId)
    .order('received_at', { ascending: false })
    .limit(30);
  console.log('Sample emails fetched:', (sampleEmails || []).length);
  const suggestGroup = provider === 'groq' ? suggestGroupFromIntentGroq : suggestGroupFromIntentGemini;
  const apiKey = provider === 'groq' ? config.groq.apiKey : config.gemini.apiKey;
  try {
    const suggested = await suggestGroup(apiKey, intent.trim(), sampleEmails || []);
    console.log('AI suggested group:', JSON.stringify(suggested));
    const name = (suggested.name || intent.slice(0, 50)).trim();
    const description = (suggested.description || '').trim();
    const keywords = Array.isArray(suggested.keywords) ? suggested.keywords : [];
    const domains = Array.isArray(suggested.domains) ? suggested.domains : [];

    if (!name) {
      console.error('No group name from AI suggestion');
      return res.status(400).json({ error: 'AI could not determine a group name. Please try again with more detail.' });
    }

    // Prevent duplicate group names
    const { data: existingGroup } = await supabase
      .from('user_groups')
      .select('id, name')
      .eq('account_id', req.accountId)
      .ilike('name', name)
      .limit(1);

    if (existingGroup && existingGroup.length > 0) {
      console.log('Duplicate group name found:', name);
      return res.status(409).json({
        error: `A group named "${name}" already exists. Try a different name or edit the existing group.`,
      });
    }

    const { data: groups } = await supabase.from('user_groups').select('sort_order').eq('account_id', req.accountId);
    const maxOrder = (groups || []).reduce((m, g) => Math.max(m, g.sort_order || 0), 0);
    const groupColor = await pickGroupColor(req.accountId);

    console.log('Inserting group:', name, 'keywords:', keywords, 'domains:', domains);
    const { data: group, error } = await supabase
      .from('user_groups')
      .insert({
        account_id: req.accountId,
        name: String(name),
        description: String(description),
        color: groupColor,
        match_keywords: keywords,
        match_domains: domains,
        match_senders: [],
        sort_order: maxOrder + 1,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) {
      console.error('DB insert error:', error);
      if (error.code === '23505') {
        return res.status(409).json({ error: `A group named "${name}" already exists` });
      }
      return res.status(500).json({ error: 'Failed to create group: ' + error.message });
    }
    console.log('Group created successfully:', group.id, group.name);
    return res.json({ group, suggested: { name, description, keywords, domains } });
  } catch (e) {
    console.error('Create group error:', e);
    return res.status(500).json({ error: e?.message || 'Failed to create group' });
  }
});

aiRouter.post('/suggest-reply', async (req, res) => {
  const provider = getAiProvider();
  if (!provider) return res.status(503).json({ error: 'AI not configured (set GROQ_API_KEY or GEMINI_API_KEY)' });
  const emailId = req.body?.emailId;
  if (!emailId) return res.status(400).json({ error: 'emailId required' });
  const { data: email } = await supabase.from('emails').select('thread_id, account_id').eq('id', emailId).single();
  if (!email) return res.status(404).json({ error: 'Email not found' });
  const { data: thread } = await supabase
    .from('emails')
    .select('subject, from_address, body_plain, received_at')
    .eq('account_id', email.account_id)
    .eq('thread_id', email.thread_id)
    .order('received_at', { ascending: false })
    .limit(3);
  if (!thread?.length) return res.status(404).json({ error: 'No thread messages' });
  const suggestReply = provider === 'groq' ? suggestReplyWithGroq : suggestReplyWithGemini;
  const apiKey = provider === 'groq' ? config.groq.apiKey : config.gemini.apiKey;
  try {
    const draft = await suggestReply(apiKey, thread.reverse());
    res.json({ draft });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Suggest reply failed' });
  }
});
