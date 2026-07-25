import { useState } from 'react'
import { inputStyle } from '../styles'
import type { Palette } from '../theme'

interface Props {
  genres: string[]
  onAdd: (genre: string) => void
  onRemove: (genre: string) => void
  pal: Palette
  placeholder?: string
}

export function GenreEditor({ genres, onAdd, onRemove, pal, placeholder }: Props) {
  const [input, setInput] = useState('')

  function commit() {
    const v = input.trim()
    if (!v) return
    onAdd(v)
    setInput('')
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {genres.map((g) => (
          <div
            key={g}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5,
              padding: '4px 6px 4px 10px', background: pal.chipBg, borderRadius: 100,
            }}
          >
            <span>{g}</span>
            <span onClick={() => onRemove(g)} style={{ cursor: 'pointer', color: pal.textMuted, fontSize: 13, lineHeight: 1 }}>
              ×
            </span>
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
        }}
        placeholder={placeholder ?? 'Type a genre and press Enter'}
        style={inputStyle(pal)}
      />
    </div>
  )
}
