import React, { useEffect, useRef, useState } from 'react'
import { Icon } from './icons'

// Accessible, animated replacement for a grouped <select>.
// `groups` = [{ label, items: [{ id, name }] }]
export function Dropdown({ groups, value, onChange, placeholder = 'اختر', direction = 'up' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  const items = groups.flatMap((g) => g.items)
  const selected = items.find((i) => i.id === value)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (id) => {
    onChange(id)
    setOpen(false)
  }

  return (
    <div className={`dropdown ${open ? 'open' : ''} dir-${direction}`} ref={rootRef}>
      <button
        type="button"
        className="dropdownTrigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="dropdownValue">{selected ? selected.name : placeholder}</span>
        <span className="dropdownCaret">
          <Icon name="caret" size={18} />
        </span>
      </button>

      <div className="dropdownPanel" role="listbox" aria-label="القارئ">
        {groups.map((group) => (
          <div className="dropdownGroup" key={group.label}>
            <div className="dropdownGroupLabel">{group.label}</div>
            {group.items.map((item) => {
              const isActive = item.id === value
              return (
                <button
                  type="button"
                  key={item.id}
                  role="option"
                  aria-selected={isActive}
                  className={`dropdownOption ${isActive ? 'selected' : ''}`}
                  onClick={() => pick(item.id)}
                >
                  <span>{item.name}</span>
                  {isActive && <Icon name="check" size={16} />}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
