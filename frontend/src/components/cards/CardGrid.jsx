import { categories } from '../../utils/dummyData'
import CategoryCard from './CategoryCard'

function CardGrid() {
  return (
    <div className="card-grid">
      {categories.map((cat) => (
        <CategoryCard
          key={cat.id}
          categoryName={cat.name}
          emailCount={cat.emails.length}
          emails={cat.emails}
        />
      ))}
    </div>
  )
}

export default CardGrid
