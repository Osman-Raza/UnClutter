import { useState, useEffect } from 'react'

function EmailComposer({
  initialTo = '',
  initialSubject = '',
  initialBody = '',
  onSend,
  onCancel,
  sending = false,
  title = 'New message',
  sendError = null,
}) {
  const [to, setTo] = useState(initialTo)
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState(initialBody)
  const [error, setError] = useState(null)
  const displayError = sendError || error

  useEffect(() => {
    setTo(initialTo)
    setSubject(initialSubject)
    setBody(initialBody)
    setError(null)
  }, [initialTo, initialSubject, initialBody])
  useEffect(() => {
    if (sendError) setError(null)
  }, [sendError])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    const toTrim = to.trim()
    const subjectTrim = subject.trim()
    if (!toTrim) {
      setError('Enter a recipient.')
      return
    }
    if (!subjectTrim) {
      setError('Enter a subject.')
      return
    }
    onSend(toTrim, subjectTrim, body.trim())
  }

  return (
    <div className="composer-overlay" role="dialog" aria-modal="true" aria-labelledby="composer-title">
      <div className="composer">
        <div className="composer__header">
          <h2 id="composer-title" className="composer__title">{title}</h2>
          <button type="button" className="composer__close" onClick={onCancel} aria-label="Close" disabled={sending}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="composer__form">
          <label htmlFor="composer-to" className="composer__label">To</label>
          <input
            id="composer-to"
            type="text"
            className="composer__input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            disabled={sending}
            autoFocus
          />
          <label htmlFor="composer-subject" className="composer__label">Subject</label>
          <input
            id="composer-subject"
            type="text"
            className="composer__input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            disabled={sending}
          />
          <label htmlFor="composer-body" className="composer__label">Message</label>
          <textarea
            id="composer-body"
            className="composer__textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message…"
            rows={8}
            disabled={sending}
          />
          {displayError && <p className="composer__error">{displayError}</p>}
          <div className="composer__actions">
            <button type="submit" className="composer__btn composer__btn--primary" disabled={sending}>
              {sending ? 'Sending…' : 'Send'}
            </button>
            <button type="button" className="composer__btn composer__btn--secondary" onClick={onCancel} disabled={sending}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EmailComposer
