function SortControls({
  sortRange = 'All time',
  onSortRangeChange,
  emailCount = 0,
  totalCount = 0,
}) {
  return (
    <div className="sort-controls">
      <label className="sort-controls__label">
        <span className="sort-controls__text">Date range</span>
        <select
          className="sort-controls__select"
          value={sortRange}
          onChange={(e) => onSortRangeChange?.(e.target.value)}
          aria-label="Date range"
        >
          <option value="All time">All time</option>
          <option value="Last 7 days">Last 7 days</option>
          <option value="Last 30 days">Last 30 days</option>
          <option value="Last 90 days">Last 90 days</option>
        </select>
      </label>
      <span className="sort-controls__count">
        {sortRange !== 'All time'
          ? `Showing ${emailCount} of ${totalCount} emails`
          : `${emailCount} email${emailCount !== 1 ? 's' : ''}`}
      </span>
      {sortRange !== 'All time' && (
        <button
          type="button"
          className="sort-controls__clear"
          onClick={() => onSortRangeChange?.('All time')}
        >
          View all
        </button>
      )}
    </div>
  )
}

export default SortControls
