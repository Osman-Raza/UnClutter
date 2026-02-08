import { useState, useEffect, useCallback } from 'react'

function Toast({ toasts = [], onDismiss }) {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onDismiss?.(toast.id), 300)
    }, 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const handleDismiss = useCallback(() => {
    setExiting(true)
    setTimeout(() => onDismiss?.(toast.id), 300)
  }, [toast.id, onDismiss])

  const icon = toast.type === 'success' ? '\u2713' : toast.type === 'error' ? '\u2717' : toast.type === 'warning' ? '\u26A0' : '\u2139'

  return (
    <div className={`toast toast--${toast.type || 'info'} ${exiting ? 'toast--exit' : ''}`} role="status">
      <span className="toast__icon">{icon}</span>
      <span className="toast__message">{toast.message}</span>
      <button type="button" className="toast__close" onClick={handleDismiss} aria-label="Dismiss">&times;</button>
    </div>
  )
}

export default Toast
