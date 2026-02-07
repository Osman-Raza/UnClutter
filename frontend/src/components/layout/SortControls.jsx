function SortControls({
  sortRange = 'Last 7 days',
  onSortRangeChange,
  sortBy = 'date',
  onSortByChange,
  sortOrder = 'newest',
  onSortOrderChange,
  showKeywordChips = true,
  onShowKeywordChipsChange,
  onRunSort,
}) {
  const isDateSort = sortBy === 'date'
  return (
    <div className="sort-controls">
      <label className="sort-controls__label">
        Sort range
        <select
          className="sort-controls__select"
          value={sortRange}
          onChange={(e) => onSortRangeChange?.(e.target.value)}
        >
          <option value="Last 7 days">Last 7 days</option>
          <option value="Last 30 days">Last 30 days</option>
          <option value="Last 90 days">Last 90 days</option>
          <option value="All time">All time</option>
        </select>
      </label>
      <label className="sort-controls__label">
        Sort by
        <select
          className="sort-controls__select"
          value={sortBy}
          onChange={(e) => onSortByChange?.(e.target.value)}
        >
          <option value="date">Date</option>
          <option value="sender">Sender</option>
          <option value="subject">Subject</option>
        </select>
      </label>
      <label className="sort-controls__label">
        Order
        <select
          className="sort-controls__select"
          value={
            isDateSort
              ? (sortOrder === 'newest' || sortOrder === 'oldest' ? sortOrder : 'newest')
              : (sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : 'asc')
          }
          onChange={(e) => onSortOrderChange?.(e.target.value)}
        >
          {isDateSort ? (
            <>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </>
          ) : (
            <>
              <option value="asc">A–Z</option>
              <option value="desc">Z–A</option>
            </>
          )}
        </select>
      </label>
      <label className="sort-controls__toggle-label">
        <input
          type="checkbox"
          className="sort-controls__toggle"
          checked={showKeywordChips}
          onChange={(e) => onShowKeywordChipsChange?.(e.target.checked)}
        />
        Show keyword chips
      </label>
      <button type="button" className="sort-controls__btn" onClick={onRunSort}>
        Run Sorting
      </button>
    </div>
  )
}

export default SortControls
