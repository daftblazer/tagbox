import { useEffect, useRef, useState } from 'react'
import { inputStyle } from '../styles'
import type { Palette } from '../theme'

interface Props {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  pal: Palette
  placeholder?: string
}

const MAX_SUGGESTIONS = 8

function rankedMatches(value: string, suggestions: string[]): string[] {
  const q = value.trim().toLowerCase()
  const pool = q ? suggestions.filter((s) => s.toLowerCase().includes(q)) : suggestions
  return [...pool]
    .sort((a, b) => {
      const aLower = a.toLowerCase()
      const bLower = b.toLowerCase()
      const aExact = aLower === q
      const bExact = bLower === q
      if (aExact !== bExact) return aExact ? -1 : 1
      const aStarts = aLower.startsWith(q)
      const bStarts = bLower.startsWith(q)
      if (aStarts !== bStarts) return aStarts ? -1 : 1
      return a.localeCompare(b)
    })
    .slice(0, MAX_SUGGESTIONS)
}

/** Text input with an autocomplete dropdown of existing artist-name-like strings,
 * so picking an existing artist doesn't accidentally create a case-variant duplicate. */
export function ArtistCombobox({ value, onChange, suggestions, pal, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const matches = rankedMatches(value, suggestions)

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  function select(name: string) {
    onChange(name)
    setOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setHighlight(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setHighlight((h) => Math.min(h + 1, matches.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlight((h) => Math.max(h - 1, 0))
          } else if (e.key === 'Enter') {
            if (open && matches[highlight]) {
              e.preventDefault()
              select(matches[highlight])
            }
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        style={inputStyle(pal)}
      />
      {open && matches.length > 0 && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
            background: pal.cardBg, border: `1px solid ${pal.inputBorder}`, borderRadius: 7,
            boxShadow: `0 8px 24px ${pal.shadow}`, maxHeight: 180, overflowY: 'auto', padding: 4,
          }}
        >
          {matches.map((name, i) => (
            <div
              key={name}
              onMouseDown={(e) => {
                e.preventDefault()
                select(name)
              }}
              onMouseEnter={() => setHighlight(i)}
              style={{
                padding: '6px 8px', fontSize: 12.5, borderRadius: 5, cursor: 'pointer',
                background: i === highlight ? pal.nestedPanelBg : 'transparent', color: pal.textPrimary,
              }}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
