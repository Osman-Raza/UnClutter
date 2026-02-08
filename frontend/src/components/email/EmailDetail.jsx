import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { getAuthHeaders } from '../../utils/auth'
import { getDisplayBody, splitIntoParagraphs } from '../../utils/emailDisplay'

const TRUNCATE_LIMIT = 3000
const TRUNCATE_SHOW = 1500

function buildIframeSrcdoc(html) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin: 0; padding: 12px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #202124; word-break: break-word; overflow-wrap: break-word; background: #fff; }
  img { max-width: 100%; height: auto; }
  a { color: #1a73e8; }
  table { max-width: 100% !important; }
  pre, code { white-space: pre-wrap; word-break: break-all; }
  blockquote { margin: 8px 0; padding-left: 12px; border-left: 3px solid #dadce0; color: #5f6368; }
</style>
</head><body>${html}<script>
(function(){
  function postHeight(){
    var h = document.documentElement.scrollHeight;
    window.parent.postMessage({type:'iframe-height',height:h},'*');
  }
  postHeight();
  new MutationObserver(postHeight).observe(document.body,{childList:true,subtree:true,attributes:true});
  window.addEventListener('load',postHeight);
  document.querySelectorAll('img').forEach(function(img){img.addEventListener('load',postHeight);img.addEventListener('error',postHeight);});
  setTimeout(postHeight,500);
  setTimeout(postHeight,2000);
})();
</script></body></html>`
}

function EmailDetail({ email, onBack, onDelete, onArchive, onStar, onReply, onToggleRead }) {
  const [summary, setSummary] = useState(null)
  const [summaryError, setSummaryError] = useState(null)
  const [summarizing, setSummarizing] = useState(false)
  const [showFullBody, setShowFullBody] = useState(false)
  const [viewHtml, setViewHtml] = useState(true)
  const [iframeHeight, setIframeHeight] = useState(400)
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [replyError, setReplyError] = useState(null)
  const iframeRef = useRef(null)
  const replyRef = useRef(null)

  useEffect(() => {
    if (email) {
      setSummary(null)
      setSummaryError(null)
      setShowFullBody(false)
      setViewHtml(true)
      setIframeHeight(400)
      setShowReply(false)
      setReplyText('')
      setReplyError(null)
    }
  }, [email?.id])

  useEffect(() => {
    function handleMessage(e) {
      if (e.data?.type === 'iframe-height' && typeof e.data.height === 'number') {
        setIframeHeight(Math.max(200, Math.min(e.data.height + 24, 4000)))
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    if (showReply && replyRef.current) replyRef.current.focus()
  }, [showReply])

  const handleSummarize = async () => {
    if (!email) return
    setSummaryError(null)
    setSummarizing(true)
    try {
      const res = await fetch('/api/ai/summarize-email', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ subject: email.subject, body: bodyText }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Summarization failed')
      }
      const data = await res.json()
      setSummary(data.text || '')
    } catch (err) {
      setSummaryError(err.message || 'Summarization failed.')
    } finally {
      setSummarizing(false)
    }
  }

  const handleReply = async () => {
    if (!replyText.trim() || !onReply) return
    setReplyError(null)
    setReplySending(true)
    try {
      await onReply(email.id, { body: replyText.trim() })
      setReplyText('')
      setShowReply(false)
    } catch (err) {
      setReplyError(err.message || 'Failed to send reply')
    } finally {
      setReplySending(false)
    }
  }

  const bodyText = useMemo(() => getDisplayBody(email), [email])
  const hasHtml = Boolean(email?.body_html)

  const { displayText, isTruncated } = useMemo(() => {
    if (!bodyText || bodyText.length <= TRUNCATE_LIMIT || showFullBody) {
      return { displayText: bodyText, isTruncated: false }
    }
    return { displayText: bodyText.slice(0, TRUNCATE_SHOW), isTruncated: true }
  }, [bodyText, showFullBody])

  const paragraphs = useMemo(() => splitIntoParagraphs(displayText), [displayText])

  const srcdoc = useMemo(() => {
    if (!hasHtml || !email?.body_html) return ''
    return buildIframeSrcdoc(email.body_html)
  }, [hasHtml, email?.body_html])

  if (!email) return null

  const summaryLines = summary
    ? summary
        .split(/\n+/)
        .map((s) => s.replace(/^[\s\u2022\-*]+\s*/, '').trim())
        .filter(Boolean)
    : []

  const senderDisplay = (() => {
    const s = email.sender || email.from_address || ''
    const match = s.match(/^(.+?)\s*<(.+)>$/)
    if (match) return { name: match[1].replace(/"/g, ''), email: match[2] }
    return { name: s, email: '' }
  })()

  const showHtmlView = hasHtml && viewHtml

  return (
    <div className="email-detail">
      <div className="email-detail__toolbar">
        <button type="button" className="email-detail__back" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 4, verticalAlign: 'middle'}}>
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Back
        </button>
        <span className="email-detail__toolbar-divider" />

        {/* Action buttons */}
        <button
          type="button"
          className="email-detail__action"
          onClick={() => setShowReply(true)}
          title="Reply"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
          Reply
        </button>
        <button
          type="button"
          className="email-detail__action"
          onClick={() => onArchive?.(email.id)}
          title="Archive"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>
          Archive
        </button>
        <button
          type="button"
          className="email-detail__action email-detail__action--danger"
          onClick={() => onDelete?.(email.id)}
          title="Delete"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          Delete
        </button>
        <button
          type="button"
          className={`email-detail__action ${email.is_starred ? 'email-detail__action--starred' : ''}`}
          onClick={() => onStar?.(email.id)}
          title={email.is_starred ? 'Unstar' : 'Star'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            {email.is_starred
              ? <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              : <path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/>
            }
          </svg>
          {email.is_starred ? 'Starred' : 'Star'}
        </button>
        <button
          type="button"
          className="email-detail__action"
          onClick={() => onToggleRead?.(email.id)}
          title={email.is_read ? 'Mark as unread' : 'Mark as read'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          {email.is_read ? 'Mark as unread' : 'Mark as read'}
        </button>

        <div style={{flex: 1}} />
        <button
          type="button"
          className="email-detail__btn email-detail__btn--outline"
          onClick={handleSummarize}
          disabled={summarizing}
        >
          {summarizing ? 'Summarizing...' : 'Summarize'}
        </button>
      </div>

      <h2 className="email-detail__subject">{email.subject}</h2>

      <div className="email-detail__sender-block">
        <div className="email-detail__avatar">
          {(senderDisplay.name || '?')[0].toUpperCase()}
        </div>
        <div className="email-detail__sender-info">
          <span className="email-detail__sender-name">{senderDisplay.name}</span>
          {senderDisplay.email && (
            <span className="email-detail__sender-email">&lt;{senderDisplay.email}&gt;</span>
          )}
        </div>
        <span className="email-detail__date">{email.date}</span>
      </div>

      <div className="email-detail__meta">
        <span><strong>To:</strong> me</span>
        {email.cc_addresses?.length > 0 && (
          <span><strong>CC:</strong> {email.cc_addresses.join(', ')}</span>
        )}
      </div>

      {email.labels?.length > 0 && (
        <div className="email-detail__labels">
          {email.labels.filter((l) => !['INBOX', 'UNREAD', 'CATEGORY_PERSONAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_SOCIAL', 'CATEGORY_FORUMS'].includes(l)).map((label) => (
            <span key={label} className="email-detail__label-chip">
              {label.replace(/_/g, ' ').toLowerCase()}
            </span>
          ))}
        </div>
      )}

      {/* Email body */}
      <div className="email-detail__body">
        {showHtmlView ? (
          <iframe
            ref={iframeRef}
            className="email-detail__html-frame"
            srcDoc={srcdoc}
            sandbox="allow-same-origin allow-popups"
            title="Email content"
            style={{ height: `${iframeHeight}px` }}
          />
        ) : (
          <>
            {paragraphs.map((para, i) => {
              if (para.includes('\n\u2022 ') || para.startsWith('\u2022 ')) {
                const items = para.split('\n').filter(Boolean)
                return (
                  <ul key={i} className="email-detail__body-list">
                    {items.map((item, j) => (
                      <li key={j}>{item.replace(/^\u2022\s*/, '')}</li>
                    ))}
                  </ul>
                )
              }
              if (para.startsWith('> ')) {
                return (
                  <blockquote key={i} className="email-detail__body-quote">
                    {para.replace(/^>\s*/gm, '')}
                  </blockquote>
                )
              }
              return <p key={i} className="email-detail__body-para">{para}</p>
            })}
            {isTruncated && (
              <button
                type="button"
                className="email-detail__show-more"
                onClick={() => setShowFullBody(true)}
              >
                Show full email ({Math.round(bodyText.length / 1000)}k characters)
              </button>
            )}
          </>
        )}
      </div>

      {/* AI Summary */}
      {(summary || summarizing || summaryError) && (
        <div className="email-detail__summary-box">
          <h3 className="email-detail__summary-title">AI Summary</h3>
          {summarizing && <p className="email-detail__summary-loading">Summarizing...</p>}
          {summaryError && <p className="email-detail__summary-error">{summaryError}</p>}
          {!summarizing && !summaryError && summaryLines.length > 0 && (
            <ul className="email-detail__summary-list">
              {summaryLines.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Reply section */}
      {showReply && (
        <div className="email-detail__reply">
          <div className="email-detail__reply-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 6, flexShrink: 0, color: '#5f6368'}}>
              <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
            </svg>
            <span>Replying to <strong>{senderDisplay.name}</strong></span>
            <button
              type="button"
              className="email-detail__reply-close"
              onClick={() => { setShowReply(false); setReplyText(''); setReplyError(null) }}
              aria-label="Cancel reply"
            >&times;</button>
          </div>
          <textarea
            ref={replyRef}
            className="email-detail__reply-body"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write your reply..."
            rows={6}
            disabled={replySending}
          />
          {replyError && <p className="email-detail__reply-error">{replyError}</p>}
          <div className="email-detail__reply-actions">
            <button
              type="button"
              className="email-detail__reply-send"
              onClick={handleReply}
              disabled={replySending || !replyText.trim()}
            >
              {replySending ? 'Sending...' : 'Send Reply'}
            </button>
            <button
              type="button"
              className="email-detail__reply-cancel"
              onClick={() => { setShowReply(false); setReplyText(''); setReplyError(null) }}
              disabled={replySending}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quick reply bar at bottom (when reply panel is not open) */}
      {!showReply && (
        <button
          type="button"
          className="email-detail__quick-reply"
          onClick={() => setShowReply(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 8, color: '#5f6368'}}>
            <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
          </svg>
          Click here to reply...
        </button>
      )}
    </div>
  )
}

export default EmailDetail
