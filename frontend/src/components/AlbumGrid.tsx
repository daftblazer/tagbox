import { CoverImage } from './CoverImage'
import type { Palette } from '../theme'
import type { Album } from '../types'

interface Props {
  pal: Palette
  accent: string
  albums: Album[]
  selectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (albumId: string) => void
  onOpen: (albumId: string) => void
}

export function AlbumGrid({ pal, accent, albums, selectMode, selectedIds, onToggleSelect, onOpen }: Props) {
  if (albums.length === 0) {
    return <div style={{ fontSize: 13, color: pal.textFaint, padding: '40px 0', textAlign: 'center' }}>No albums found.</div>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px,1fr))', gap: 18 }}>
      {albums.map((album) => {
        const selected = selectedIds.has(album.id)
        const border = selected ? accent : pal.cardBorder
        const handleClick = () => (selectMode ? onToggleSelect(album.id) : onOpen(album.id))
        return (
          <div key={album.id} style={{ position: 'relative', background: pal.cardBg, border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden' }}>
            {selectMode && (
              <div
                onClick={() => onToggleSelect(album.id)}
                style={{
                  position: 'absolute', top: 8, left: 8, zIndex: 2, width: 20, height: 20, borderRadius: 5,
                  background: selected ? accent : pal.selectBoxDefault,
                  border: `1.5px solid ${selected ? accent : pal.checkboxBorderDefault}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                {selected && <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</div>}
              </div>
            )}
            <div onClick={handleClick} style={{ width: '100%', aspectRatio: '1', cursor: 'pointer' }}>
              <CoverImage coverId={album.cover_id} placeholder={album.title} pal={pal} />
            </div>
            <div onClick={handleClick} style={{ padding: '11px 12px', cursor: 'pointer' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {album.title}
              </div>
              <div style={{ fontSize: 11.5, color: pal.textMuted2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {album.artist} · {album.year}
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
                {album.genres.slice(0, 2).map((g) => (
                  <div key={g} style={{ fontSize: 10, padding: '2.5px 7px', background: pal.chipBg, borderRadius: 100, color: pal.chipText }}>
                    {g}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
