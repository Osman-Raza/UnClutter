import TopBar from './TopBar'
import '../../styles/home.css'

function MainLayout({
  children,
  searchQuery = '',
  onSearchChange,
  onRunSort,
  user = null,
  onLogout,
  syncing = false,
  lastSynced,
  chatOpen = false,
  onToggleChat,
  onToggleSidebar,
  sidebarCollapsed = false,
}) {
  return (
    <div className="main-layout">
      <TopBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onRunSort={onRunSort}
        user={user}
        onLogout={onLogout}
        syncing={syncing}
        lastSynced={lastSynced}
        chatOpen={chatOpen}
        onToggleChat={onToggleChat}
        onToggleSidebar={onToggleSidebar}
        sidebarCollapsed={sidebarCollapsed}
      />
      <main className="main-layout__content">{children}</main>
    </div>
  )
}

export default MainLayout
