import { useState, useEffect } from 'react'
import { summarizeEmail } from '../../utils/geminiChat'

function EmailDetail({ email, onBack }) {
  const [summary, setSummary] = useState(null)
  const [summaryError, setSummaryError] = useState(null)
  const [summarizing, setSummarizing] = useState(false)

  useEffect(() => {
    if (email) {
      setSummary(null)
      setSummaryError(null)
    }
  }, [email?.id])

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  const handleSummarize = async () => {
    if (!email) return
    if (!apiKey?.trim()) {
      setSummaryError('Add VITE_GEMINI_API_KEY to .env to use Summarize.')
      return
    }
    setSummaryError(null)
    setSummarizing(true)
    try {
      const { text } = await summarizeEmail(apiKey, email.subject, email.body)
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
        <button type="button" className="email-detail__action">Reply</button>
        <button type="button" className="email-detail__action">Forward</button>
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
        <p>{email.body}</p>
      </div>
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
