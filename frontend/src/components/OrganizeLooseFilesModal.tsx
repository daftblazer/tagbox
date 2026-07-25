import { useEffect, useState } from 'react'
import { api } from '../api'
import { ACTIVE_TEXT_ON_ACCENT, type Palette } from '../theme'
import type { LooseFile } from '../types'

interface Props {
  libraryId: string
  pal: Palette
  accent: string
  onClose: () => void
  onOrganized: () => void
}

export function OrganizeLooseFilesModal({ libraryId, pal, accent, onClose, onOrganized }: Props) {
  const [files, setFiles] = useState<LooseFile[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [organizedCount, setOrganizedCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .looseFiles(libraryId)
      .then((found) => {
        if (cancelled) return
        setFiles(found)
        setSelected(new Set(found.map((f) => f.relpath)))
      })
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [libraryId])

  function toggle(relpath: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(relpath)) next.delete(relpath)
      else next.add(relpath)
      return next
    })
  }

  function toggleAll() {
    if (!files) return
    setSelected((prev) => (prev.size === files.length ? new Set() : new Set(files.map((f) => f.relpath))))
  }

  async function handleOrganize() {
    setApplying(true)
    setError(null)
    try {
      const result = await api.organizeLooseFiles(libraryId, Array.from(selected))
      setOrganizedCount(result.organized.length)
      onOrganized()
    } catch (e) {
      setError(String(e))
    } finally {
      setApplying(false)
    }
  }

  const allSelected = !!files && files.length > 0 && selected.size === files.length

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: pal.overlayBg, zIndex: 12 }} />
      <div
        style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 13,
          width: 560, maxWidth: '90vw', maxHeight: '85vh', background: pal.drawerBg,
          border: `1px solid ${pal.drawerBorder}`, borderRadius: 12, boxShadow: `0 20px 60px ${pal.shadow}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{ flex: 'none', padding: '20px 22px 14px' }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>Organize loose files</div>
          <div style={{ fontSize: 11.5, color: pal.textFaint }}>
            These files sit directly in an artist folder instead of an album folder — usually singles. Each
            selected file gets its own folder named after its title, same as an album.
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px' }}>
          {loading && <div style={{ fontSize: 13, color: pal.textFaint, paddingBottom: 20 }}>Scanning…</div>}
          {error && <div style={{ fontSize: 12.5, color: 'oklch(65% 0.19 25)', marginBottom: 12 }}>{error}</div>}

          {!loading && files && files.length === 0 && (
            <div style={{ fontSize: 13, color: pal.textFaint, paddingBottom: 20 }}>
              No loose files found — every artist folder is already organized into albums.
            </div>
          )}

          {organizedCount !== null && (
            <div style={{ fontSize: 13, color: pal.textSecondary, paddingBottom: 20 }}>
              Organized {organizedCount} {organizedCount === 1 ? 'file' : 'files'}. The library will refresh
              shortly.
            </div>
          )}

          {!loading && files && files.length > 0 && organizedCount === null && (
            <>
              <div
                onClick={toggleAll}
                style={{ fontSize: 11.5, color: pal.textSecondary, cursor: 'pointer', marginBottom: 8, display: 'inline-block' }}
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </div>
              <div style={{ paddingBottom: 20 }}>
                {files.map((f) => {
                  const isSelected = selected.has(f.relpath)
                  return (
                    <div
                      key={f.relpath}
                      onClick={() => toggle(f.relpath)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7,
                        cursor: 'pointer', background: pal.cardBg, marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${pal.checkboxBorderDefault}`,
                          background: isSelected ? accent : 'transparent', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', flex: 'none',
                        }}
                      >
                        {isSelected && <div style={{ color: '#fff', fontSize: 10.5, fontWeight: 700 }}>✓</div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {f.artist_name} / {f.filename}
                        </div>
                        <div
                          style={{
                            fontSize: 11, color: pal.textFaint, fontFamily: "ui-monospace,'SF Mono',Menlo,monospace",
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}
                        >
                          → {f.artist_name}/{f.suggested_folder}/{f.filename}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div style={{ flex: 'none', display: 'flex', gap: 10, padding: '16px 22px', borderTop: `1px solid ${pal.headerBorder}` }}>
          <div
            onClick={onClose}
            style={{
              flex: 1, textAlign: 'center', padding: 9, borderRadius: 7, fontSize: 13, cursor: 'pointer',
              border: `1px solid ${pal.inputBorder}`, color: pal.textSecondary,
            }}
          >
            {organizedCount !== null ? 'Close' : 'Cancel'}
          </div>
          {organizedCount === null && !!files?.length && (
            <div
              onClick={applying || selected.size === 0 ? undefined : handleOrganize}
              style={{
                flex: 1, textAlign: 'center', padding: 9, borderRadius: 7, fontSize: 13,
                cursor: applying || selected.size === 0 ? 'default' : 'pointer',
                background: accent, color: ACTIVE_TEXT_ON_ACCENT, fontWeight: 600,
                opacity: applying || selected.size === 0 ? 0.6 : 1,
              }}
            >
              {applying ? 'Organizing…' : `Organize ${selected.size}`}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
