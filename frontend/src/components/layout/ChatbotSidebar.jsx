import { useState, useCallback, useEffect, useRef } from 'react'
import { API_BASE, getAuthHeaders } from '../../utils/auth'
import { createGroupFromIntent, deleteGroup } from '../../utils/groupsApi'

const INITIAL_MESSAGES = [
  {
    id: 1,
    role: 'assistant',
    text: "Hi! I'm the UnClutter Assistant. I have full access to your inbox. Ask me about deadlines, summarize your emails, or create groups to organize. Try the prompts below to get started!",
  },
]

const DEFAULT_PROMPTS = [
  'What deadlines do I have this week?',
  'Summarize my inbox',
  'Create a group for university emails',
  'List my action items from recent emails',
]

const EMAIL_PROMPTS = [
  'Summarize this email',
  'What should I reply?',
  'Is this urgent?',
  'Extract action items',
]

function isRateLimitError(errMsg) {
  if (!errMsg) return false
  const lower = errMsg.toLowerCase()
  return lower.includes('rate limit') || lower.includes('429') || lower.includes('too many requests') || lower.includes('rate_limit')
}

/**
 * Broadly detect whether the user is asking to create / make a group.
 * We want to catch as many natural-language variants as possible.
 */
function isGroupCreationIntent(text) {
  const lower = text.toLowerCase().trim()
  // Direct patterns: "create a group …", "make a group …", "add a group …"
  if (/^(create|make|add|set\s*up|start)\s+(a\s+)?(new\s+)?(email\s+)?group/i.test(lower)) return true
  // "group together emails from …", "group all emails from …"
  if (/^group\s+(together\s+)?(all\s+)?(emails?\s+)?(from|about|for|related)/i.test(lower)) return true
  // "I want a group for …", "I need a group for …", "can you create a group …"
  if (/i\s+(want|need|would\s+like)\s+(a\s+)?(new\s+)?(email\s+)?group/i.test(lower)) return true
  if (/can\s+you\s+(create|make|add|set\s*up)\s+(a\s+)?(new\s+)?group/i.test(lower)) return true
  // "new group for …", "new group called …"
  if (/^new\s+group\s+(for|called|named|about)/i.test(lower)) return true
  // "organize my … emails into a group"
  if (/organiz?e\s+.{2,30}\s+into\s+(a\s+)?group/i.test(lower)) return true
  // "sort my … emails"
  if (/^sort\s+(my\s+)?.+\s+emails?/i.test(lower)) return true
  return false
}

function isGroupDeleteIntent(text) {
  const lower = text.toLowerCase().trim()
  if (/^(delete|remove|archive)\s+(a\s+)?(email\s+)?group/i.test(lower)) return true
  if (/^delete\s+group\s+/i.test(lower)) return true
  if (/^remove\s+group\s+/i.test(lower)) return true
  if (/^delete\s+group\s+for\s+/i.test(lower)) return true
  if (/^remove\s+group\s+for\s+/i.test(lower)) return true
  return false
}

function extractGroupNameForDelete(text) {
  let result = text.trim()
  const patterns = [
    /^(?:delete|remove|archive)\s+(?:a\s+)?(?:email\s+)?group\s+/i,
    /^(?:delete|remove)\s+group\s+/i,
    /^(?:delete|remove)\s+group\s+for\s+/i,
  ]
  for (const p of patterns) {
    result = result.replace(p, '')
  }
  result = result.replace(/^(for|about)\s+/i, '')
  return result.trim().replace(/^"|"$/g, '') || ''
}

/**
 * Extract the intent/topic from the group creation message.
 * e.g. "create a group for university emails" -> "university emails"
 */
function extractGroupIntent(text) {
  const lower = text.trim()
  // Try stripping common prefixes
  const patterns = [
    /^(?:create|make|add|set\s*up|start)\s+(?:a\s+)?(?:new\s+)?(?:email\s+)?group\s+(?:for|called|named|about|of|with)?\s*/i,
    /^group\s+(?:together\s+)?(?:all\s+)?(?:emails?\s+)?(?:from|about|for|related\s+to)?\s*/i,
    /^(?:i\s+(?:want|need|would\s+like)\s+(?:a\s+)?(?:new\s+)?(?:email\s+)?group\s+(?:for|called|named|about)?\s*)/i,
    /^(?:can\s+you\s+(?:create|make|add|set\s*up)\s+(?:a\s+)?(?:new\s+)?group\s+(?:for|called|named|about)?\s*)/i,
    /^new\s+group\s+(?:for|called|named|about)\s*/i,
    /^(?:organiz?e\s+(?:my\s+)?)/i,
    /^sort\s+(?:my\s+)?/i,
  ]
  let result = lower
  for (const p of patterns) {
    result = result.replace(p, '')
  }
  // Clean trailing "emails", "into a group"
  result = result.replace(/\s*(?:into\s+(?:a\s+)?group|emails?)\s*$/i, '').trim()
  return result || text.trim()
}

