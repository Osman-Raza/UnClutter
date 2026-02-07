/**
 * Send a message to Gemini and get a reply. Uses conversation history for context.
 * Requires VITE_GEMINI_API_KEY in .env
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

const MODEL = 'gemini-2.0-flash'

/**
 * Convert our messages [{ role: 'user'|'assistant', text }] to Gemini history format.
 * Gemini uses 'model' for the assistant role and requires the first message to be 'user'.
 */
function toGeminiHistory(messages) {
  if (!messages?.length) return []
  const converted = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }))
  // Gemini requires history to start with 'user', not 'model' - drop any leading model messages
  let start = 0
  while (start < converted.length && converted[start].role === 'model') {
    start += 1
  }
  return converted.slice(start)
}

/**
 * Send a new user message and get the assistant reply.
 * @param {string} apiKey - Gemini API key (e.g. from import.meta.env.VITE_GEMINI_API_KEY)
 * @param {Array<{ role: 'user'|'assistant', text: string }>} previousMessages - Chat history
 * @param {string} userMessage - New user message
 * @returns {Promise<{ text: string }>} - Assistant reply text
 */
export async function sendToGemini(apiKey, previousMessages, userMessage) {
  if (!apiKey?.trim()) {
    throw new Error('Missing Gemini API key. Add VITE_GEMINI_API_KEY to your .env file.')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: MODEL })

  const history = toGeminiHistory(previousMessages)
  const chat = model.startChat({ history })

  const result = await chat.sendMessage(userMessage)
  const response = result.response
  const text = response?.text?.() ?? ''

  if (!text) {
    throw new Error('No reply from Gemini. The response may have been blocked.')
  }

  return { text }
}

/**
 * Summarize an email with Gemini (one-shot, no chat history).
 * @param {string} apiKey - Gemini API key
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @returns {Promise<{ text: string }>} - Summary text (e.g. bullet points)
 */
export async function summarizeEmail(apiKey, subject, body) {
  if (!apiKey?.trim()) {
    throw new Error('Missing Gemini API key. Add VITE_GEMINI_API_KEY to your .env file.')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: MODEL })

  const prompt = `Summarize this email in 3–5 short bullet points. Be concise.

Subject: ${subject}

Body:
${body || '(No body)'}`

  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response?.text?.() ?? ''

  if (!text) {
    throw new Error('No summary from Gemini. The response may have been blocked.')
  }

  return { text }
}
