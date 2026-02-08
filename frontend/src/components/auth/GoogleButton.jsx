import { API_BASE } from '../../utils/auth'

function GoogleButton({ className = '' }) {
  const handleClick = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/66c379fb-3e46-49cd-93f0-58e1ee110e33',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H1',location:'frontend/src/components/auth/GoogleButton.jsx:handleClick',message:'google_login_click',data:{apiBase:API_BASE,targetUrl:`${API_BASE}/api/auth/login`,origin:window.location.origin,protocol:window.location.protocol,href:window.location.href},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const redirectUrl = encodeURIComponent(window.location.origin)
    window.location.href = `${API_BASE}/api/auth/google?redirect_url=${redirectUrl}`
  }

  const buttonClassName = `google-btn${className ? ` ${className}` : ''}`

  return (
    <button type="button" className={buttonClassName} onClick={handleClick}>
      <span className="google-btn__icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615Z"
            fill="#4285F4"
          />
          <path
            d="M9 18c2.43 0 4.467-.806 6.168-2.185l-2.908-2.258c-.806.54-1.837.86-3.26.86-2.513 0-4.646-1.697-5.42-4.073H.574v2.331A8.997 8.997 0 0 0 9 18Z"
            fill="#34A853"
          />
          <path
            d="M3.558 10.75a5.41 5.41 0 0 1 0-3.5V4.919H.574A8.996 8.996 0 0 0 0 9c0 1.45.348 2.827.957 4.081l2.601-2.331Z"
            fill="#FBBC05"
          />
          <path
            d="M9 3.58c1.42 0 2.694.49 3.698 1.44l2.76-2.764C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .574 4.92L3.557 7.25C4.33 4.883 6.461 3.58 9 3.58Z"
            fill="#EA4335"
          />
        </svg>
      </span>
      <span className="google-btn__label">Continue with Google</span>
    </button>
  )
}

export default GoogleButton
