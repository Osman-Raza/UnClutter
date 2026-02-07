import { Link } from 'react-router-dom'

function Landing() {
  return (
    <div className="landing">
      <h1>UnClutter</h1>
      <p className="tagline">Your inbox, simplified.</p>
      <Link to="/login">
        <button type="button">Get Started</button>
      </Link>
    </div>
  )
}

export default Landing
