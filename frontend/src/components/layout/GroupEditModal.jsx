import { useState } from 'react'

const COLOR_OPTIONS = [
  '#1a73e8', '#34a853', '#f9ab00', '#ea4335', '#5f6368',
  '#9334e6', '#e8710a', '#137333', '#185abc', '#c5221f',
]

function GroupEditModal({ group, onSave, onCancel }) {
  const [name, setName] = useState(group?.name || '')
  const [description, setDescription] = useState(group?.description || '')
  const [color, setColor] = useState(group?.color || '#1a73e8')
  const [keywords, setKeywords] = useState(
    (group?.match_keywords || []).join(', ')
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave?.({
        name: name.trim(),
        description: description.trim(),
        color,
        match_keywords: keywords
          .split(',')
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Edit group">
        <div className="modal__header">
          <h3 className="modal__title">{group ? 'Edit Group' : 'New Group'}</h3>
          <button type="button" className="modal__close" onClick={onCancel} aria-label="Close">&times;</button>
        </div>
        <div className="modal__body">
          <label className="modal__field">
            <span className="modal__label">Name</span>
            <input
              type="text"
              className="modal__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              autoFocus
            />
          </label>
          <label className="modal__field">
            <span className="modal__label">Description</span>
            <input
              type="text"
              className="modal__input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
            />
          </label>
          <label className="modal__field">
            <span className="modal__label">Keywords (comma-separated)</span>
            <textarea
              className="modal__input modal__textarea"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="meeting, deadline, project"
              rows={3}
            />
          </label>
          <div className="modal__field">
            <span className="modal__label">Color</span>
            <div className="modal__colors">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`modal__color-swatch ${color === c ? 'modal__color-swatch--active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="modal__footer">
          <button type="button" className="modal__btn modal__btn--secondary" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className="modal__btn modal__btn--primary"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default GroupEditModal
