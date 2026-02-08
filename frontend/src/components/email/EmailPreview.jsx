import { memo } from 'react'

function getSenderName(from) {
  if (!from) return 'Unknown'
  const match = from.match(/^"?(.+?)"?\s*<.+>$/)
  return match ? match[1].replace(/"/g, '').trim() : from.split('@')[0]
}

function EmailPreview({ email, isSelected, onClick, onPinEmail, showKeywordChips = true }) {
  if (!email) return null

  const isUnread = email.is_read === false || (email.label_ids && email.label_ids.includes('UNREAD'))
  const isStarred = email.is_starred || (email.label_ids && email.label_ids.includes('STARRED'))
  const isPinned = email.is_pinned
  const senderName = getSenderName(email.from_address || email.sender)

  return (
    <div
      className={`email-preview ${isSelected ? 'email-preview--selected' : ''} ${isUnread ? 'email-preview--unread' : ''} ${isPinned ? 'email-preview--pinned' : ''}`}
      onClick={() => onClick?.(email)}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(email)}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
    >
      <div className="email-preview__indicators">
        <button
          type="button"
          className={`email-preview__pin ${isPinned ? 'email-preview__pin--active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onPinEmail?.(email) }}
          title={isPinned ? 'Unpin' : 'Pin'}
          aria-label={isPinned ? 'Unpin' : 'Pin'}
        >
          &#128204;
        </button>
        {isUnread && <span className="email-preview__unread-dot" />}
        {isStarred && <span className="email-preview__star-icon">&#9733;</span>}
      </div>
      <div className="email-preview__main">
        <div className="email-preview__row">
          <span className="email-preview__sender">{senderName}</span>
          <span className="email-preview__date">{email.date}</span>
        </div>
        <div className="email-preview__subject">{email.subject || '(No subject)'}</div>
        <div className="email-preview__snippet">{email.snippet}</div>
        {showKeywordChips && email.detectedKeywords?.length > 0 && (
          <div className="email-preview__chips">
            {email.detectedKeywords.map((kw) => (
              <span key={kw} className="email-preview__chip">
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(EmailPreview)
