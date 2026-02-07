import { useState, useCallback } from 'react'
import { sendToGemini } from '../../utils/geminiChat'

const INITIAL_MESSAGES = [
  { id: 1, role: 'assistant', text: "Hi! I'm the UnClutter Assistant. Ask me about your inbox, deadlines, or say something like “What deadlines do I have?” or “Summarize my recent emails.”" },
]

const SUGGESTED_PROMPTS = [
  'What deadlines do I have this week?',
  'Summarize recent emails from McMaster',
  'Show emails about exams',
]

function ChatbotSidebar({ onClose }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input || '').trim()
    if (!trimmed) return

    setInput('')
    setError(null)

    const userMsg = { id: Date.now(), role: 'user', text: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages.map(({ role, text }) => ({ role, text }))
      const { text: replyText } = await sendToGemini(apiKey, history, trimmed)
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', text: replyText },
      ])
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
    } finally {
      setLoading(false)
    }
  }, [input, messages, apiKey])

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleSuggestion = (prompt) => {
    sendMessage(prompt)
  }

  return (
    <aside className="chatbot-sidebar">
      <div className="chatbot-sidebar__header">
        <h2 className="chatbot-sidebar__title">UnClutter Assistant</h2>
        {onClose && (
          <button
            type="button"
            className="chatbot-sidebar__close"
            onClick={onClose}
            aria-label="Close chat"
          >
            ×
          </button>
        )}
      </div>
      <p className="chatbot-sidebar__privacy">Uses snippets by default</p>

      {!apiKey && (
        <div className="chatbot-sidebar__error">
          Add <code>VITE_GEMINI_API_KEY</code> to your <code>.env</code> file to enable chat.
          Get a key at{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
            Google AI Studio
          </a>
          .
        </div>
      )}

      <div className="chatbot-sidebar__thread">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chatbot-sidebar__message chatbot-sidebar__message--${msg.role}`}
          >
            {msg.text}
          </div>
        ))}
        {loading && (
          <div className="chatbot-sidebar__message chatbot-sidebar__message--assistant chatbot-sidebar__message--loading">
            …
          </div>
        )}
        {error && (
          <div className="chatbot-sidebar__error chatbot-sidebar__error--inline">
            {error}
          </div>
        )}
      </div>

      <div className="chatbot-sidebar__suggestions">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="chatbot-sidebar__chip"
            onClick={() => handleSuggestion(prompt)}
            disabled={!apiKey || loading}
          >
            {prompt}
          </button>
        ))}
      </div>

      <form className="chatbot-sidebar__input-wrap" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chatbot-sidebar__input"
          placeholder={apiKey ? 'Ask something…' : 'Add API key to chat'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!apiKey || loading}
          aria-label="Message"
        />
        <button
          type="submit"
          className="chatbot-sidebar__send"
          disabled={!apiKey || loading || !input.trim()}
        >
          Send
        </button>
      </form>
    </aside>
  )
}

export default ChatbotSidebar
