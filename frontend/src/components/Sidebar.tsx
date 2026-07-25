import type { Library } from '../types'
import { accentBgForLibrary, accentForLibrary, type Palette, type ThemeName } from '../theme'

interface Props {
  pal: Palette
  theme: ThemeName
  onToggleTheme: () => void
  libraries: Library[]
  libraryId: string | null
  currentLibrary: Library | null
  onSelectLibrary: (id: string) => void
  onRescan: () => void
  rescanning: boolean
  onOrganizeLooseFiles: () => void
}

export function Sidebar({
  pal, theme, onToggleTheme, libraries, libraryId, currentLibrary, onSelectLibrary, onRescan, rescanning,
  onOrganizeLooseFiles,
}: Props) {
  return (
    <div
      style={{
        width: 230, flex: 'none', background: pal.sidebarBg, borderRight: `1px solid ${pal.sidebarBorder}`,
        display: 'flex', flexDirection: 'column', padding: '18px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', padding: '0 4px 2px' }}>Tagbox</div>
          <div style={{ fontSize: 11.5, color: pal.textMuted, padding: '0 4px 20px' }}>self-hosted tag editor</div>
        </div>
        <div
          onClick={onToggleTheme}
          title="Toggle light/dark"
          style={{
            cursor: 'pointer', width: 28, height: 28, flex: 'none', borderRadius: 7,
            border: `1px solid ${pal.inputBorder}`, background: pal.cardBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
          }}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </div>
      </div>

      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.08em', color: pal.textFaint, padding: '0 4px 8px' }}>
        LIBRARIES
      </div>

      {libraries.length === 0 && (
        <div style={{ fontSize: 11.5, color: pal.textFaint, padding: '0 4px 8px', lineHeight: 1.5 }}>
          No libraries configured yet.
        </div>
      )}

      {libraries.map((lib) => {
        const active = lib.id === libraryId
        return (
          <div
            key={lib.id}
            onClick={() => onSelectLibrary(lib.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 7,
              cursor: 'pointer', marginBottom: 2, background: active ? accentBgForLibrary(lib.id) : 'transparent',
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: accentForLibrary(lib.id) }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13, fontWeight: active ? 700 : 500, color: active ? pal.textPrimary : pal.textSecondary,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {lib.name}
              </div>
            </div>
            <div style={{ fontSize: 11, color: pal.textFaint }}>{lib.album_count} albums</div>
          </div>
        )
      })}

      {currentLibrary && (
        <div
          style={{
            marginTop: 14, padding: '10px 10px', background: pal.nestedPanelBg, borderRadius: 7,
            border: `1px solid ${pal.nestedPanelBorder}`,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', color: pal.textFaint, marginBottom: 4 }}>
            ROOT FOLDER
          </div>
          <div
            style={{
              fontSize: 11.5, fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", color: pal.textSecondary,
              wordBreak: 'break-all', lineHeight: 1.5, marginBottom: 8,
            }}
          >
            {currentLibrary.path}
          </div>
          <div onClick={onRescan} style={{ fontSize: 11.5, color: pal.textSecondary, cursor: 'pointer', marginBottom: 6 }}>
            {rescanning ? 'Rescanning…' : '↻ Rescan library'}
          </div>
          <div onClick={onOrganizeLooseFiles} style={{ fontSize: 11.5, color: pal.textSecondary, cursor: 'pointer' }}>
            Organize loose files
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />
      <div
        style={{
          fontSize: 12, color: pal.textFainter, padding: '9px 10px', border: `1px dashed ${pal.dashedBorder}`,
          borderRadius: 7, textAlign: 'center', cursor: 'default',
        }}
        title="Add libraries by editing config/libraries.yaml and restarting the server"
      >
        + Add library
      </div>
    </div>
  )
}
