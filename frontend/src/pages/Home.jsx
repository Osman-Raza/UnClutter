import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import MainLayout from '../components/layout/MainLayout'
import InboxSidebar from '../components/layout/InboxSidebar'
import CategoryTabs from '../components/layout/CategoryTabs'
import EmailList from '../components/layout/EmailList'
import GroupedEmailList from '../components/layout/GroupedEmailList'
import SortControls from '../components/layout/SortControls'
import EmailDetail from '../components/email/EmailDetail'
import ChatbotSidebar from '../components/layout/ChatbotSidebar'
import Toast from '../components/layout/Toast'
import GroupEditModal from '../components/layout/GroupEditModal'
import { getSessionId, setSessionId, clearSession } from '../utils/auth'
import {
  fetchMe,
  syncEmails,
  fetchEmails,
  fetchEmail,
  mapEmailFromBackend,
  categorizeEmail,
} from '../utils/gmailApi'
import { fetchGroups, updateGroup, deleteGroup } from '../utils/groupsApi'
import '../styles/home.css'

import { matchEmailToGroup } from '../utils/groupsApi'

function parseEmailDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

function getSortRangeCutoff(sortRange) {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  switch (sortRange) {
    case 'Last 7 days':
      return now - 7 * day
    case 'Last 30 days':
      return now - 30 * day
    case 'Last 90 days':
      return now - 90 * day
    default:
      return 0
  }
}

function filterAndSortByDate(emailList, sortRange) {
  const cutoff = getSortRangeCutoff(sortRange)
  const dateKey = (e) => e.received_at || e.date
  return emailList
    .filter((e) => {
      const ts = parseEmailDate(dateKey(e))
      return ts != null && (cutoff === 0 || ts >= cutoff)
    })
    .sort((a, b) => (parseEmailDate(dateKey(b)) || 0) - (parseEmailDate(dateKey(a)) || 0))
}

function formatDate(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const now = new Date()
  const diff = now - d
  if (diff < 60 * 1000) return 'Just now'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 24 * 60 * 60 * 1000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diff < 7 * 24 * 60 * 60 * 1000) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/* ── Resizable panel defaults ── */
const DEFAULT_SIDEBAR_W = 220
const DEFAULT_CHAT_W = 320
const DEFAULT_DETAIL_W = 400
const MIN_SIDEBAR_W = 180
const MAX_SIDEBAR_W = 420
const MIN_CHAT_W = 280
const MAX_CHAT_W = 600
const MIN_DETAIL_W = 280
const MAX_DETAIL_W = 600
const MIN_CENTER_W = 300

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)) }

