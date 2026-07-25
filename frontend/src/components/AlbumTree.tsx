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

function formatOf(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot === -1 ? '' : filename.slice(dot + 1).toUpperCase()
}

const TRACK_COLUMNS = '44px 1fr 84px'

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

  const COVER_SIZE = 108
  const CARD_PADDING = 14

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {albums.map((album) => {
        const isOpen = expanded.has(album.id)
        const isSelected = selectedIds.has(album.id)
        const tracks = tracksByAlbum[album.id]
        return (
          <div key={album.id} style={{ marginBottom: 10 }}>
            <div
              onClick={() => (selectMode ? onToggleSelect(album.id) : onOpen(album.id))}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: CARD_PADDING, borderRadius: 12, cursor: 'pointer',
                background: pal.cardBg, border: `1px solid ${isSelected ? accent : pal.cardBorder}`,
              }}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  toggle(album.id)
                }}
                style={{
                  width: 20, fontSize: 13, color: pal.textMuted, flex: 'none', cursor: 'pointer', textAlign: 'center',
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
              >
                ▶
              </div>
              {selectMode && (
                <div
                  style={{
                    width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${pal.checkboxBorderDefault}`,
                    background: isSelected ? accent : 'transparent', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flex: 'none',
                  }}
                >
                  {isSelected && <div style={{ color: '#fff', fontSize: 11.5, fontWeight: 700 }}>✓</div>}
                </div>
              )}
              <div style={{ width: COVER_SIZE, height: COVER_SIZE, flex: 'none', borderRadius: 8, overflow: 'hidden' }}>
                <CoverImage coverId={album.cover_id} placeholder={album.title} pal={pal} radius={8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {album.title}
                </div>
                <div style={{ fontSize: 13, color: pal.textFaint, marginTop: 2 }}>{album.year}</div>
                <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                  {album.genres.slice(0, 3).map((g) => (
                    <div key={g} style={{ fontSize: 10.5, padding: '2.5px 8px', background: pal.chipBg, borderRadius: 100, color: pal.chipText }}>
                      {g}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 12, color: pal.textFaint, flex: 'none' }}>
                {album.track_count} {album.track_count === 1 ? 'track' : 'tracks'}
              </div>
            </div>

            {isOpen && (
              <div style={{ paddingLeft: CARD_PADDING, paddingRight: CARD_PADDING, paddingTop: 10 }}>
                {tracks === 'loading' && <div style={{ fontSize: 12.5, color: pal.textFaint }}>Loading…</div>}
                {tracks === 'error' && (
                  <div style={{ fontSize: 12.5, color: 'oklch(65% 0.19 25)' }}>Failed to load tracks.</div>
                )}
                {Array.isArray(tracks) && tracks.length > 0 && (
                  <div>
                    <div
                      style={{
                        display: 'grid', gridTemplateColumns: TRACK_COLUMNS, gap: 10, padding: '0 0 6px',
                        borderBottom: `1px solid ${pal.divider}`, marginBottom: 2,
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', color: pal.textFaint }}>#</div>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', color: pal.textFaint }}>TITLE</div>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', color: pal.textFaint, textAlign: 'right' }}>
                        FORMAT
                      </div>
                    </div>
                    {tracks.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          display: 'grid', gridTemplateColumns: TRACK_COLUMNS, gap: 10, alignItems: 'center',
                          padding: '7px 0', borderRadius: 6,
                        }}
                      >
                        <div style={{ fontSize: 12, fontFamily: 'ui-monospace,monospace', color: pal.textFaint }}>{posLabel(t)}</div>
                        <div style={{ fontSize: 13.5, color: pal.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.title}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: 10.5, fontWeight: 700, letterSpacing: '.02em', padding: '3px 8px', borderRadius: 4,
                              background: pal.nestedPanelBg, color: pal.textSecondary, border: `1px solid ${pal.nestedPanelBorder}`,
                            }}
                          >
                            {formatOf(t.filename)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
