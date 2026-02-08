import { useState, useEffect, useRef, useCallback } from 'react'

function CategoryTabs({ tabs = [], activeTab, onTabChange }) {
  const scrollRef = useRef(null)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setShowLeft(scrollLeft > 2)
    setShowRight(scrollLeft + clientWidth < scrollWidth - 2)
  }, [])

  // Re-check whenever tabs change or on mount
  useEffect(() => {
    checkScroll()
    // Small delay to let DOM settle after tab render
    const t = setTimeout(checkScroll, 100)
    return () => clearTimeout(t)
  }, [tabs, checkScroll])

  // Listen for scroll + resize
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    // Also use ResizeObserver for the container itself
    let ro
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(checkScroll)
      ro.observe(el)
    }
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
      ro?.disconnect()
    }
  }, [checkScroll])

  const scrollBy = useCallback((delta) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' })
  }, [])

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (!scrollRef.current || !activeTab) return
    const activeEl = scrollRef.current.querySelector('[aria-selected="true"]')
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [activeTab])

  return (
    <div className="category-tabs-wrapper">
      {/* Left arrow */}
      <button
        type="button"
        className={`category-tabs-wrapper__arrow ${showLeft ? 'category-tabs-wrapper__arrow--visible' : ''}`}
        onClick={() => scrollBy(-200)}
        aria-label="Scroll tabs left"
        tabIndex={-1}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </button>

      {/* Fade gradients */}
      <div className={`category-tabs-wrapper__fade category-tabs-wrapper__fade--left ${showLeft ? 'category-tabs-wrapper__fade--visible' : ''}`} />
      <div className={`category-tabs-wrapper__fade category-tabs-wrapper__fade--right ${showRight ? 'category-tabs-wrapper__fade--visible' : ''}`} />

      {/* Scrollable tabs */}
      <div className="category-tabs" role="tablist" ref={scrollRef}>
        {tabs.map(({ id, label, count, color }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            className={`category-tabs__tab ${activeTab === id ? 'category-tabs__tab--active' : ''}`}
            onClick={() => onTabChange?.(id)}
            style={activeTab === id ? { '--tab-color': color || '#1a73e8' } : undefined}
          >
            <span className="category-tabs__label">{label}</span>
            {count > 0 && (
              <span className="category-tabs__badge">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Right arrow */}
      <button
        type="button"
        className={`category-tabs-wrapper__arrow ${showRight ? 'category-tabs-wrapper__arrow--visible' : ''}`}
        onClick={() => scrollBy(200)}
        aria-label="Scroll tabs right"
        tabIndex={-1}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
        </svg>
      </button>
    </div>
  )
}

export default CategoryTabs
