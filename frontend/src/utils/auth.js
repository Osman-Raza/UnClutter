/**
 * Session-based auth: X-Session-Id header for backend API.
 * Session ID stored in localStorage.
 */
const SESSION_KEY = 'unclutter_session_id'

export const API_BASE = import.meta.env.VITE_API_URL ?? ''

export function getSessionId() {
  return localStorage.getItem(SESSION_KEY)
}

export function setSessionId(sessionId) {
  if (sessionId) {
    localStorage.setItem(SESSION_KEY, sessionId)
  } else {
    localStorage.removeItem(SESSION_KEY)
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function getAuthHeaders() {
  const sessionId = getSessionId()
  const headers = { 'Content-Type': 'application/json' }
  if (sessionId) headers['X-Session-Id'] = sessionId
  return headers
}

/** Legacy aliases for compatibility */
export const getToken = getSessionId
export const setToken = setSessionId
export const clearToken = clearSession
