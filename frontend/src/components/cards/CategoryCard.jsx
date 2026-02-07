import EmailPreview from '../email/EmailPreview'

function CategoryCard({ categoryName, emailCount, emails }) {
  return (
    <div className="category-card">
      <div className="category-card__header">
        <h3 className="category-card__name">{categoryName}</h3>
        <span className="category-card__count">{emailCount}</span>
      </div>
      <div className="category-card__emails">
        {emails?.map((email) => (
          <EmailPreview key={email.id} email={email} />
        ))}
      </div>
    </div>
  )
}

export default CategoryCard
