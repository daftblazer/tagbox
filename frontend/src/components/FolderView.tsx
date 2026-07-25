import { useState } from 'react'
import type { Palette } from '../theme'
import type { FolderArtist } from '../types'

interface Props {
  pal: Palette
  folders: FolderArtist[]
  onOpenAlbum: (albumId: string) => void
}

export function FolderView({ pal, folders, onOpenAlbum }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (folders.length === 0) {
    return <div style={{ fontSize: 13, color: pal.textFaint, padding: '40px 0', textAlign: 'center' }}>No artist folders found.</div>
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {folders.map((fa) => {
        const isOpen = expanded.has(fa.id)
        return (
          <div key={fa.id} style={{ marginBottom: 2 }}>
            <div
              onClick={() => toggle(fa.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 7, cursor: 'pointer', background: pal.cardBg }}
            >
              <div style={{ width: 12, fontSize: 11, color: pal.textMuted, transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</div>
              <div style={{ fontSize: 13, fontFamily: "ui-monospace,'SF Mono',Menlo,monospace" }}>{fa.name}/</div>
              <div style={{ flex: 1 }} />
              <div style={{ fontSize: 11, color: pal.textFaint }}>
                {fa.albums.length} {fa.albums.length === 1 ? 'album' : 'albums'}
              </div>
            </div>
            {isOpen && (
              <div style={{ paddingLeft: 28 }}>
                {fa.albums.map((al) => (
                  <div
                    key={al.id}
                    onClick={() => onOpenAlbum(al.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, cursor: 'pointer' }}
                  >
                    <div style={{ width: 12, fontSize: 11, color: pal.textFainter }}>–</div>
                    <div style={{ fontSize: 12.5, fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", color: pal.textSecondary }}>
                      {al.title}/
                    </div>
                    <div style={{ flex: 1 }} />
                    <div style={{ fontSize: 11, color: pal.textFaint }}>{al.track_count} tracks</div>
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
