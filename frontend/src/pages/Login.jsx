import { Link } from 'react-router-dom'
import GoogleButton from '../components/auth/GoogleButton'

function Login() {
  return (
    <div className="login-page">
      <div className="login-page__bg" aria-hidden="true" />
      <div className="login-page__card">
        <Link to="/" className="login-page__logo">
          UnClutter
        </Link>
        <h1 className="login-page__title">Welcome back</h1>
        <p className="login-page__subtitle">
          Sign in with your Google account to open your organized inbox.
        </p>
        <GoogleButton />
        <p className="login-page__hint">
          We use Google only to read your email and show it in category cards. You can sign out anytime.
        </p>
      </div>
    </div>
  )
}

export default Login
