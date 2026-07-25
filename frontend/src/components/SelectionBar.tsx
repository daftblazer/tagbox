import { ACTIVE_TEXT_ON_ACCENT, type Palette } from '../theme'

interface Props {
  pal: Palette
  accent: string
  count: number
  onClear: () => void
  onEditTags: () => void
}

export function SelectionBar({ pal, accent, count, onClear, onEditTags }: Props) {
  if (count === 0) return null
  return (
    <div
      style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9,
        display: 'flex', alignItems: 'center', gap: 14, background: pal.cardBg, border: `1px solid ${pal.drawerBorder}`,
        borderRadius: 12, padding: '11px 16px', boxShadow: `0 8px 24px ${pal.shadow}`,
      }}
    >
      <div style={{ fontSize: 13, color: pal.textSecondary }}>{count} selected</div>
      <div onClick={onClear} style={{ fontSize: 12.5, color: pal.textMuted, cursor: 'pointer' }}>Clear</div>
      <div
        onClick={onEditTags}
        style={{ fontSize: 12.5, fontWeight: 600, padding: '8px 15px', borderRadius: 8, background: accent, color: ACTIVE_TEXT_ON_ACCENT, cursor: 'pointer' }}
      >
        Edit tags
      </div>
    </div>
  )
}
