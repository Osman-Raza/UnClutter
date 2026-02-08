function TopBar({
  searchQuery = '',
  onSearchChange,
  onRunSort,
  user,
  onLogout,
  syncing = false,
  lastSynced,
  chatOpen = false,
  onToggleChat,
  onToggleSidebar,
  sidebarCollapsed = false,
}) {
  return (
    <header className="top-bar">
      <button
        type="button"
        className="top-bar__menu"
        aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        onClick={onToggleSidebar}
      >
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
          {searchQuery && (
            <button
              type="button"
              className="top-bar__search-clear"
              onClick={() => onSearchChange?.('')}
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>
      </div>
      <div className="top-bar__right">
        <button
          type="button"
          className={`top-bar__chat-btn ${chatOpen ? 'top-bar__chat-btn--active' : ''}`}
          onClick={onToggleChat}
          aria-label={chatOpen ? 'Close assistant' : 'Open assistant'}
          title="AI Assistant"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 6, verticalAlign: 'middle'}}>
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
          </svg>
          Assistant
        </button>
        <button
          type="button"
          className="top-bar__run-sort"
          onClick={onRunSort}
          disabled={syncing}
          aria-busy={syncing}
          title={lastSynced || undefined}
        >
          {syncing ? (
            <>
              <span className="loading-spinner loading-spinner--small" aria-hidden="true" />
              Syncing...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 6, verticalAlign: 'middle'}}>
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              Sync
            </>
          )}
        </button>
        {user && (
          <>
            <span className="top-bar__user-email" title={user}>{user}</span>
            <button type="button" className="top-bar__logout" onClick={onLogout}>
              Sign out
            </button>
          </>
        )}
        <div className="top-bar__profile" aria-hidden="true" />
      </div>
    </header>
  )
}

export default TopBar