/**
 * Parse message text and replace "Email N" / "(Email N)" references with
 * clickable links that select the referenced email.
 */
function renderMessageWithEmailLinks(text, emails, onSelectEmail) {
  if (!text || !emails || emails.length === 0 || !onSelectEmail) return text

  // Match patterns like "Email 13", "(Email 13)", "email 19"
  const parts = text.split(/((?:\()?Email\s+\d+(?:\))?)/gi)
  if (parts.length === 1) return text // no matches

  return parts.map((part, i) => {
    const match = part.match(/\(?Email\s+(\d+)\)?/i)
    if (!match) return part

    const emailIndex = parseInt(match[1], 10) - 1 // AI uses 1-indexed
    const email = emails[emailIndex]
    if (!email) return part // index out of range, keep as text

    const subject = email.subject || '(No subject)'
    const sender = email.sender || email.from_address || ''
    const label = sender ? `${sender}: ${subject}` : subject

    return (
      <button
        key={`email-link-${i}`}
        type="button"
        className="chatbot-sidebar__email-link"
        onClick={() => onSelectEmail(email)}
        title={label}
      >
        {subject.length > 40 ? subject.slice(0, 37) + '...' : subject}
      </button>
    )
  })
}

function ChatbotSidebar({ isOpen = true, onClose, selectedEmail, emails = [], userGroups = [], onGroupsChange, onToast, onSelectEmail }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryCountdown, setRetryCountdown] = useState(0)
  const [pendingRetry, setPendingRetry] = useState(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const countdownRef = useRef(null)
  const threadRef = useRef(null)
  const textareaRef = useRef(null)

  // Auto-scroll chat thread to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (threadRef.current && isAtBottom) {
      threadRef.current.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, loading])

  // Track whether user is scrolled to the bottom
  const handleThreadScroll = useCallback(() => {
    const el = threadRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 60)
  }, [])

  const scrollToBottom = useCallback(() => {
    if (threadRef.current) {
      threadRef.current.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [])

  // Countdown timer for rate limit retry
  useEffect(() => {
    if (retryCountdown <= 0) {
      if (countdownRef.current) clearInterval(countdownRef.current)
      return
    }
    countdownRef.current = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(countdownRef.current)
  }, [retryCountdown])

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text || input || '').trim()
      if (!trimmed) return

      const userMsg = { id: Date.now(), role: 'user', text: trimmed }
      setInput('')
      setError(null)
      setPendingRetry(null)
      setRetryCountdown(0)

      // ── Group deletion intent detection ──
      if (isGroupDeleteIntent(trimmed)) {
        setMessages((prev) => [...prev, userMsg])
        setLoading(true)
        try {
          const rawName = extractGroupNameForDelete(trimmed)
          const target = userGroups.find((g) => g.name?.toLowerCase() === rawName.toLowerCase())
          if (!rawName || !target) {
            const msg = rawName
              ? `I couldn't find a group named "${rawName}". Try the exact group name from the sidebar.`
              : 'Tell me the exact group name to delete (e.g., "Delete group University").'
            setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', text: msg }])
            return
          }
          await deleteGroup(target.id)
          onGroupsChange?.()
          const reply = `Deleted the group "${target.name}".`
          setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', text: reply }])
          onToast?.({ type: 'success', message: `Group "${target.name}" deleted` })
        } catch (err) {
          const errMsg = err.message || 'Failed to delete group'
          setError(errMsg)
          onToast?.({ type: 'error', message: errMsg })
        } finally {
          setLoading(false)
        }
        return
      }

      // ── Group creation intent detection (broad matching) ──
      if (isGroupCreationIntent(trimmed)) {
        setMessages((prev) => [...prev, userMsg])
        setLoading(true)
        try {
          const intent = extractGroupIntent(trimmed)
          console.log('[ChatbotSidebar] Group creation intent detected:', intent)
          const { group, suggested } = await createGroupFromIntent(intent)
          console.log('[ChatbotSidebar] Group created:', group, suggested)
          onGroupsChange?.()
          const keywords = suggested?.keywords || group?.match_keywords || []
          const reply = `Created group "${group.name}"${suggested?.description ? ` — ${suggested.description}` : ''}.\n\nKeywords: ${keywords.slice(0, 8).join(', ') || 'none'}\n\nSwitch to Grouped view in the sidebar to see your new group.`
          setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', text: reply }])
          onToast?.({ type: 'success', message: `Group "${group.name}" created successfully` })
        } catch (err) {
          console.error('[ChatbotSidebar] Group creation error:', err)
          const errMsg = err.message || 'Failed to create group'
          if (isRateLimitError(errMsg)) {
            setError('AI is temporarily busy due to rate limits. Please wait a moment and try again.')
            setRetryCountdown(15)
            setPendingRetry(trimmed)
          } else {
            setError(errMsg)
          }
          onToast?.({ type: 'error', message: errMsg })
        } finally {
          setLoading(false)
        }
        return
      }

      // ── Regular chat: backend may also return group_created action ──
      setMessages((prev) => [...prev, userMsg])
      setLoading(true)

      try {
        const history = messages.map(({ role, text: t }) => ({ role, text: t }))
        const body = {
          messages: history,
          message: trimmed,
          selectedEmail: selectedEmail || undefined,
          emails: (emails || []).slice(0, 25),
        }
        const res = await fetch(`${API_BASE || ''}/api/ai/chat`, {
          method: 'POST',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Chat failed')
        }
        const data = await res.json()
        console.log('[ChatbotSidebar] Chat response:', data)

        setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', text: data.text || '' }])

        // If backend detected a group creation action, refresh groups
        if (data.action === 'group_created' && data.group) {
          console.log('[ChatbotSidebar] Backend created group via chat:', data.group)
          onGroupsChange?.()
          onToast?.({ type: 'success', message: `Group "${data.group.name}" created successfully` })
        }
      } catch (err) {
        const errMsg = err.message || 'Something went wrong.'
        if (isRateLimitError(errMsg)) {
          setError('AI is temporarily busy. Please wait a moment and try again.')
          setRetryCountdown(15)
          setPendingRetry(trimmed)
        } else {
          setError(errMsg)
          setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
        }
      } finally {
        setLoading(false)
      }
    },
    [input, messages, selectedEmail, emails, onGroupsChange, onToast]
  )

  const handleRetry = useCallback(() => {
    if (pendingRetry) {
      setError(null)
      setRetryCountdown(0)
      sendMessage(pendingRetry)
    }
  }, [pendingRetry, sendMessage])

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleClearChat = () => {
    setMessages(INITIAL_MESSAGES)
    setError(null)
    setPendingRetry(null)
    setRetryCountdown(0)
  }

  const suggestedPrompts = selectedEmail ? EMAIL_PROMPTS : DEFAULT_PROMPTS

  return (
    <aside className={`chatbot-sidebar ${!isOpen ? 'chatbot-sidebar--closed' : ''}`}>
      <div className="chatbot-sidebar__header">
        <h2 className="chatbot-sidebar__title">UnClutter Assistant</h2>
        <div className="chatbot-sidebar__header-actions">
          {messages.length > 1 && (
            <button
              type="button"
              className="chatbot-sidebar__clear-btn"
              onClick={handleClearChat}
              title="Clear conversation"
              aria-label="Clear conversation"
            >
              Clear
            </button>
          )}
          {onClose && (
            <button
              type="button"
              className="chatbot-sidebar__close"
              onClick={onClose}
              aria-label="Close chat"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      <p className="chatbot-sidebar__privacy">
        {emails.length > 0
          ? `Context: ${emails.length} email${emails.length !== 1 ? 's' : ''} loaded`
          : 'Sync inbox to enable email context'}
        {selectedEmail && ' \u2022 Focused on selected email'}
      </p>

      <div className="chatbot-sidebar__thread" ref={threadRef} onScroll={handleThreadScroll}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chatbot-sidebar__message chatbot-sidebar__message--${msg.role}`}
          >
            {msg.role === 'assistant'
              ? renderMessageWithEmailLinks(msg.text, emails, onSelectEmail)
              : msg.text}
          </div>
        ))}
        {loading && (
          <div className="chatbot-sidebar__message chatbot-sidebar__message--assistant chatbot-sidebar__message--loading">
            <span className="chatbot-sidebar__typing-indicator">
              <span /><span /><span />
            </span>
          </div>
        )}
        {error && (
          <div className="chatbot-sidebar__error chatbot-sidebar__error--inline">
            <span className="chatbot-sidebar__error-icon">!</span>
            <span className="chatbot-sidebar__error-text">
              {error}
              {retryCountdown > 0 && (
                <span className="chatbot-sidebar__countdown"> Retry in {retryCountdown}s...</span>
              )}
            </span>
            {pendingRetry && retryCountdown <= 0 && (
              <button
                type="button"
                className="chatbot-sidebar__retry-btn"
                onClick={handleRetry}
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      {/* Scroll-to-bottom button — positioned outside thread so it doesn't scroll away */}
      {!isAtBottom && messages.length > 2 && (
        <button
          type="button"
          className="chatbot-sidebar__scroll-bottom"
          onClick={scrollToBottom}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>
          Scroll to bottom
        </button>
      )}

      <div className="chatbot-sidebar__suggestions">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="chatbot-sidebar__chip"
            onClick={() => sendMessage(prompt)}
            disabled={loading}
          >
            {prompt}
          </button>
        ))}
      </div>

      <form className="chatbot-sidebar__input-wrap" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="chatbot-sidebar__input chatbot-sidebar__textarea"
          placeholder="Ask about your emails..."
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            // Auto-resize textarea
            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto'
              textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={loading}
          aria-label="Message"
          rows={1}
        />
        <button
          type="submit"
          className="chatbot-sidebar__send"
          disabled={loading || !input.trim()}
          aria-label="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </form>
    </aside>
  )
}

export default ChatbotSidebar
