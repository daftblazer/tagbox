import { inputStyle } from '../styles'
import { ACTIVE_TEXT_ON_ACCENT, type Palette } from '../theme'
import type { ViewMode } from '../types'

interface Props {
  pal: Palette
  accent: string
  libraryName: string
  selectedArtistName: string | null
  onBackToArtists: () => void
  search: string
  onSearchChange: (v: string) => void
  viewMode: ViewMode
  onSetViewMode: (m: ViewMode) => void
  selectMode: boolean
  onToggleSelectMode: () => void
}

const TABS: { key: ViewMode; label: string }[] = [
  { key: 'artists', label: 'Artists' },
  { key: 'albums', label: 'Albums' },
  { key: 'folders', label: 'Folders' },
]

export function Toolbar({
  pal, accent, libraryName, selectedArtistName, onBackToArtists, search, onSearchChange,
  viewMode, onSetViewMode, selectMode, onToggleSelectMode,
}: Props) {
  return (
    <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: `1px solid ${pal.headerBorder}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, minWidth: 0 }}>
        <span onClick={onBackToArtists} style={{ color: pal.textSecondary, cursor: 'pointer' }}>
          {libraryName}
        </span>
        {selectedArtistName && (
          <>
            <span style={{ color: pal.textFainter }}>/</span>
            <span style={{ color: pal.textPrimary, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedArtistName}
            </span>
          </>
        )}
      </div>

      <div style={{ flex: 1 }} />

      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search artists, albums…"
        style={{ ...inputStyle(pal), width: 220 }}
      />

      <div style={{ display: 'flex', background: pal.tabBarBg, border: `1px solid ${pal.tabBarBorder}`, borderRadius: 7, padding: 2 }}>
        {TABS.map((tab) => {
          const active = viewMode === tab.key
          return (
            <div
              key={tab.key}
              onClick={() => onSetViewMode(tab.key)}
              style={{
                padding: '6px 12px', fontSize: 12.5, borderRadius: 5, cursor: 'pointer',
                background: active ? accent : 'transparent', color: active ? ACTIVE_TEXT_ON_ACCENT : pal.textSecondary,
              }}
            >
              {tab.label}
            </div>
          )
        })}
      </div>

      <div
        onClick={onToggleSelectMode}
        style={{
          fontSize: 12.5, padding: '7px 13px', borderRadius: 7, cursor: 'pointer',
          border: `1px solid ${selectMode ? accent : pal.inputBorder}`,
          background: selectMode ? accent : 'transparent',
          color: selectMode ? ACTIVE_TEXT_ON_ACCENT : pal.textSecondary,
        }}
      >
        {selectMode ? 'Done' : 'Select'}
      </div>
    </div>
  )
}
