import { useState, useMemo, useCallback, memo } from 'react'
import { matchEmailToGroup } from '../../utils/groupsApi'

const GROUP_COLORS = [
  { border: '#4285f4', badge: '#e8f0fe', badgeText: '#1967d2' },
  { border: '#0f9d58', badge: '#e6f4ea', badgeText: '#137333' },
  { border: '#f4b400', badge: '#fef7e0', badgeText: '#b06000' },
  { border: '#db4437', badge: '#fce8e6', badgeText: '#c5221f' },
  { border: '#ab47bc', badge: '#f3e8fd', badgeText: '#8e24aa' },
  { border: '#ff6d00', badge: '#fff3e0', badgeText: '#e65100' },
  { border: '#00897b', badge: '#e0f2f1', badgeText: '#00695c' },
  { border: '#9e9e9e', badge: '#f1f3f4', badgeText: '#5f6368' },
]

function getColorScheme(index) {
  return GROUP_COLORS[index % GROUP_COLORS.length]
}

const COLLAPSED_EMAIL_COUNT = 3

function getSenderName(from) {
  if (!from) return 'Unknown'
  const m = from.match(/^"?(.+?)"?\s*<.+>$/)
  if (m) return m[1].replace(/"/g, '').trim()
  const parts = from.split('@')
  return parts[0].replace(/[<>"]/g, '').trim()
}

function formatCompactDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  const now = new Date()
  const diff = now - d
  if (diff < 24 * 60 * 60 * 1000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diff < 7 * 24 * 60 * 60 * 1000) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function sortEmailsPinnedFirst(emails) {
  return [...emails].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    if (a.is_pinned && b.is_pinned) return new Date(b.pinned_at || 0) - new Date(a.pinned_at || 0)
    return (new Date(b.received_at || 0) - new Date(a.received_at || 0))
  })
}

const CompactEmail = memo(function CompactEmail({ email, isSelected, onClick, onPinEmail }) {
  const isUnread = email.is_read === false
  const isStarred = email.is_starred
  const isPinned = email.is_pinned
  const sender = getSenderName(email.from_address || email.sender)
  const date = email.date || formatCompactDate(email.received_at)

  return (
    <div
      className={`gc-email ${isSelected ? 'gc-email--selected' : ''} ${isUnread ? 'gc-email--unread' : ''} ${isPinned ? 'gc-email--pinned' : ''}`}
      onClick={(e) => { e.stopPropagation(); onClick?.(email) }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(email)}
    >
      <button
        type="button"
        className={`gc-email__pin ${isPinned ? 'gc-email__pin--active' : ''}`}
        onClick={(e) => { e.stopPropagation(); onPinEmail?.(email) }}
        title={isPinned ? 'Unpin' : 'Pin'}
        aria-label={isPinned ? 'Unpin' : 'Pin'}
      >
        &#128204;
      </button>
      {isStarred && <span className="gc-email__star" aria-label="Starred">&#9733;</span>}
      <div className="gc-email__content">
        <div className="gc-email__top">
          <span className="gc-email__sender">{sender}</span>
          <span className="gc-email__date">{date}</span>
        </div>
        <div className="gc-email__subject">{email.subject || '(No subject)'}</div>
        <div className="gc-email__snippet">{email.snippet}</div>
      </div>
    </div>
  )
})

function buildGroups(emails, userGroups) {
  if (!userGroups || userGroups.length === 0) {
    return [{ id: '__all__', name: 'All Mail', description: '', color: '#5f6368', emails, match_keywords: [], match_domains: [] }]
  }
  const byGroup = {}
  for (const g of userGroups) {
    byGroup[g.id] = { ...g, emails: [] }
  }
  byGroup.__unsorted__ = { id: '__unsorted__', name: 'Unsorted', description: 'Not yet categorized', color: '#9e9e9e', emails: [], match_keywords: [] }

  for (const e of emails) {
    let matched = false
    for (const g of userGroups) {
      if (matchEmailToGroup(e, g)) {
        byGroup[g.id].emails.push(e)
        matched = true
        break
      }
    }
    if (!matched) byGroup.__unsorted__.emails.push(e)
  }

  const list = [...userGroups.map((g) => byGroup[g.id]), byGroup.__unsorted__]
  list.sort((a, b) => {
    if (a.id === '__unsorted__') return 1
    if (b.id === '__unsorted__') return -1
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    if (a.is_pinned && b.is_pinned) return new Date(b.pinned_at || 0) - new Date(a.pinned_at || 0)
    return 0
  })
  list.forEach((g) => { g.emails = sortEmailsPinnedFirst(g.emails) })
  return list
}

const GroupCard = memo(function GroupCard({
  group,
  colorScheme,
  isUserGroup,
  selectedEmailId,
  onSelectEmail,
  onPinEmail,
  onEditGroup,
  onDeleteGroup,
  onPinGroup,
}) {
  const [expanded, setExpanded] = useState(false)
  const emailCount = group.emails.length
  const unreadCount = group.emails.filter((e) => !e.is_read).length
  const keywords = group.match_keywords || []
  const description = group.description || (keywords.length > 0 ? keywords.slice(0, 5).join(', ') : '')
  const hasMore = emailCount > COLLAPSED_EMAIL_COUNT
  const hiddenCount = emailCount - COLLAPSED_EMAIL_COUNT
  const visibleEmails = expanded ? group.emails : group.emails.slice(0, COLLAPSED_EMAIL_COUNT)
  const isEmpty = emailCount === 0

  const toggleExpanded = useCallback(() => {
    if (hasMore) setExpanded((v) => !v)
  }, [hasMore])

  return (
    <section
      className={`gc-card ${expanded ? 'gc-card--expanded' : ''} ${isEmpty ? 'gc-card--empty' : ''}`}
      style={{ borderLeftColor: colorScheme.border }}
    >
      <div
        className="gc-card__header"
        onClick={toggleExpanded}
        role={hasMore ? 'button' : undefined}
        style={{ cursor: hasMore ? 'pointer' : 'default' }}
      >
        <div className="gc-card__title-row">
          <h3 className="gc-card__name">{group.name}</h3>
          <span className="gc-card__badge" style={{ backgroundColor: colorScheme.badge, color: colorScheme.badgeText }}>
            {emailCount}
          </span>
          {unreadCount > 0 && <span className="gc-card__unread">{unreadCount} new</span>}
          {hasMore && <span className={`gc-card__chevron ${expanded ? 'gc-card__chevron--up' : ''}`}>&#9660;</span>}
        </div>
        {isUserGroup && (
          <div className="gc-card__actions" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={`gc-card__action gc-card__action--pin ${group.is_pinned ? 'gc-card__action--pinned' : ''}`}
              title={group.is_pinned ? 'Unpin group' : 'Pin group'}
              onClick={() => onPinGroup?.(group)}
              aria-label={group.is_pinned ? 'Unpin group' : 'Pin group'}
            >
              &#128204;
            </button>
            <button type="button" className="gc-card__action" title="Edit group" onClick={() => onEditGroup?.(group)} aria-label={`Edit ${group.name}`}>
              &#9998;
            </button>
            <button type="button" className="gc-card__action gc-card__action--danger" title="Delete group" onClick={() => onDeleteGroup?.(group)} aria-label={`Delete ${group.name}`}>
              &#128465;
            </button>
          </div>
        )}
      </div>
      {description && <p className="gc-card__desc">{description}</p>}
      <div className="gc-card__emails">
        {isEmpty ? (
          <div className="gc-card__empty">
            <div className="gc-card__empty-icon">&#128233;</div>
            <p className="gc-card__empty-title">No emails match this group</p>
            {keywords.length > 0 && <p className="gc-card__empty-hint">Keywords: {keywords.slice(0, 6).join(', ')}</p>}
            {isUserGroup && (
              <div className="gc-card__empty-actions">
                <button type="button" className="gc-card__empty-btn" onClick={() => onEditGroup?.(group)}>Edit keywords</button>
                <button type="button" className="gc-card__empty-btn gc-card__empty-btn--danger" onClick={() => onDeleteGroup?.(group)}>Delete group</button>
              </div>
            )}
          </div>
        ) : (
          visibleEmails.map((email) => (
            <CompactEmail
              key={email.id}
              email={email}
              isSelected={selectedEmailId === email.id}
              onClick={onSelectEmail}
              onPinEmail={onPinEmail}
            />
          ))
        )}
      </div>
      {!expanded && hasMore && (
        <div className="gc-card__fade" onClick={toggleExpanded} role="button" tabIndex={0}>
          <span className="gc-card__expand-text">Show {hiddenCount} more email{hiddenCount !== 1 ? 's' : ''} &#9660;</span>
        </div>
      )}
      {expanded && hasMore && (
        <button type="button" className="gc-card__collapse" onClick={toggleExpanded}>Collapse &#9650;</button>
      )}
    </section>
  )
})

function GroupedEmailList({
  emails = [],
  userGroups = [],
  selectedEmailId,
  onSelectEmail,
  onPinEmail,
  onEditGroup,
  onDeleteGroup,
  onPinGroup,
}) {
  const groups = useMemo(() => buildGroups(emails, userGroups), [emails, userGroups])

  return (
    <div className="groups-grid-wrapper">
      <div className="gc-grid">
        {groups.map((group, idx) => {
          const isUserGroup = group.id !== '__unsorted__' && group.id !== '__all__' && userGroups.some((g) => g.id === group.id)
          const colorScheme = group.color ? GROUP_COLORS.find((c) => c.border === group.color) || getColorScheme(idx) : getColorScheme(idx)
          return (
            <GroupCard
              key={group.id}
              group={group}
              colorScheme={colorScheme}
              isUserGroup={isUserGroup}
              selectedEmailId={selectedEmailId}
              onSelectEmail={onSelectEmail}
              onPinEmail={onPinEmail}
              onEditGroup={onEditGroup}
              onDeleteGroup={onDeleteGroup}
              onPinGroup={onPinGroup}
            />
          )
        })}
      </div>
    </div>
  )
}

export default GroupedEmailList
