function TopBar({ searchQuery = '', onSearchChange, onRunSort }) {
  return (
    <header className="top-bar">
      <button type="button" className="top-bar__menu" aria-label="Menu">
        <span className="top-bar__menu-icon" aria-hidden="true" />
      </button>
      <div className="top-bar__logo">UnClutter</div>
      <div className="top-bar__search-wrap">
        <div className="top-bar__search-box">
          <span className="top-bar__search-icon" aria-hidden="true" />
          <input
            type="search"
            className="top-bar__search"
            placeholder="Search mail"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            aria-label="Search mail"
          />
        </div>
        <p className="top-bar__hint">from:, subject:, label:</p>
      </div>
      <div className="top-bar__right">
        <button type="button" className="top-bar__run-sort" onClick={onRunSort}>
          Run Sort
        </button>
        <button type="button" className="top-bar__icon-btn" aria-label="Settings">
          <span className="top-bar__icon-dots" aria-hidden="true" />
        </button>
        <div className="top-bar__profile" aria-hidden="true" />
      </div>
    </header>
  )
}

export default TopBar
