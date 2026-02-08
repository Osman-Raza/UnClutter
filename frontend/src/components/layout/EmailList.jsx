import EmailPreview from '../email/EmailPreview'

function EmailList({
  emails = [],
  selectedEmailId,
  onSelectEmail,
  onPinEmail,
  showKeywordChips = false,
}) {
  return (
    <div className="email-list">
      {emails.map((email) => (
        <EmailPreview
          key={email.id}
          email={email}
          isSelected={selectedEmailId === email.id}
          onClick={onSelectEmail}
          onPinEmail={onPinEmail}
          showKeywordChips={showKeywordChips}
        />
      ))}
    </div>
  )
}

export default EmailList
