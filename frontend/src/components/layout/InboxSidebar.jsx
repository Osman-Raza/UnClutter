const DEFAULT_GROUP_NAMES = ['Promotions', 'Updates', 'Social']

function InboxSidebar({
  emailCount = 0,
  totalCount = 0,
  viewMode = 'tabs',
  onViewModeChange,
  userGroups = [],
  onDeleteGroup,
  onEditGroup,
}) {
  return (
    <aside className="inbox-sidebar">
      <nav className="inbox-sidebar__nav">
        <div className="inbox-sidebar__item inbox-sidebar__item--active">
          <span className="inbox-sidebar__icon inbox-sidebar__icon--inbox" aria-hidden="true" />
          <span className="inbox-sidebar__label">Inbox</span>
          <span className="inbox-sidebar__count">
            {emailCount !== totalCount ? `${emailCount} / ${totalCount}` : emailCount}
          </span>
        </div>
      </nav>

      <div className="inbox-sidebar__view-mode">
        <span className="inbox-sidebar__view-mode-label">View</span>
        <div className="inbox-sidebar__view-mode-btns" role="group">
          <button
            type="button"
            className={`inbox-sidebar__view-btn ${viewMode === 'tabs' ? 'inbox-sidebar__view-btn--active' : ''}`}
            onClick={() => onViewModeChange?.('tabs')}
            title="Show emails with group tabs at top"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 4, verticalAlign: 'middle'}}><path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z"/></svg>
            Tabs
          </button>
          <button
            type="button"
            className={`inbox-sidebar__view-btn ${viewMode === 'grouped' ? 'inbox-sidebar__view-btn--active' : ''}`}
            onClick={() => onViewModeChange?.('grouped')}
            title="Show emails in collapsible group cards"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 4, verticalAlign: 'middle'}}><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
            Grouped
          </button>
        </div>
      </div>

      {userGroups.length > 0 && (
        <div className="inbox-sidebar__groups">
          <span className="inbox-sidebar__groups-label">Your Groups</span>
          {userGroups.map((g) => {
            const isDefault = DEFAULT_GROUP_NAMES.some((n) => n.toLowerCase() === (g.name || '').toLowerCase())
            return (
              <div key={g.id} className="inbox-sidebar__group-item">
                <span
                  className="inbox-sidebar__group-dot"
                  style={{ backgroundColor: g.color || '#5f6368' }}
                />
                <span className="inbox-sidebar__group-name">{g.name}</span>
                {/* Action buttons for non-default groups */}
                {!isDefault && (
                  <div className="inbox-sidebar__group-actions">
                    {onEditGroup && (
                      <button
                        type="button"
                        className="inbox-sidebar__group-btn"
                        title={`Edit ${g.name}`}
                        aria-label={`Edit ${g.name}`}
                        onClick={() => onEditGroup(g)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                      </button>
                    )}
                    {onDeleteGroup && (
                      <button
                        type="button"
                        className="inbox-sidebar__group-btn inbox-sidebar__group-btn--danger"
                        title={`Delete ${g.name}`}
                        aria-label={`Delete ${g.name}`}
                        onClick={() => onDeleteGroup(g)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {userGroups.length === 0 && (
        <div className="inbox-sidebar__hint">
          <p className="inbox-sidebar__hint-text">
            No groups yet. Use the chatbot to create custom email groups.
          </p>
          <p className="inbox-sidebar__hint-example">
            Try: "Create a group for university emails"
          </p>
        </div>
      )}
    </aside>
  )
}

export default InboxSidebar
