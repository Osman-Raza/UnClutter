import { useState, useEffect } from 'react'
import { summarizeEmail } from '../../utils/geminiChat'
import { htmlToPlainText } from '../../utils/emailBody'
import { sendReply } from '../../utils/gmailApi'

function EmailDetail({ email, onBack, canReply = false, onForward }) {
  const [summary, setSummary] = useState(null)
  const [summaryError, setSummaryError] = useState(null)
  const [summarizing, setSummarizing] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [replyError, setReplyError] = useState(null)
  const [replySent, setReplySent] = useState(false)

  useEffect(() => {
    if (email) {
      setSummary(null)
      setSummaryError(null)
      setReplyOpen(false)
      setReplyBody('')
      setReplyError(null)
      setReplySent(false)
    }
  }, [email?.id])

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  const bodyPlain = htmlToPlainText(email?.body)

  const handleSendReply = async () => {
    if (!email?.id || !replyBody.trim()) return
    setReplyError(null)
    setReplySending(true)
    try {
      await sendReply(email.id, replyBody.trim())
      setReplySent(true)
      setReplyBody('')
      setReplyOpen(false)
    } catch (err) {
      setReplyError(err.message || 'Failed to send reply')
    } finally {
      setReplySending(false)
    }
  }

  const handleSummarize = async () => {
    if (!email) return
    if (!apiKey?.trim()) {
      setSummaryError('Add VITE_GEMINI_API_KEY to .env to use Summarize.')
      return
    }
    setSummaryError(null)
    setSummarizing(true)
    try {
      const { text } = await summarizeEmail(apiKey, email.subject, bodyPlain || email.body)
      setSummary(text)
    } catch (err) {
      setSummaryError(err.message || 'Summarization failed.')
    } finally {
      setSummarizing(false)
    }
  }

  if (!email) return null

  const mockExtracted = {
    deadlines: ['Feb 15 – Fee deadline', 'Feb 8 – Avenue maintenance'],
    actionItems: ['Check Avenue for midterm schedule'],
    links: ['https://avenue.mcmaster.ca', 'https://mosaic.mcmaster.ca'],
  }

  const summaryLines = summary
    ? summary
        .split(/\n+/)
        .map((s) => s.replace(/^[\s•\-*]+\s*/, '').trim())
        .filter(Boolean)
    : []

  return (
    <div className="email-detail">
      <div className="email-detail__toolbar">
        <button type="button" className="email-detail__back" onClick={onBack}>
          Back to inbox
        </button>
        <span className="email-detail__toolbar-divider" />
        {canReply ? (
          <button
            type="button"
            className="email-detail__action"
            onClick={() => setReplyOpen((o) => !o)}
            aria-expanded={replyOpen}
          >
            Reply
          </button>
        ) : (
          <span className="email-detail__action email-detail__action--muted" title="Reply only for connected Gmail">
            Reply
          </span>
        )}
        {onForward ? (
          <button type="button" className="email-detail__action" onClick={() => onForward(email)}>
            Forward
          </button>
        ) : (
          <span className="email-detail__action email-detail__action--muted" title="Forward only for connected Gmail">
            Forward
          </span>
        )}
      </div>
      <h2 className="email-detail__subject">{email.subject}</h2>
      <div className="email-detail__meta">
        <span><strong>From:</strong> {email.sender}</span>
        <span><strong>To:</strong> me@example.com</span>
        <span><strong>Date:</strong> {email.date}</span>
      </div>
      <div className="email-detail__labels">
        {email.labels?.map((label) => (
          <span key={label} className="email-detail__label-chip">
            {label}
          </span>
        ))}
      </div>
      <div className="email-detail__body">
        <p className="email-detail__body-text">{bodyPlain || email.body || '(No content)'}</p>
      </div>
      {canReply && replyOpen && (
        <div className="email-detail__reply-box">
          <label htmlFor="reply-body" className="email-detail__reply-label">Your reply</label>
          <textarea
            id="reply-body"
            className="email-detail__reply-textarea"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write your message…"
            rows={4}
            disabled={replySending}
          />
          {replyError && <p className="email-detail__reply-error">{replyError}</p>}
          {replySent && <p className="email-detail__reply-success">Reply sent.</p>}
          <div className="email-detail__reply-actions">
            <button
              type="button"
              className="email-detail__btn"
              onClick={handleSendReply}
              disabled={replySending || !replyBody.trim()}
            >
              {replySending ? 'Sending…' : 'Send reply'}
            </button>
            <button
              type="button"
              className="email-detail__btn email-detail__btn--secondary"
              onClick={() => { setReplyOpen(false); setReplyError(null); setReplyBody(''); }}
              disabled={replySending}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="email-detail__summary-box">
        <h3 className="email-detail__summary-title">Summary</h3>
        {summarizing && <p className="email-detail__summary-loading">Summarizing…</p>}
        {summaryError && (
          <p className="email-detail__summary-error">{summaryError}</p>
        )}
        {!summarizing && !summaryError && summaryLines.length > 0 && (
          <ul className="email-detail__summary-list">
            {summaryLines.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}
        {!summarizing && !summaryError && !summary && (
          <p className="email-detail__summary-placeholder">Click “Summarize” to generate a summary.</p>
        )}
      </div>
      <div className="email-detail__extracted">
        <h4>Extracted</h4>
        <p><strong>Deadlines:</strong> {mockExtracted.deadlines.join('; ')}</p>
        <p><strong>Action items:</strong> {mockExtracted.actionItems.join('; ')}</p>
        <p><strong>Links:</strong> {mockExtracted.links.join(', ')}</p>
      </div>
      <div className="email-detail__actions">
        <button
          type="button"
          className="email-detail__btn"
          onClick={handleSummarize}
          disabled={summarizing}
        >
          {summarizing ? 'Summarizing…' : 'Summarize'}
        </button>
      </div>
    </div>
  )
}

export default EmailDetail
