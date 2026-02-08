import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE } from '../utils/auth'
import '../styles/auth.css'

function Signup() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    if (error) {
      console.error('OAuth error:', error)
    }
  }, [])

  const handleGoogleSignup = () => {
    const redirectUrl = `${window.location.origin}/home`
    window.location.href = `${API_BASE}/api/auth/google?redirect_url=${encodeURIComponent(redirectUrl)}`
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <h1 className="auth-card__logo">UnClutter</h1>
          <p className="auth-card__tagline">Create your account</p>
        </div>
        <p className="auth-card__desc">
          Use your Google account to sign up. We’ll never post without your permission.
        </p>
        <button
          type="button"
          className="auth-btn auth-btn--google"
          onClick={handleGoogleSignup}
        >
          <span className="auth-btn__google-icon" aria-hidden="true" />
          Sign up with Google
        </button>
        <p className="auth-card__footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default Signup
