function EmailPreview({ email, isSelected, onClick, showKeywordChips = true }) {
  if (!email) return null

  return (
    <div
      className={`email-preview ${isSelected ? 'email-preview--selected' : ''}`}
      onClick={() => onClick?.(email)}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(email)}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
    >
      <div className="email-preview__check" aria-hidden="true" />
      <div className="email-preview__star" aria-hidden="true" />
      <div className="email-preview__main">
        <div className="email-preview__row">
          <span className="email-preview__sender">{email.sender}</span>
          <span className="email-preview__date">{email.date}</span>
        </div>
        <div className="email-preview__subject">{email.subject}</div>
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

export default EmailPreview
