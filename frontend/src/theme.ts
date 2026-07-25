export type ThemeName = 'dark' | 'light'

export interface Palette {
  appBg: string
  sidebarBg: string
  sidebarBorder: string
  cardBg: string
  cardBorder: string
  nestedPanelBg: string
  nestedPanelBorder: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  textMuted2: string
  textFaint: string
  textFainter: string
  inputBg: string
  inputBorder: string
  chipBg: string
  chipText: string
  overlayBg: string
  drawerBg: string
  drawerBorder: string
  headerBorder: string
  divider: string
  shadow: string
  tabBarBg: string
  tabBarBorder: string
  dashedBorder: string
  checkboxBorderDefault: string
  selectBoxDefault: string
}

export const PALETTES: Record<ThemeName, Palette> = {
  dark: {
    appBg: 'oklch(19% 0.012 250)', sidebarBg: 'oklch(16% 0.012 250)', sidebarBorder: 'oklch(30% 0.014 250)',
    cardBg: 'oklch(22% 0.012 250)', cardBorder: 'oklch(29% 0.012 250)',
    nestedPanelBg: 'oklch(21% 0.012 250)', nestedPanelBorder: 'oklch(28% 0.012 250)',
    textPrimary: 'oklch(93% 0.005 250)', textSecondary: 'oklch(78% 0.008 250)', textMuted: 'oklch(60% 0.01 250)',
    textMuted2: 'oklch(65% 0.01 250)', textFaint: 'oklch(55% 0.01 250)', textFainter: 'oklch(50% 0.01 250)',
    inputBg: 'oklch(24% 0.012 250)', inputBorder: 'oklch(33% 0.012 250)',
    chipBg: 'oklch(27% 0.014 250)', chipText: 'oklch(75% 0.01 250)',
    overlayBg: 'oklch(10% 0.01 250 / 0.55)', drawerBg: 'oklch(20% 0.012 250)', drawerBorder: 'oklch(32% 0.012 250)',
    headerBorder: 'oklch(28% 0.012 250)', divider: 'oklch(26% 0.012 250)', shadow: 'oklch(10% 0.01 250 / 0.4)',
    tabBarBg: 'oklch(23% 0.012 250)', tabBarBorder: 'oklch(32% 0.012 250)', dashedBorder: 'oklch(32% 0.012 250)',
    checkboxBorderDefault: 'oklch(60% 0.01 250)', selectBoxDefault: 'oklch(20% 0.01 250 / 0.6)',
  },
  light: {
    appBg: 'oklch(98% 0.004 250)', sidebarBg: 'oklch(96% 0.005 250)', sidebarBorder: 'oklch(88% 0.006 250)',
    cardBg: 'oklch(100% 0 0)', cardBorder: 'oklch(89% 0.006 250)',
    nestedPanelBg: 'oklch(94% 0.006 250)', nestedPanelBorder: 'oklch(88% 0.006 250)',
    textPrimary: 'oklch(22% 0.01 250)', textSecondary: 'oklch(38% 0.012 250)', textMuted: 'oklch(50% 0.012 250)',
    textMuted2: 'oklch(45% 0.012 250)', textFaint: 'oklch(55% 0.01 250)', textFainter: 'oklch(60% 0.01 250)',
    inputBg: 'oklch(100% 0 0)', inputBorder: 'oklch(83% 0.008 250)',
    chipBg: 'oklch(92% 0.008 250)', chipText: 'oklch(40% 0.012 250)',
    overlayBg: 'oklch(25% 0.01 250 / 0.3)', drawerBg: 'oklch(99% 0.003 250)', drawerBorder: 'oklch(87% 0.006 250)',
    headerBorder: 'oklch(89% 0.006 250)', divider: 'oklch(91% 0.005 250)', shadow: 'oklch(35% 0.01 250 / 0.14)',
    tabBarBg: 'oklch(93% 0.006 250)', tabBarBorder: 'oklch(85% 0.006 250)', dashedBorder: 'oklch(82% 0.008 250)',
    checkboxBorderDefault: 'oklch(60% 0.01 250)', selectBoxDefault: 'oklch(100% 0 0 / 0.75)',
  },
}

export const ACTIVE_TEXT_ON_ACCENT = 'oklch(15% 0.01 250)'

function hueForLibrary(libraryId: string): number {
  let hash = 0
  for (const ch of libraryId) hash = (hash * 31 + ch.charCodeAt(0)) % 360
  return hash
}

/** Deterministic accent hue per library id, so any number of libraries (not just two) get a stable, distinct color. */
export function accentForLibrary(libraryId: string): string {
  return `oklch(68% 0.13 ${hueForLibrary(libraryId)})`
}

export function accentBgForLibrary(libraryId: string, alpha = 0.16): string {
  return `oklch(68% 0.13 ${hueForLibrary(libraryId)} / ${alpha})`
}
