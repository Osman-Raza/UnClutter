import TopBar from './TopBar'
import Sidebar from './Sidebar'
import '../styles/home.css'

function MainLayout({ children }) {
  return (
    <div className="main-layout">
      <TopBar />
      <Sidebar />
      <main className="main-layout__content">{children}</main>
    </div>
  )
}

export default MainLayout
