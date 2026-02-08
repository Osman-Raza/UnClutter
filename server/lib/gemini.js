import { GoogleGenerativeAI } from '@google/generative-ai';

const CHAT_MODEL = 'gemini-2.5-flash';
const DEFAULT_MODEL = 'gemini-2.5-flash';

const CATEGORY_PROMPT = `You are a triage assistant. Given an email, assign exactly one category: "School", "Finance", "Work", "Personal", or "Other".
Rules: If the email mentions "macID" assign "School". If it mentions "order" or "coupons" or payment/billing assign "Finance". Otherwise choose the best fit.
Reply with only the single category word, nothing else.`;

const SUMMARY_PROMPT = `Summarize this email thread in exactly 3 bullet points. Be concise. Output only the 3 bullets, one per line.`;

const REPLY_PROMPT = `You are helping the user reply to an email thread. Given the last few messages in the thread, write a short, professional reply that continues the conversation. Output only the reply body, no subject or metadata.`;

const EMAIL_SUMMARY_PROMPT = `Summarize this email in 3–5 short bullet points. Be concise. Output only the bullets, one per line.`;

export async function summarizeEmailWithGemini(apiKey, subject, body) {
  const gen = new GoogleGenerativeAI(apiKey);
  const model = gen.getGenerativeModel({ model: DEFAULT_MODEL });
  const text = `Subject: ${subject}\n\nBody:\n${body || '(No body)'}`;
  const result = await model.generateContent([EMAIL_SUMMARY_PROMPT, text]);
  return (result.response.text() || '').trim();
}

const FALLBACK_MODEL = 'gemini-2.0-flash';

const INBOX_CONTEXT_SYSTEM = `You are the UnClutter assistant. You have FULL ACCESS to the user's email inbox. Use the email data provided to answer questions. Extract deadlines, action items, and commitments from the emails. Give specific answers based on the content. Never say you don't have access to their emails.`;

function buildEmailContextBlock(context) {
  if (!context) return '';
  const { selectedEmail, emailsPreview } = context;
  const parts = [];
  if (Array.isArray(emailsPreview) && emailsPreview.length > 0) {
    const blocks = emailsPreview.slice(0, 20).map((e, i) => {
      const from = e.from_address || e.sender;
      const subject = e.subject || '(No Subject)';
      const date = e.received_at ? new Date(e.received_at).toLocaleString() : e.date || '';
      const snippet = (e.body_plain || e.snippet || e.body || '').slice(0, 300);
      return `[Email ${i + 1}] From: ${from}\nSubject: ${subject}\nDate: ${date}\nContent: ${snippet}`;
    });
    parts.push('--- USER\'S EMAILS ---\n' + blocks.join('\n\n') + '\n--- END EMAILS ---');
  }
  if (selectedEmail && typeof selectedEmail === 'object') {
    const from = selectedEmail.from_address || selectedEmail.sender;
    const body = (selectedEmail.body_plain || selectedEmail.body || selectedEmail.snippet || '').slice(0, 2000);
    parts.push('--- CURRENTLY SELECTED EMAIL (focus on this) ---\nFrom: ' + from + '\nSubject: ' + (selectedEmail.subject || '') + '\nDate: ' + (selectedEmail.received_at ? new Date(selectedEmail.received_at).toLocaleString() : selectedEmail.date || '') + '\nBody: ' + body + '\n--- END ---');
  }
  if (parts.length === 0) return '';
  return parts.join('\n\n');
}

