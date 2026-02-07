function Sidebar() {
  const categories = [
    'University',
    'Action Items',
    'Promotions',
    'Unsorted',
  ]

  return (
    <aside className="sidebar">
      <ul className="sidebar__list">
        {categories.map((name) => (
          <li key={name} className="sidebar__item">
            {name}
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default Sidebar
