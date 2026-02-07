function TopBar() {
  return (
    <header className="top-bar">
      <div className="top-bar__app-name">UnClutter</div>
      <input
        type="search"
        className="top-bar__search"
        placeholder="Search..."
        readOnly
      />
    </header>
  )
}

export default TopBar
