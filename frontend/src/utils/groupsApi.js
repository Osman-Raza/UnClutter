import { API_BASE, getAuthHeaders } from './auth'

export async function fetchGroups() {
  const res = await fetch(`${API_BASE}/api/groups`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('Failed to fetch groups')
  const data = await res.json()
  return data.groups || []
}

export async function createGroup(group) {
  const res = await fetch(`${API_BASE}/api/groups`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(group),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create group')
  }
  return res.json()
}

export async function createGroupFromIntent(intent) {
  const res = await fetch(`${API_BASE}/api/ai/create-group`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ intent }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create group')
  }
  return res.json()
}

export async function updateGroup(id, updates) {
  const res = await fetch(`${API_BASE}/api/groups/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update group')
  }
  return res.json()
}

export async function deleteGroup(id) {
  const res = await fetch(`${API_BASE}/api/groups/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete group')
  }
  return res.json()
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Match email against a group's rules using word-boundary matching.
 *
 * Matching strategy to avoid false positives:
 * - Keywords are checked against subject + snippet + sender only (NOT full body,
 *   because long email bodies cause tons of false positives with common words).
 * - Domains match against the sender's email domain.
 * - Senders match against the full from address.
 * - All keyword matches use word boundaries to prevent partial-word hits.
 */
export function matchEmailToGroup(email, group) {
  // Use subject + snippet + from for keyword matching (NOT body_plain — too noisy)
  const searchText = [
    email.subject,
    email.snippet,
  ].filter(Boolean).join(' ').toLowerCase()

  const from = (email.from_address || email.sender || '').toLowerCase()
  const domain = from.includes('@') ? from.split('@').pop().replace(/>$/, '') : ''

  // 1. Check domains FIRST (most reliable signal)
  for (const d of group.match_domains || []) {
    if (!d) continue
    const domainLower = String(d).toLowerCase().trim()
    if (!domainLower) continue
    if (domain === domainLower || domain.endsWith('.' + domainLower)) return true
  }

  // 2. Check senders
  for (const s of group.match_senders || []) {
    if (!s) continue
    if (from.includes(String(s).toLowerCase())) return true
  }

  // 3. Check keywords with strict word boundary matching
  for (const kw of group.match_keywords || []) {
    if (!kw) continue
    const kwLower = String(kw).toLowerCase().trim()
    if (!kwLower || kwLower.length < 2) continue // Skip single-char keywords

    try {
      const regex = new RegExp(`\\b${escapeRegex(kwLower)}\\b`, 'i')
      if (regex.test(searchText) || regex.test(from)) return true
    } catch {
      if (searchText.includes(kwLower)) return true
    }
  }

  return false
}
