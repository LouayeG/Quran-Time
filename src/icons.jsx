import React from 'react'

const PATHS = {
  book: 'M4 5a2 2 0 0 1 2-2h9a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 3V5Zm14 14v2H7a1 1 0 0 0 0 2h11a2 2 0 0 0 2-2V5',
  headphones: 'M4 13v-1a8 8 0 0 1 16 0v1m0 0v4a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2Zm-16 0a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2v-2Z',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.3 7.3 0 0 0-2-1.2L14.5 2h-4L10 5a7.3 7.3 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.3 7.3 0 0 0 2 1.2l.5 3h4l.5-3a7.3 7.3 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2Z',
  play: 'M7 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 7 5.5Z',
  pause: 'M8 5h3v14H8zM13 5h3v14h-3z',
  prev: 'M18 5v14L8 12l10-7ZM6 5v14',
  next: 'M6 5v14l10-7L6 5ZM18 5v14',
  chevron: 'M15 6l-6 6 6 6',
  search: 'M11 4a7 7 0 1 0 4.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4Z',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0-5v2m0 16v2m10-10h-2M4 12H2m15.5-6.5-1.4 1.4M6.9 17.1l-1.4 1.4m12.6 0-1.4-1.4M6.9 6.9 5.5 5.5',
  moon: 'M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z',
  caret: 'M6 9l6 6 6-6',
  check: 'M20 6 9 17l-5-5',
}

const FILLED = new Set(['play', 'pause', 'book'])

export function Icon({ name, size = 22 }) {
  const path = PATHS[name]
  if (!path) return null
  const filled = FILLED.has(name)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} />
    </svg>
  )
}
