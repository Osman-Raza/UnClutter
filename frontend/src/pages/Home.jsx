import { useState, useMemo, useEffect } from 'react'
import MainLayout from '../components/layout/MainLayout'
import SortControls from '../components/layout/SortControls'
import CardGrid from '../components/cards/CardGrid'
import EmailDetail from '../components/email/EmailDetail'
import EmailComposer from '../components/email/EmailComposer'
import ChatbotSidebar from '../components/layout/ChatbotSidebar'
import { getToken, setToken, clearToken } from '../utils/auth'
import { fetchMe, fetchEmails, fetchEmail, sendEmail, logout as apiLogout } from '../utils/gmailApi'
import { htmlToPlainText } from '../utils/emailBody'
import {
  categories,
  emails,
  getEmailsByCategory,
  getEmailById,
} from '../utils/dummyData'
import '../styles/home.css'

function buildForwardBody(email) {
  const body = htmlToPlainText(email.body || '')
  return [
    '---------- Forwarded message ---------',
    `From: ${email.sender || ''}`,
    `Date: ${email.date || ''}`,
    `Subject: ${email.subject || ''}`,
    'To: ',
    '',
    body,
  ].join('\n')
}

/** Get email timestamp (ms) — prefer dateTimestamp from API, else parse date string. */
function getEmailTimestamp(email) {
  if (email.dateTimestamp != null && email.dateTimestamp > 0) return email.dateTimestamp
  const dateStr = email.date
  if (!dateStr || typeof dateStr !== 'string') return null
  const d = new Date(dateStr.trim())
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

/** Cutoff timestamp for sort range (emails >= cutoff are included). */
function getSortRangeCutoff(sortRange) {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  switch (sortRange) {
    case 'Last 7 days': return now - 7 * day
    case 'Last 30 days': return now - 30 * day
    case 'Last 90 days': return now - 90 * day
    default: return 0 // All time
  }
}

/** Normalize string for alphabetical sort (strip angle brackets, lowercase). */
function sortKeySender(email) {
  const s = email.sender || ''
  return s.replace(/<[^>]*>/g, '').trim().toLowerCase()
}

/** Filter by date range then sort by user-selected field and order. */
function filterAndSort(emailList, sortRange, sortBy, sortOrder) {
  const cutoff = getSortRangeCutoff(sortRange)
  const filtered = emailList.filter((e) => {
    const ts = getEmailTimestamp(e)
    if (cutoff === 0) return true
    return ts != null && ts >= cutoff
  })
  const cmpDate = (a, b) => (getEmailTimestamp(a) || 0) - (getEmailTimestamp(b) || 0)
  const cmpSender = (a, b) => sortKeySender(a).localeCompare(sortKeySender(b))
  const cmpSubject = (a, b) => (a.subject || '').toLowerCase().localeCompare((b.subject || '').toLowerCase())
  if (sortBy === 'date') {
    return sortOrder === 'oldest'
      ? filtered.sort(cmpDate)
      : filtered.sort((a, b) => -cmpDate(a, b))
  }
  if (sortBy === 'sender') {
    return sortOrder === 'desc'
      ? filtered.sort((a, b) => -cmpSender(a, b))
      : filtered.sort(cmpSender)
  }
  if (sortBy === 'subject') {
    return sortOrder === 'desc'
      ? filtered.sort((a, b) => -cmpSubject(a, b))
      : filtered.sort(cmpSubject)
  }
  return filtered.sort((a, b) => (getEmailTimestamp(b) || 0) - (getEmailTimestamp(a) || 0))
}

function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmailId, setSelectedEmailId] = useState(null)
  const [sortRange, setSortRange] = useState('Last 7 days')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('newest')
  const [showKeywordChips, setShowKeywordChips] = useState(true)
  const [isSortingRunning, setIsSortingRunning] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const [user, setUser] = useState(null)
  const [gmailEmails, setGmailEmails] = useState([])
  const [gmailLoading, setGmailLoading] = useState(false)
  const [gmailError, setGmailError] = useState(null)
  const [selectedEmailFull, setSelectedEmailFull] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [composerState, setComposerState] = useState(null)
  const [composerSending, setComposerSending] = useState(false)
  const [composerError, setComposerError] = useState(null)

  const token = getToken()
  const [urlTokenApplied, setUrlTokenApplied] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (t) {
      setToken(t)
      setUrlTokenApplied(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    const authToken = getToken()
    if (!authToken) return
    let cancelled = false
    setGmailLoading(true)
    setGmailError(null)
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setGmailError(
          'Request timed out. Check that the backend is running (port 5001) and try Run Sort again.'
        )
        setGmailLoading(false)
      }
    }, 45000)
    Promise.all([
      fetchMe(),
      fetchEmails(50, searchQuery.trim() || undefined),
    ])
      .then(([meRes, emailsRes]) => {
        if (cancelled) return
        setUser(meRes?.email ?? null)
        setGmailEmails(emailsRes?.emails ?? [])
      })
      .catch((err) => {
        if (!cancelled) setGmailError(err.message || 'Failed to load emails')
      })
      .finally(() => {
        if (!cancelled) setGmailLoading(false)
        clearTimeout(timeoutId)
      })
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [token, urlTokenApplied, searchQuery, refreshTrigger])

  useEffect(() => {
    if (!selectedEmailId || !getToken()) {
      setSelectedEmailFull(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    fetchEmail(selectedEmailId)
      .then((data) => {
        if (!cancelled) {
          setSelectedEmailFull({
            id: data.id,
            sender: data.sender,
            subject: data.subject,
            snippet: data.snippet,
            date: data.date,
            body: data.body,
            labels: data.labelIds || [],
          })
        }
      })
      .catch(() => {
        if (!cancelled) setSelectedEmailFull(null)
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => { cancelled = true }
  }, [selectedEmailId, token])

  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return emails
    const q = searchQuery.trim().toLowerCase()
    return emails.filter(
      (e) =>
        e.sender.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        (e.snippet && e.snippet.toLowerCase().includes(q)) ||
        (e.body && e.body.toLowerCase().includes(q))
    )
  }, [searchQuery])

  const categoriesWithEmails = useMemo(() => {
    if (token && gmailEmails.length >= 0) {
      const list = gmailEmails.map((e) => ({
        id: e.id,
        sender: e.sender,
        subject: e.subject,
        snippet: e.snippet,
        date: e.date,
        dateTimestamp: e.dateTimestamp,
        categoryId: e.categoryId || 'unsorted',
        detectedKeywords: e.detectedKeywords || [],
      }))
      const byCat = {}
      categories.forEach((c) => { byCat[c.id] = [] })
      list.forEach((email) => {
        const id = email.categoryId && categories.some((c) => c.id === email.categoryId) ? email.categoryId : 'unsorted'
        byCat[id].push(email)
      })
      return categories.map((cat) => {
        const categoryEmails = byCat[cat.id] || []
        return {
          category: cat,
          emails: filterAndSort(categoryEmails, sortRange, sortBy, sortOrder),
        }
      })
    }
    if (!searchQuery.trim()) {
      const byCat = getEmailsByCategory()
      return categories.map((cat) => {
        const categoryEmails = byCat[cat.id] || []
        const filtered = filterAndSort(categoryEmails, sortRange, sortBy, sortOrder)
        return { category: cat, emails: filtered }
      })
    }
    const byCategoryId = {}
    filteredEmails.forEach((email) => {
      const cat = categories.find((c) => c.id === email.categoryId)
      if (cat) {
        if (!byCategoryId[cat.id]) byCategoryId[cat.id] = { category: cat, emails: [] }
        byCategoryId[cat.id].emails.push(email)
      }
    })
    return Object.values(byCategoryId).map(({ category, emails: catEmails }) => ({
      category,
      emails: filterAndSort(catEmails, sortRange, sortBy, sortOrder),
    }))
  }, [token, gmailEmails, searchQuery, filteredEmails, sortRange, sortBy, sortOrder])

  const selectedEmail = token
    ? selectedEmailFull
    : selectedEmailId
      ? getEmailById(selectedEmailId)
      : null

  const handleComposerSend = async (to, subject, body) => {
    setComposerError(null)
    setComposerSending(true)
    try {
      await sendEmail(to, subject, body)
      setComposerState(null)
    } catch (err) {
      setComposerError(err.message || 'Failed to send')
    } finally {
      setComposerSending(false)
    }
  }

  const handleRunSort = () => {
    setGmailError(null)
    setIsSortingRunning(true)
    if (token) setRefreshTrigger((t) => t + 1)
    setTimeout(() => setIsSortingRunning(false), 1500)
  }

  const handleLogout = async () => {
    try {
      await apiLogout()
    } catch (_) {}
    clearToken()
    setUser(null)
    setGmailEmails([])
    setSelectedEmailId(null)
    setSelectedEmailFull(null)
    window.location.href = '/login'
  }

  return (
    <MainLayout
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onRunSort={handleRunSort}
      user={user}
      onLogout={handleLogout}
    >
      {isSortingRunning && (
        <div className="sorting-banner" role="status">
          Sorting your inbox…
        </div>
      )}
      {token && gmailError && (
        <div className="sorting-banner" style={{ background: '#fce8e6', color: '#c5221f' }}>
          {gmailError}
        </div>
      )}
      {composerState && token && (
        <EmailComposer
          title={composerState.mode === 'forward' ? 'Forward' : 'Compose'}
          initialTo={composerState.mode === 'forward' ? '' : ''}
          initialSubject={
            composerState.mode === 'forward'
              ? `Fwd: ${composerState.email?.subject || ''}`
              : ''
          }
          initialBody={
            composerState.mode === 'forward' && composerState.email
              ? buildForwardBody(composerState.email)
              : ''
          }
          onSend={handleComposerSend}
          onCancel={() => { setComposerState(null); setComposerError(null) }}
          sending={composerSending}
          sendError={composerError}
        />
      )}
      <div className={`dashboard ${chatOpen ? 'dashboard--chat-open' : ''}`}>
        <div className="dashboard__left">
          {token && (
            <button
              type="button"
              className="compose-btn compose-btn--primary"
              onClick={() => setComposerState({ mode: 'compose' })}
            >
              Compose
            </button>
          )}
          <button type="button" className="compose-btn compose-btn--secondary" onClick={handleRunSort}>
            Run Sort
          </button>
          <SortControls
            sortRange={sortRange}
            onSortRangeChange={setSortRange}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            showKeywordChips={showKeywordChips}
            onShowKeywordChipsChange={setShowKeywordChips}
            onRunSort={handleRunSort}
          />
          <div className="dashboard__cards-scroll">
            {token && gmailLoading ? (
              <p className="gmail-loading">Loading inbox…</p>
            ) : (
              <CardGrid
                categoriesWithEmails={categoriesWithEmails}
                selectedEmailId={selectedEmailId}
                onSelectEmail={(email) => setSelectedEmailId(email?.id ?? null)}
                showKeywordChips={!token && showKeywordChips}
                isSearchResults={!!searchQuery.trim()}
              />
            )}
          </div>
        </div>
        <div className="dashboard__center">
          {detailLoading ? (
            <div className="email-detail-empty">
              <p>Loading…</p>
            </div>
          ) : selectedEmail ? (
            <EmailDetail
              email={selectedEmail}
              onBack={() => {
                setSelectedEmailId(null)
                setSelectedEmailFull(null)
              }}
              canReply={!!token}
              onForward={token ? (email) => setComposerState({ mode: 'forward', email }) : undefined}
            />
          ) : (
            <div className="email-detail-empty">
              <p>Select an email to view details</p>
            </div>
          )}
        </div>
        <div className={`dashboard__right ${!chatOpen ? 'is-closed' : ''}`}>
          <ChatbotSidebar onClose={() => setChatOpen(false)} />
        </div>
      </div>
      <button
        type="button"
        className={`chat-fab ${chatOpen ? 'chat-fab--active' : ''}`}
        onClick={() => setChatOpen((o) => !o)}
        aria-label={chatOpen ? 'Close chat' : 'Open chat'}
      >
        <span className="chat-fab__icon" aria-hidden="true" />
        <span className="chat-fab__label">Chat</span>
      </button>
    </MainLayout>
  )
}

export default Home
