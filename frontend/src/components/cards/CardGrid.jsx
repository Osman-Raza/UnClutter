import CategoryCard from './CategoryCard'

function CardGrid({
  categoriesWithEmails = [],
  selectedEmailId,
  onSelectEmail,
  showKeywordChips = true,
  isSearchResults = false,
}) {
  return (
    <div className="card-grid-wrap">
      {isSearchResults && (
        <h2 className="card-grid__results-heading">Search Results</h2>
      )}
      <div className="card-grid">
        {categoriesWithEmails.map(({ category, emails }) => (
          <CategoryCard
            key={category.id}
            categoryName={category.title}
            description={category.description}
            emailCount={emails.length}
            emails={emails}
            selectedEmailId={selectedEmailId}
            onSelectEmail={onSelectEmail}
            showKeywordChips={showKeywordChips}
            labelColorClass={`category-card--${category.id}`}
          />
        ))}
      </div>
    </div>
  )
}

export default CardGrid
