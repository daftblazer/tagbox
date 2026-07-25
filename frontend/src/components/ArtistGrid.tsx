import { CoverImage } from './CoverImage'
import type { Palette } from '../theme'
import type { Artist } from '../types'

interface Props {
  pal: Palette
  artists: Artist[]
  onOpen: (artist: Artist) => void
}

export function ArtistGrid({ pal, artists, onOpen }: Props) {
  if (artists.length === 0) {
    return <div style={{ fontSize: 13, color: pal.textFaint, padding: '40px 0', textAlign: 'center' }}>No artists found.</div>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px,1fr))', gap: 18 }}>
      {artists.map((artist) => (
        <div
          key={artist.id}
          onClick={() => onOpen(artist)}
          style={{ cursor: 'pointer', background: pal.cardBg, border: `1px solid ${pal.cardBorder}`, borderRadius: 10, overflow: 'hidden' }}
        >
          <div style={{ width: '100%', aspectRatio: '1' }}>
            <CoverImage coverId={artist.cover_id} placeholder={artist.name} pal={pal} />
          </div>
          <div style={{ padding: '11px 12px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {artist.name}
            </div>
            <div style={{ fontSize: 11.5, color: pal.textMuted, marginTop: 2 }}>
              {artist.album_count} {artist.album_count === 1 ? 'album' : 'albums'}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
