/**
 * Gmail API calls via UnClutter backend (session-based auth).
 * Uses relative /api when VITE_API_URL is unset so Vite proxy hits backend on port 3001.
 */
import { API_BASE, getAuthHeaders } from './auth'

const DEFAULT_TIMEOUT_MS = 15000

async function fetchWithAuth(endpoint, options = {}) {
  const url = `${API_BASE || ''}/api${endpoint}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? DEFAULT_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `Request failed: ${res.status}`)
    }
    return res.json()
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Is the backend running on port 3001?')
    }
    if (err.message && !err.message.startsWith('Request failed') && !err.message.startsWith('Request timed out')) {
      if (err.message.includes('fetch') || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        throw new Error('Cannot connect to backend. Is the server running on port 3001?')
      }
    }
    throw err
  }
}

export async function fetchMe() {
  const data = await fetchWithAuth('/auth/me')
  return data
}

export async function syncEmails() {
  return fetchWithAuth('/gmail/sync', { method: 'POST' })
}

export async function fetchEmails() {
  const data = await fetchWithAuth('/gmail/list')
  return data
}

export async function fetchEmail(id) {
  return fetchWithAuth(`/gmail/email/${id}`)
}

export async function categorizeEmail(emailId) {
  return fetchWithAuth('/ai/categorize', {
    method: 'POST',
    body: JSON.stringify({ emailId }),
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Map backend email shape to frontend shape. Handles both list and detail responses. */
export function mapEmailFromBackend(email) {
  if (!email) return null
  return {
    id: email.id,
    gmail_id: email.gmail_id,
    thread_id: email.thread_id,
    subject: email.subject || '(No Subject)',
    snippet: email.snippet || '',
    body_plain: email.body_plain,
    body_html: email.body_html,
    sender: email.from_address || 'Unknown',
    from_address: email.from_address || 'Unknown',
    to_addresses: email.to_addresses || [],
    cc_addresses: email.cc_addresses || [],
    date: email.received_at,
    received_at: email.received_at,
    is_read: email.is_read,
    is_starred: email.is_starred,
    ai_category: email.ai_category,
    ai_summary: email.ai_summary,
    label_ids: email.label_ids || [],
  }
}
