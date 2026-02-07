function EmailPreview({ email }) {
  if (!email) return null

  return (
    <div className="email-preview">
      <div className="email-preview__sender">{email.sender}</div>
      <div className="email-preview__subject">{email.subject}</div>
      <div className="email-preview__date">{email.date}</div>
    </div>
  )
}

export default EmailPreview
