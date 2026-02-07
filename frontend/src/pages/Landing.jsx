import { Link } from 'react-router-dom'

function Landing() {
  return (
    <div className="landing">
      <div className="landing__bg" aria-hidden="true" />
      <header className="landing__header">
        <span className="landing__logo">UnClutter</span>
      </header>
      <main className="landing__main">
        <h1 className="landing__title">
          Your inbox, <span className="landing__title-accent">sorted.</span>
        </h1>
        <p className="landing__tagline">
          Turn the chaos into clear cards. UnClutter groups your mail by what it is—promotions,
          updates, social—so you see what matters first.
        </p>
        <ul className="landing__features">
          <li>Category cards instead of one long list</li>
          <li>Sort by date, sender, or subject</li>
          <li>Clean reading view without HTML clutter</li>
        </ul>
        <Link to="/login" className="landing__cta-wrap">
          <button type="button" className="landing__cta">
            Get started with Google
          </button>
        </Link>
      </main>
      <footer className="landing__footer">
        <p>Sign in with your Google account. We only read your email to organize it.</p>
      </footer>
    </div>
  )
}

export default Landing
