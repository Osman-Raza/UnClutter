import { useState, useMemo } from 'react'
import MainLayout from '../components/layout/MainLayout'
import SortControls from '../components/layout/SortControls'
import CardGrid from '../components/cards/CardGrid'
import EmailDetail from '../components/email/EmailDetail'
import ChatbotSidebar from '../components/layout/ChatbotSidebar'
import {
  categories,
  emails,
  getEmailsByCategory,
  getEmailById,
} from '../utils/dummyData'
import '../styles/home.css'

function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmailId, setSelectedEmailId] = useState(null)
  const [sortRange, setSortRange] = useState('Last 7 days')
  const [showKeywordChips, setShowKeywordChips] = useState(true)
  const [isSortingRunning, setIsSortingRunning] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return emails
    const q = searchQuery.trim().toLowerCase()
    return emails.filter(
      (e) =>
        e.sender.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        (e.snippet && e.snippet.toLowerCase().includes(q)) ||
        (e.body && e.body.toLowerCase().includes(q))
    )
  }, [searchQuery])

  const categoriesWithEmails = useMemo(() => {
    if (!searchQuery.trim()) {
      const byCat = getEmailsByCategory()
      return categories.map((cat) => ({
        category: cat,
        emails: byCat[cat.id] || [],
      }))
    }
    const byCategoryId = {}
    filteredEmails.forEach((email) => {
      const cat = categories.find((c) => c.id === email.categoryId)
      if (cat) {
        if (!byCategoryId[cat.id]) byCategoryId[cat.id] = { category: cat, emails: [] }
        byCategoryId[cat.id].emails.push(email)
      }
    })
    return Object.values(byCategoryId)
  }, [searchQuery, filteredEmails])

  const selectedEmail = selectedEmailId ? getEmailById(selectedEmailId) : null

  const handleRunSort = () => {
    setIsSortingRunning(true)
    setTimeout(() => setIsSortingRunning(false), 1500)
  }

  return (
    <MainLayout
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onRunSort={handleRunSort}
    >
      {isSortingRunning && (
        <div className="sorting-banner" role="status">
          Sorting your inbox…
        </div>
      )}
      <div className={`dashboard ${chatOpen ? 'dashboard--chat-open' : ''}`}>
        <div className="dashboard__left">
          <button type="button" className="compose-btn">
            Run Sort
          </button>
          <SortControls
            sortRange={sortRange}
            onSortRangeChange={setSortRange}
            showKeywordChips={showKeywordChips}
            onShowKeywordChipsChange={setShowKeywordChips}
            onRunSort={handleRunSort}
          />
          <div className="dashboard__cards-scroll">
            <CardGrid
              categoriesWithEmails={categoriesWithEmails}
              selectedEmailId={selectedEmailId}
              onSelectEmail={(email) => setSelectedEmailId(email?.id ?? null)}
              showKeywordChips={showKeywordChips}
              isSearchResults={!!searchQuery.trim()}
            />
          </div>
        </div>
        <div className="dashboard__center">
          {selectedEmail ? (
            <EmailDetail
              email={selectedEmail}
              onBack={() => setSelectedEmailId(null)}
            />
          ) : (
            <div className="email-detail-empty">
              <p>Select an email to view details</p>
            </div>
          )}
        </div>
        <div className={`dashboard__right ${!chatOpen ? 'is-closed' : ''}`}>
          <ChatbotSidebar onClose={() => setChatOpen(false)} />
        </div>
      </div>
      <button
        type="button"
        className={`chat-fab ${chatOpen ? 'chat-fab--active' : ''}`}
        onClick={() => setChatOpen((o) => !o)}
        aria-label={chatOpen ? 'Close chat' : 'Open chat'}
      >
        <span className="chat-fab__icon" aria-hidden="true" />
        <span className="chat-fab__label">Chat</span>
      </button>
    </MainLayout>
  )
}

export default Home
