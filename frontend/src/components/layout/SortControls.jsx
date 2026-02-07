function SortControls({
  sortRange = 'Last 7 days',
  onSortRangeChange,
  showKeywordChips = true,
  onShowKeywordChipsChange,
  onRunSort,
}) {
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
