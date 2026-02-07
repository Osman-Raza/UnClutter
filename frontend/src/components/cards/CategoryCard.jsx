import EmailPreview from '../email/EmailPreview'

function CategoryCard({
  categoryName,
  description,
  emailCount,
  emails = [],
  selectedEmailId,
  onSelectEmail,
  showKeywordChips = true,
  labelColorClass = '',
}) {
  return (
    <div className={`category-card ${labelColorClass}`}>
      <div className="category-card__header">
        <h3 className="category-card__name">{categoryName}</h3>
        <span className="category-card__count">{emailCount}</span>
      </div>
      {description && (
        <p className="category-card__description">{description}</p>
      )}
      <div className="category-card__emails">
        {emails.map((email) => (
          <EmailPreview
            key={email.id}
            email={email}
            isSelected={selectedEmailId === email.id}
            onClick={onSelectEmail}
            showKeywordChips={showKeywordChips}
          />
        ))}
      </div>
    </div>
  )
}

export default CategoryCard
