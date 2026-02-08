import EmailPreview from '../email/EmailPreview'

function EmailList({
  emails = [],
  selectedEmailId,
  onSelectEmail,
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
          showKeywordChips={showKeywordChips}
        />
      ))}
    </div>
  )
}

export default EmailList
