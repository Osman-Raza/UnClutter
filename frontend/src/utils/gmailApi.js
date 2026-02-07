/**
 * Gmail API calls via our backend (requires auth token).
 */
import { API_BASE, getAuthHeaders } from './auth'

export async function fetchMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, { headers: getAuthHeaders() })
  if (!res.ok) return null
  return res.json()
}

async function readError(res) {
  const text = await res.text()
  try {
    const data = JSON.parse(text)
    return data.error || res.statusText
  } catch (_) {
    return res.statusText
  }
}

export async function fetchEmails(maxResults = 50, q = '') {
  const params = new URLSearchParams({ maxResults: String(maxResults) })
  if (q) params.set('q', q)
  const res = await fetch(`${API_BASE}/api/emails?${params}`, { headers: getAuthHeaders() })
  if (!res.ok) {
    const msg = await readError(res)
    throw new Error(msg || 'Failed to fetch emails')
  }
  return res.json()
}

export async function fetchEmail(id) {
  const res = await fetch(`${API_BASE}/api/emails/${id}`, { headers: getAuthHeaders() })
  if (!res.ok) {
    const msg = await readError(res)
    throw new Error(msg || 'Failed to fetch email')
  }
  return res.json()
}

export async function sendReply(messageId, body) {
  const res = await fetch(`${API_BASE}/api/emails/${messageId}/reply`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to send reply')
  }
  return res.json()
}

export async function sendEmail(to, subject, body) {
  const res = await fetch(`${API_BASE}/api/emails/send`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, subject, body }),
  })
  if (!res.ok) {
    const text = await res.text()
    let data = {}
    try {
      data = JSON.parse(text)
    } catch (_) {}
    throw new Error(data.error || res.statusText || 'Failed to send email')
  }
  return res.json()
}

export async function logout() {
  await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', headers: getAuthHeaders() })
}
