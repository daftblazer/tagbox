import { useEffect, useState } from 'react'
import { api } from '../api'
import { fieldLabelStyle, inputStyle } from '../styles'
import { ACTIVE_TEXT_ON_ACCENT, type Palette } from '../theme'
import type { BrowseResult, Library } from '../types'

interface Props {
  pal: Palette
  accent: string
  onClose: () => void
  onCreated: (lib: Library) => void
}

export function AddLibraryModal({ pal, accent, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [browsePath, setBrowsePath] = useState('')
  const [result, setResult] = useState<BrowseResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .browseMediaRoot(browsePath)
      .then((r) => !cancelled && setResult(r))
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [browsePath])

  async function handleCreate() {
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const lib = await api.createLibrary(name.trim(), browsePath)
      onCreated(lib)
    } catch (e) {
      setError(String(e))
    } finally {
      setCreating(false)
    }
  }

  const canCreate = name.trim().length > 0 && !creating
  const displayPath = '/' + browsePath

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: pal.overlayBg, zIndex: 12 }} />
      <div
        style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 13,
          width: 440, maxWidth: '90vw', background: pal.drawerBg, border: `1px solid ${pal.drawerBorder}`,
          borderRadius: 12, boxShadow: `0 20px 60px ${pal.shadow}`, padding: 22,
        }}
      >
        <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>Add library</div>
        <div style={{ fontSize: 11.5, color: pal.textFaint, marginBottom: 16 }}>
          Navigate to a folder under the mounted media root, then add it as a library.
        </div>

        {error && <div style={{ fontSize: 12.5, color: 'oklch(65% 0.19 25)', marginBottom: 12 }}>{error}</div>}

        <div style={{ marginBottom: 14 }}>
          <div style={fieldLabelStyle(pal)}>NAME</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Video Game Music" style={inputStyle(pal)} />
        </div>

        <div style={{ ...fieldLabelStyle(pal), marginBottom: 6 }}>ROOT FOLDER</div>
        <div
          style={{
            fontSize: 11.5, fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", color: pal.textSecondary,
            background: pal.nestedPanelBg, border: `1px solid ${pal.nestedPanelBorder}`, borderRadius: 6,
            padding: '6px 9px', marginBottom: 8, wordBreak: 'break-all',
          }}
        >
          {displayPath}
        </div>

        <div style={{ border: `1px solid ${pal.cardBorder}`, borderRadius: 8, maxHeight: 220, overflowY: 'auto', marginBottom: 16 }}>
          {loading && <div style={{ fontSize: 12.5, color: pal.textFaint, padding: '10px 12px' }}>Loading…</div>}

          {!loading && result && (
            <>
              {result.parent_path !== null && (
                <div
                  onClick={() => setBrowsePath(result.parent_path!)}
                  style={{ padding: '8px 12px', fontSize: 12.5, cursor: 'pointer', color: pal.textSecondary, borderBottom: `1px solid ${pal.divider}` }}
                >
                  .. (up)
                </div>
              )}
              {result.entries.length === 0 && (
                <div style={{ padding: '10px 12px', fontSize: 12.5, color: pal.textFaint }}>No subfolders here.</div>
              )}
              {result.entries.map((entry) => (
                <div
                  key={entry.path}
                  onClick={() => setBrowsePath(entry.path)}
                  style={{
                    padding: '8px 12px', fontSize: 12.5, cursor: 'pointer', color: pal.textPrimary,
                    borderBottom: `1px solid ${pal.divider}`,
                  }}
                >
                  {entry.name}/
                </div>
              ))}
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div
            onClick={onClose}
            style={{
              flex: 1, textAlign: 'center', padding: 9, borderRadius: 7, fontSize: 13, cursor: 'pointer',
              border: `1px solid ${pal.inputBorder}`, color: pal.textSecondary,
            }}
          >
            Cancel
          </div>
          <div
            onClick={canCreate ? handleCreate : undefined}
            style={{
              flex: 1, textAlign: 'center', padding: 9, borderRadius: 7, fontSize: 13, cursor: canCreate ? 'pointer' : 'default',
              background: accent, color: ACTIVE_TEXT_ON_ACCENT, fontWeight: 600, opacity: canCreate ? 1 : 0.6,
            }}
          >
            {creating ? 'Adding…' : 'Add library'}
          </div>
        </div>
      </div>
    </>
  )
}