export async function chatWithGemini(apiKey, messages, userMessage, context) {
  const gen = new GoogleGenerativeAI(apiKey);
  let model = gen.getGenerativeModel({ model: CHAT_MODEL });
  const contextBlock = buildEmailContextBlock(context);
  const effectiveMessage = contextBlock
    ? `${INBOX_CONTEXT_SYSTEM}\n\n${contextBlock}\n\nUser question: ${userMessage}`
    : userMessage;
  try {
    const history = (messages || []).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }],
    })).filter((h, i) => !(h.role === 'model' && i === 0));
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(effectiveMessage);
    return (result.response.text() || '').trim();
  } catch (err) {
    if (CHAT_MODEL !== FALLBACK_MODEL && (err?.message?.includes('404') || err?.message?.includes('not found') || err?.message?.includes('Invalid'))) {
      model = gen.getGenerativeModel({ model: FALLBACK_MODEL });
      const history = (messages || []).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }],
      })).filter((h, i) => !(h.role === 'model' && i === 0));
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(effectiveMessage);
      return (result.response.text() || '').trim();
    }
    throw err;
  }
}

export async function categorizeWithGemini(apiKey, email) {
  const gen = new GoogleGenerativeAI(apiKey);
  const model = gen.getGenerativeModel({ model: DEFAULT_MODEL });
  const text = `Subject: ${email.subject}\nSnippet: ${email.snippet}\nBody (excerpt): ${email.body}`;
  const result = await model.generateContent([CATEGORY_PROMPT, text]);
  const raw = (result.response.text() || '').trim();
  const category = ['School', 'Finance', 'Work', 'Personal', 'Other'].find(
    (c) => raw.toLowerCase().includes(c.toLowerCase())
  );
  return category || 'Other';
}

export async function summarizeWithGemini(apiKey, thread) {
  const gen = new GoogleGenerativeAI(apiKey);
  const model = gen.getGenerativeModel({ model: DEFAULT_MODEL });
  const block = thread
    .map(
      (e, i) =>
        `[${i + 1}] From: ${e.from_address} | ${e.received_at}\nSubject: ${e.subject}\n${(e.body_plain || e.snippet || '').slice(0, 1500)}`
    )
    .join('\n\n');
  const result = await model.generateContent([SUMMARY_PROMPT, block]);
  return (result.response.text() || '').trim();
}

const CREATE_GROUP_PROMPT = `You help users create email groups. Given a user's intent and sample emails, output a JSON object with: name (short group name), description (one sentence), keywords (array of strings to match in subject/body - lowercase, no duplicates), domains (array of domain strings like "mcmaster.ca" for @mcmaster.ca emails).
Output ONLY valid JSON, no other text. Example: {"name":"University","description":"McMaster-related emails","keywords":["mcmaster","university","professor","assignment"],"domains":["mcmaster.ca"]}`;

export async function suggestGroupFromIntent(apiKey, userIntent, sampleEmails) {
  const gen = new GoogleGenerativeAI(apiKey);
  const model = gen.getGenerativeModel({ model: DEFAULT_MODEL });
  const samples = (sampleEmails || [])
    .slice(0, 15)
    .map((e) => `From: ${e.from_address || ''} | Subject: ${e.subject || ''} | Snippet: ${(e.snippet || '').slice(0, 100)}`)
    .join('\n');
  const text = `${CREATE_GROUP_PROMPT}\n\nUser intent: "${userIntent}"\n\nSample emails:\n${samples || '(none)'}\n\nOutput JSON:`;
  const result = await model.generateContent([text]);
  const raw = (result.response.text() || '').trim().replace(/```json?\s*/g, '').replace(/```\s*/g, '');
  try {
    return JSON.parse(raw);
  } catch {
    return { name: userIntent.slice(0, 30), description: '', keywords: [], domains: [] };
  }
}

export async function suggestReplyWithGemini(apiKey, thread) {
  const gen = new GoogleGenerativeAI(apiKey);
  const model = gen.getGenerativeModel({ model: DEFAULT_MODEL });
  const block = thread
    .map(
      (e, i) =>
        `From: ${e.from_address}\nSubject: ${e.subject}\n\n${(e.body_plain || '').slice(0, 2000)}`
    )
    .join('\n\n---\n\n');
  const result = await model.generateContent([REPLY_PROMPT, block]);
  return (result.response.text() || '').trim();
}
