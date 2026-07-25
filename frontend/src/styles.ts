import type { CSSProperties } from 'react'
import type { Palette } from './theme'

export const inputStyle = (pal: Palette): CSSProperties => ({
  width: '100%',
  background: pal.inputBg,
  border: `1px solid ${pal.inputBorder}`,
  borderRadius: 6,
  padding: '7px 9px',
  fontSize: 13,
  color: 'inherit',
  outline: 'none',
  fontFamily: 'inherit',
})

export const fieldLabelStyle = (pal: Palette): CSSProperties => ({
  fontSize: 10.5,
  color: pal.textFaint,
  marginBottom: 4,
})

export const buttonStyle = (pal: Palette, variant: 'primary' | 'default', accent: string, accentText: string): CSSProperties =>
  variant === 'primary'
    ? { flex: 1, textAlign: 'center', padding: 9, borderRadius: 7, fontSize: 13, cursor: 'pointer', background: accent, color: accentText, fontWeight: 600, border: 'none' }
    : { flex: 1, textAlign: 'center', padding: 9, borderRadius: 7, fontSize: 13, cursor: 'pointer', border: `1px solid ${pal.inputBorder}`, color: pal.textSecondary, background: 'transparent' }