function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmailId, setSelectedEmailId] = useState(null)
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [sortRange, setSortRange] = useState('All time')
  const [viewMode, setViewMode] = useState('tabs')
  const [activeTab, setActiveTab] = useState('__all__')
  const [syncing, setSyncing] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)

  const [user, setUser] = useState(null)
  const [emails, setEmails] = useState([])
  const [userGroups, setUserGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Toast state
  const [toasts, setToasts] = useState([])

  // Group edit modal
  const [editingGroup, setEditingGroup] = useState(null)
  const [deletingGroup, setDeletingGroup] = useState(null)

  // Resizable panels
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('uc_sidebar_w')
    return saved ? clamp(parseInt(saved, 10), MIN_SIDEBAR_W, MAX_SIDEBAR_W) : DEFAULT_SIDEBAR_W
  })
  const [chatWidth, setChatWidth] = useState(() => {
    const saved = localStorage.getItem('uc_chat_w')
    return saved ? clamp(parseInt(saved, 10), MIN_CHAT_W, MAX_CHAT_W) : DEFAULT_CHAT_W
  })
  const [detailWidth, setDetailWidth] = useState(() => {
    const saved = localStorage.getItem('uc_detail_w')
    return saved ? clamp(parseInt(saved, 10), MIN_DETAIL_W, MAX_DETAIL_W) : DEFAULT_DETAIL_W
  })
  const resizingRef = useRef(null)  // { panel: 'sidebar'|'chat'|'detail', startX, startW }

  const sessionId = getSessionId()

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }])
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // ── Resize panel drag logic ──
  const startResize = useCallback((e, panel) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = panel === 'sidebar' ? sidebarWidth : panel === 'detail' ? detailWidth : chatWidth
    resizingRef.current = { panel, startX, startW }
    document.body.classList.add('resizing-panels')

    const onMove = (ev) => {
      if (!resizingRef.current) return
      const delta = ev.clientX - resizingRef.current.startX
      const totalW = window.innerWidth

      if (resizingRef.current.panel === 'sidebar') {
        const maxSW = Math.min(MAX_SIDEBAR_W, totalW - (chatOpen ? chatWidth : 0) - MIN_CENTER_W - 10)
        const newW = clamp(resizingRef.current.startW + delta, MIN_SIDEBAR_W, maxSW)
        setSidebarWidth(newW)
      } else if (resizingRef.current.panel === 'detail') {
        // Detail: drag right makes it wider, so negate delta (handle is on the left edge of detail)
        const maxDW = Math.min(MAX_DETAIL_W, totalW - sidebarWidth - (chatOpen ? chatWidth : 0) - MIN_CENTER_W - 10)
        const newW = clamp(resizingRef.current.startW - delta, MIN_DETAIL_W, maxDW)
        setDetailWidth(newW)
      } else {
        // Chat: drag left makes it wider, so negate delta
        const maxCW = Math.min(MAX_CHAT_W, totalW - sidebarWidth - MIN_CENTER_W - 10)
        const newW = clamp(resizingRef.current.startW - delta, MIN_CHAT_W, maxCW)
        setChatWidth(newW)
      }
    }

    const onUp = () => {
      document.body.classList.remove('resizing-panels')
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      // Save to localStorage
      if (resizingRef.current?.panel === 'sidebar') {
        localStorage.setItem('uc_sidebar_w', String(sidebarWidth))
      } else if (resizingRef.current?.panel === 'detail') {
        localStorage.setItem('uc_detail_w', String(detailWidth))
      } else {
        localStorage.setItem('uc_chat_w', String(chatWidth))
      }
      resizingRef.current = null
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [sidebarWidth, chatWidth, detailWidth, chatOpen])

  // Save widths when they change (debounced by mouse-up, but also sync latest)
  useEffect(() => {
    localStorage.setItem('uc_sidebar_w', String(sidebarWidth))
  }, [sidebarWidth])
  useEffect(() => {
    localStorage.setItem('uc_chat_w', String(chatWidth))
  }, [chatWidth])
  useEffect(() => {
    localStorage.setItem('uc_detail_w', String(detailWidth))
  }, [detailWidth])

  const resetPanelWidth = useCallback((panel) => {
    if (panel === 'sidebar') setSidebarWidth(DEFAULT_SIDEBAR_W)
    else if (panel === 'detail') setDetailWidth(DEFAULT_DETAIL_W)
    else setChatWidth(DEFAULT_CHAT_W)
  }, [])

  const categorizeEmails = useCallback(async (emailList) => {
    const uncategorized = emailList.filter((e) => !e.ai_category || e.ai_category === 'Other')
    const toCategorize = uncategorized.slice(0, 5)
    if (toCategorize.length === 0) return
    for (const email of toCategorize) {
      try {
        await categorizeEmail(email.id)
        await new Promise((r) => setTimeout(r, 1500))
      } catch (err) {
        console.error('Categorize error:', err)
      }
    }
    try {
      const res = await fetchEmails()
      const list = (res?.emails ?? []).map(mapEmailFromBackend).map((e) => ({
        ...e,
        date: formatDate(e.received_at || e.date) || '',
      }))
      setEmails(list)
    } catch (err) {
      console.error('Refresh after categorize error:', err)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const auth = params.get('auth')
    const sid = params.get('session_id')
    if (auth === 'ok' && sid) {
      setSessionId(sid)
      setRefreshTrigger((t) => t + 1)
    }
  }, [])

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false

    const GROUP_PALETTE = [
      '#4285f4', '#0f9d58', '#f4b400', '#db4437', '#ab47bc',
      '#ff6d00', '#00897b', '#e8710a', '#185abc', '#c5221f',
    ]

    fetchGroups()
      .then(async (groups) => {
        if (cancelled) return
        // One-time fix: reassign colors if 3+ groups all share the same color
        const blueCount = groups.filter((g) => g.color === '#1a73e8').length
        if (blueCount >= 3) {
          let idx = 0
          for (const g of groups) {
            if (g.color === '#1a73e8') {
              const newColor = GROUP_PALETTE[idx % GROUP_PALETTE.length]
              try { await updateGroup(g.id, { color: newColor }) } catch {}
              g.color = newColor
              idx++
            }
          }
        }
        if (!cancelled) setUserGroups(groups)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [sessionId, refreshTrigger])

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setError('Request timed out. Is the backend running on port 3001?')
        setLoading(false)
      }
    }, 30000)
    Promise.all([fetchMe(), fetchEmails()])
      .then(([meRes, emailsRes]) => {
        if (cancelled) return
        clearTimeout(timeoutId)
        setUser(meRes?.user?.email ?? meRes?.user?.full_name ?? null)
        const list = (emailsRes?.emails ?? []).map(mapEmailFromBackend).map((e) => ({
          ...e,
          date: formatDate(e.received_at || e.date) || '',
        }))
        setEmails(list)
        setLoading(false)
        setLastSynced(new Date())
        syncEmails().then(() => fetchEmails()).then((res) => {
          if (cancelled) return
          const updated = (res?.emails ?? []).map(mapEmailFromBackend).map((e) => ({
            ...e,
            date: formatDate(e.received_at || e.date) || '',
          }))
          setEmails(updated)
          setLastSynced(new Date())
          categorizeEmails(updated)
        }).catch(() => {})
      })
      .catch((err) => {
        if (!cancelled) {
          clearTimeout(timeoutId)
          setError(err.message || 'Failed to load emails')
          setLoading(false)
        }
      })
    return () => { cancelled = true; clearTimeout(timeoutId) }
  }, [sessionId, refreshTrigger])

  const handleEmailClick = useCallback(async (emailOrId) => {
    const emailId = typeof emailOrId === 'object' ? emailOrId?.id : emailOrId
    if (!emailId) return
    setSelectedEmailId(emailId)
    setDetailLoading(true)
    setSelectedEmail(null)
    try {
      const data = await fetchEmail(emailId)
      const mapped = mapEmailFromBackend(data)
      const displayEmail = {
        ...mapped,
        sender: mapped.from_address || mapped.sender,
        date: formatDate(mapped.received_at) || mapped.date,
        body: mapped.body_plain || mapped.snippet,
        labels: mapped.label_ids || [],
      }
      setSelectedEmail(displayEmail)
    } catch (err) {
      console.error('Error fetching email:', err)
      setSelectedEmail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setError(null)
    try {
      await syncEmails()
      const emailsRes = await fetchEmails()
      const list = (emailsRes?.emails ?? []).map(mapEmailFromBackend).map((e) => ({
        ...e,
        date: formatDate(e.received_at || e.date) || '',
      }))
      setEmails(list)
      setLastSynced(new Date())
      const newCount = list.length - emails.length
      addToast({
        type: 'success',
        message: newCount > 0 ? `Synced ${newCount} new email${newCount !== 1 ? 's' : ''}` : 'Inbox is up to date',
      })
      await categorizeEmails(list)
    } catch (err) {
      setError(err.message || 'Sync failed')
      addToast({ type: 'error', message: 'Sync failed' })
    } finally {
      setSyncing(false)
    }
  }, [categorizeEmails, emails.length, addToast])

  const handleEditGroup = useCallback((group) => {
    setEditingGroup(group)
  }, [])

  const handleSaveGroup = useCallback(async (updates) => {
    if (!editingGroup) return
    try {
      await updateGroup(editingGroup.id, updates)
      const groups = await fetchGroups()
      setUserGroups(groups)
      setEditingGroup(null)
      addToast({ type: 'success', message: `Group "${updates.name}" updated` })
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to update group' })
    }
  }, [editingGroup, addToast])

  const handleDeleteGroup = useCallback((group) => {
    setDeletingGroup(group)
  }, [])

  const confirmDeleteGroup = useCallback(async () => {
    if (!deletingGroup) return
    try {
      await deleteGroup(deletingGroup.id)
      const groups = await fetchGroups()
      setUserGroups(groups)
      setDeletingGroup(null)
      addToast({ type: 'success', message: `Group "${deletingGroup.name}" deleted` })
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to delete group' })
    }
  }, [deletingGroup, addToast])

  // ---------- Filtered / sorted emails ----------

  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return emails
    const q = searchQuery.trim().toLowerCase()
    return emails.filter(
      (e) =>
        (e.sender || '').toLowerCase().includes(q) ||
        (e.from_address || '').toLowerCase().includes(q) ||
        (e.subject || '').toLowerCase().includes(q) ||
        (e.snippet || '').toLowerCase().includes(q)
    )
  }, [emails, searchQuery])

  const sortedEmails = useMemo(
    () => filterAndSortByDate(filteredEmails, sortRange),
    [filteredEmails, sortRange]
  )

  // Build dynamic tabs from user groups: "All" + each user group + "Unsorted"
  const groupTabs = useMemo(() => {
    const tabs = [{ id: '__all__', label: 'All Mail', color: '#1a73e8' }]
    for (const g of userGroups) {
      tabs.push({ id: g.id, label: g.name, color: g.color || '#5f6368' })
    }
    if (userGroups.length > 0) {
      tabs.push({ id: '__unsorted__', label: 'Unsorted', color: '#9aa0a6' })
    }
    return tabs
  }, [userGroups])

  const groupTabCounts = useMemo(() => {
    const counts = { __all__: sortedEmails.length }
    let matchedCount = 0
    for (const g of userGroups) {
      const c = sortedEmails.filter((e) => matchEmailToGroup(e, g)).length
      counts[g.id] = c
      matchedCount += c
    }
    counts.__unsorted__ = sortedEmails.length - matchedCount
    return counts
  }, [sortedEmails, userGroups])

  const displayedEmails = useMemo(() => {
    if (viewMode === 'grouped') return sortedEmails
    // Tab view: filter by selected group tab
    if (activeTab === '__all__') return sortedEmails
    if (activeTab === '__unsorted__') {
      return sortedEmails.filter((e) => !userGroups.some((g) => matchEmailToGroup(e, g)))
    }
    const group = userGroups.find((g) => g.id === activeTab)
    if (group) return sortedEmails.filter((e) => matchEmailToGroup(e, group))
    return sortedEmails
  }, [sortedEmails, viewMode, activeTab, userGroups])

  const categoryTabsWithCounts = useMemo(
    () =>
      groupTabs.map((t) => ({
        ...t,
        count: groupTabCounts[t.id] || 0,
      })),
    [groupTabs, groupTabCounts]
  )

  // ---------- Keyboard shortcuts ----------

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key) {
        case 'j': { // Next email
          const idx = sortedEmails.findIndex((em) => em.id === selectedEmailId)
          if (idx < sortedEmails.length - 1) {
            handleEmailClick(sortedEmails[idx + 1])
          } else if (idx === -1 && sortedEmails.length) {
            handleEmailClick(sortedEmails[0])
          }
          break
        }
        case 'k': { // Previous email
          const idx = sortedEmails.findIndex((em) => em.id === selectedEmailId)
          if (idx > 0) {
            handleEmailClick(sortedEmails[idx - 1])
          }
          break
        }
        case 'Escape':
          if (selectedEmail) {
            setSelectedEmailId(null)
            setSelectedEmail(null)
          } else if (chatOpen) {
            setChatOpen(false)
          }
          break
        case 'c':
          setChatOpen((o) => !o)
          break
        case '/':
          e.preventDefault()
          document.querySelector('.top-bar__search')?.focus()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedEmailId, selectedEmail, chatOpen, sortedEmails, handleEmailClick])

  const handleLogout = () => {
    clearSession()
    setUser(null)
    setEmails([])
    setSelectedEmailId(null)
    setSelectedEmail(null)
    window.location.href = '/login'
  }

  const displayEmail = selectedEmail
    ? {
        ...selectedEmail,
        sender: selectedEmail.sender || selectedEmail.from_address,
        date: selectedEmail.date || formatDate(selectedEmail.received_at),
        body: selectedEmail.body || selectedEmail.body_plain || selectedEmail.snippet,
        labels: selectedEmail.labels || selectedEmail.label_ids || [],
      }
    : null

  const lastSyncedText = lastSynced
    ? `Last synced ${formatDate(lastSynced.toISOString())}`
    : null

  // Build CSS class for dashboard
  const isGroupedView = viewMode === 'grouped'
  const dashClasses = [
    'dashboard dashboard--gmail',
    chatOpen ? 'dashboard--chat-open' : '',
    sidebarCollapsed ? 'dashboard--sidebar-collapsed' : '',
    isGroupedView ? 'dashboard--grouped' : '',
  ].filter(Boolean).join(' ')

  // CSS custom properties for resizable panels
  const dashStyle = {
    '--sidebar-w': sidebarCollapsed ? '0px' : `${sidebarWidth}px`,
    '--chat-w': `${chatWidth}px`,
    '--detail-w': `${detailWidth}px`,
  }

  return (
    <MainLayout
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onRunSort={handleSync}
      user={user}
      onLogout={handleLogout}
      syncing={syncing}
      lastSynced={lastSyncedText}
      chatOpen={chatOpen}
      onToggleChat={() => setChatOpen((o) => !o)}
      onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
      sidebarCollapsed={sidebarCollapsed}
    >
      {syncing && (
        <div className="sorting-banner" role="status">
          <span className="loading-spinner" aria-hidden="true" />
          Syncing inbox...
        </div>
      )}
      {sessionId && error && (
        <div className="error-banner" role="alert">
          {error}
          <button
            type="button"
            className="error-banner__dismiss"
            onClick={() => setError(null)}
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      )}
      <div className={dashClasses} style={dashStyle}>
        <div className="dashboard__sidebar">
          <InboxSidebar
            emailCount={sortedEmails.length}
            totalCount={emails.length}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            userGroups={userGroups}
            onDeleteGroup={handleDeleteGroup}
            onEditGroup={handleEditGroup}
          />
        </div>
        <div className="dashboard__list-area">
          <SortControls
            sortRange={sortRange}
            onSortRangeChange={setSortRange}
            emailCount={sortedEmails.length}
            totalCount={emails.length}
          />
          {viewMode === 'tabs' && (
            <CategoryTabs
              tabs={categoryTabsWithCounts}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          )}
          <div className="dashboard__list-scroll">
            {loading ? (
              <div className="loading-state">
                <div className="skeleton-card" />
                <div className="skeleton-card" />
                <div className="skeleton-card" />
                <div className="skeleton-card" />
                <div className="skeleton-card" />
              </div>
            ) : displayedEmails.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">&#128233;</div>
                <p className="empty-state__title">
                  {searchQuery ? 'No emails match your search' : 'No emails found'}
                </p>
                <p className="empty-state__hint">
                  {searchQuery
                    ? 'Try different keywords or clear your search'
                    : 'Sync your inbox to get started'}
                </p>
                {!searchQuery && (
                  <button type="button" className="empty-state__btn" onClick={handleSync} disabled={syncing}>
                    Sync Emails
                  </button>
                )}
              </div>
            ) : viewMode === 'grouped' ? (
              <GroupedEmailList
                emails={sortedEmails}
                userGroups={userGroups}
                selectedEmailId={selectedEmailId}
                onSelectEmail={handleEmailClick}
                onEditGroup={handleEditGroup}
                onDeleteGroup={handleDeleteGroup}
              />
            ) : (
              <EmailList
                emails={displayedEmails}
                selectedEmailId={selectedEmailId}
                onSelectEmail={handleEmailClick}
                showKeywordChips={false}
              />
            )}
          </div>
        </div>
        {/* Backdrop for grouped-view detail overlay */}
        {isGroupedView && (
          <div
            className={`dashboard__detail-backdrop ${displayEmail ? 'detail--open' : ''}`}
            onClick={() => { setSelectedEmailId(null); setSelectedEmail(null) }}
          />
        )}
        <div className={`dashboard__detail ${isGroupedView && displayEmail ? 'detail--open' : ''}`}>
          {detailLoading ? (
            <div className="email-detail-empty">
              <span className="loading-spinner" aria-hidden="true" />
              <p>Loading...</p>
            </div>
          ) : displayEmail ? (
            <EmailDetail
              email={displayEmail}
              onBack={() => {
                setSelectedEmailId(null)
                setSelectedEmail(null)
              }}
            />
          ) : !isGroupedView ? (
            <div className="email-detail-empty">
              <div className="empty-state__icon" aria-hidden="true">&#128232;</div>
              <p className="email-detail-empty__title">Select an email to read</p>
              <p className="empty-state__hint">Click an email from the list or press J/K to navigate</p>
            </div>
          ) : null}
        </div>
        <div className={`dashboard__chat ${!chatOpen ? 'is-closed' : ''}`}>
          <ChatbotSidebar
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
            selectedEmail={selectedEmail}
            emails={emails}
            onGroupsChange={() => fetchGroups().then(setUserGroups)}
            onToast={addToast}
            onSelectEmail={handleEmailClick}
          />
        </div>

        {/* Resize handles (absolutely positioned over panel borders) */}
        {!sidebarCollapsed && (
          <div
            className="resize-handle resize-handle--sidebar"
            style={{ left: `${sidebarWidth - 2}px` }}
            onMouseDown={(e) => startResize(e, 'sidebar')}
            onDoubleClick={() => resetPanelWidth('sidebar')}
            title="Drag to resize sidebar (double-click to reset)"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
          />
        )}
        {/* Resize handle between email list and detail panel (non-grouped view only) */}
        {!isGroupedView && (
          <div
            className="resize-handle resize-handle--detail"
            style={{ right: `${(chatOpen ? chatWidth : 0) + detailWidth - 2}px` }}
            onMouseDown={(e) => startResize(e, 'detail')}
            onDoubleClick={() => resetPanelWidth('detail')}
            title="Drag to resize detail panel (double-click to reset)"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize detail panel"
          />
        )}
        {chatOpen && (
          <div
            className="resize-handle resize-handle--chat"
            style={{ right: `${chatWidth - 2}px` }}
            onMouseDown={(e) => startResize(e, 'chat')}
            onDoubleClick={() => resetPanelWidth('chat')}
            title="Drag to resize chat (double-click to reset)"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat panel"
          />
        )}
      </div>

      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Group edit modal */}
      {editingGroup && (
        <GroupEditModal
          group={editingGroup}
          onSave={handleSaveGroup}
          onCancel={() => setEditingGroup(null)}
        />
      )}

      {/* Delete confirmation */}
      {deletingGroup && (
        <div className="modal-overlay" onClick={() => setDeletingGroup(null)}>
          <div className="modal modal--small" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Confirm delete">
            <div className="modal__header">
              <h3 className="modal__title">Delete Group</h3>
            </div>
            <div className="modal__body">
              <p>Delete group &ldquo;{deletingGroup.name}&rdquo;? Emails won&rsquo;t be deleted, only the grouping.</p>
            </div>
            <div className="modal__footer">
              <button type="button" className="modal__btn modal__btn--secondary" onClick={() => setDeletingGroup(null)}>Cancel</button>
              <button type="button" className="modal__btn modal__btn--danger" onClick={confirmDeleteGroup}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}

export default Home
