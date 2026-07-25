import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Palette } from '../theme'
import type { Album, Track } from '../types'
import { CoverImage } from './CoverImage'

interface Props {
  pal: Palette
  accent: string
  albums: Album[]
  selectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (albumId: string) => void
  onOpen: (albumId: string) => void
}

type TrackState = Track[] | 'loading' | 'error'

function posLabel(t: Track): string {
  return (t.disc_num > 1 ? t.disc_num + '.' : '') + String(t.track_num).padStart(2, '0')
}

export function AlbumTree({ pal, accent, albums, selectMode, selectedIds, onToggleSelect, onOpen }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [tracksByAlbum, setTracksByAlbum] = useState<Record<string, TrackState>>({})

  // A fresh artist's albums default to fully expanded, so the tracks are
  // visible immediately without extra clicks.
  useEffect(() => {
    let cancelled = false
    setExpanded(new Set(albums.map((a) => a.id)))
    setTracksByAlbum({})
    Promise.all(
      albums.map(async (a) => {
        try {
          const detail = await api.album(a.id)
          return [a.id, detail.tracks] as const
        } catch {
          return [a.id, 'error' as const] as const
        }
      }),
    ).then((results) => {
      if (cancelled) return
      setTracksByAlbum(Object.fromEntries(results))
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albums.map((a) => a.id).join(',')])

  async function toggle(albumId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(albumId)) next.delete(albumId)
      else next.add(albumId)
      return next
    })
    if (!tracksByAlbum[albumId]) {
      setTracksByAlbum((prev) => ({ ...prev, [albumId]: 'loading' }))
      try {
        const detail = await api.album(albumId)
        setTracksByAlbum((prev) => ({ ...prev, [albumId]: detail.tracks }))
      } catch {
        setTracksByAlbum((prev) => ({ ...prev, [albumId]: 'error' }))
      }
    }
  }

  if (albums.length === 0) {
    return <div style={{ fontSize: 13, color: pal.textFaint, padding: '40px 0', textAlign: 'center' }}>No albums found.</div>
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {albums.map((album) => {
        const isOpen = expanded.has(album.id)
        const isSelected = selectedIds.has(album.id)
        const tracks = tracksByAlbum[album.id]
        return (
          <div key={album.id} style={{ marginBottom: 4 }}>
            <div
              onClick={() => (selectMode ? onToggleSelect(album.id) : onOpen(album.id))}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7, cursor: 'pointer',
                background: pal.cardBg, border: `1px solid ${isSelected ? accent : pal.cardBorder}`,
              }}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  toggle(album.id)
                }}
                style={{
                  width: 16, fontSize: 11, color: pal.textMuted, flex: 'none', cursor: 'pointer',
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
              >
                ▶
              </div>
              {selectMode && (
                <div
                  style={{
                    width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${pal.checkboxBorderDefault}`,
                    background: isSelected ? accent : 'transparent', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flex: 'none',
                  }}
                >
                  {isSelected && <div style={{ color: '#fff', fontSize: 10.5, fontWeight: 700 }}>✓</div>}
                </div>
              )}
              <div style={{ width: 32, height: 32, flex: 'none', borderRadius: 5, overflow: 'hidden' }}>
                <CoverImage coverId={album.cover_id} placeholder={album.title} pal={pal} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {album.title}
                </div>
                <div style={{ fontSize: 11, color: pal.textFaint }}>{album.year}</div>
              </div>
              <div style={{ fontSize: 11, color: pal.textFaint, flex: 'none' }}>
                {album.track_count} {album.track_count === 1 ? 'track' : 'tracks'}
              </div>
            </div>

            {isOpen && (
              <div style={{ paddingLeft: 44 }}>
                {tracks === 'loading' && <div style={{ fontSize: 12, color: pal.textFaint, padding: '6px 10px' }}>Loading…</div>}
                {tracks === 'error' && (
                  <div style={{ fontSize: 12, color: 'oklch(65% 0.19 25)', padding: '6px 10px' }}>Failed to load tracks.</div>
                )}
                {Array.isArray(tracks) &&
                  tracks.map((t) => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px' }}>
                      <div style={{ width: 30, flex: 'none', fontSize: 11, fontFamily: 'ui-monospace,monospace', color: pal.textFaint }}>
                        {posLabel(t)}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5, color: pal.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}
                      >
                        {t.title}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
