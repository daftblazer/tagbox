import { useEffect, useState } from 'react'
import { api } from '../api'
import { fieldLabelStyle, inputStyle } from '../styles'
import { ACTIVE_TEXT_ON_ACCENT, type Palette } from '../theme'
import { CoverImage } from './CoverImage'
import { GenreEditor } from './GenreEditor'

interface Props {
  ids: string[]
  pal: Palette
  accent: string
  onClose: () => void
  onApplied: () => void
}

export function BulkEditModal({ ids, pal, accent, onClose, onApplied }: Props) {
  const [albumArtist, setAlbumArtist] = useState('')
  const [comments, setComments] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    }
  }, [coverPreviewUrl])

  function handleCoverPick(file: File) {
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    setCoverFile(file)
    setCoverPreviewUrl(URL.createObjectURL(file))
  }

  async function handleApply() {
    setApplying(true)
    setError(null)
    try {
      await api.bulkUpdate({
        ids,
        album_artist: albumArtist.trim() || undefined,
        comments: comments.trim() || undefined,
        add_genres: genres.length ? genres : undefined,
      })
      if (coverFile) {
        await api.bulkUploadCover(ids, coverFile)
      }
      onApplied()
    } catch (e) {
      setError(String(e))
    } finally {
      setApplying(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: pal.overlayBg, zIndex: 12 }} />
      <div
        style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 13, width: 420,
          background: pal.drawerBg, border: `1px solid ${pal.drawerBorder}`, borderRadius: 12,
          boxShadow: `0 20px 60px ${pal.shadow}`, padding: 22,
        }}
      >
        <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>Bulk edit {ids.length} albums</div>
        <div style={{ fontSize: 11.5, color: pal.textFaint, marginBottom: 18 }}>
          Leave a field blank to keep each album's existing value.
        </div>

        {error && <div style={{ fontSize: 12.5, color: 'oklch(65% 0.19 25)', marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 84, height: 84, flex: 'none' }}>
            <CoverImage overrideUrl={coverPreviewUrl} placeholder="Apply cover to all" pal={pal} radius={8} editable onUpload={handleCoverPick} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={fieldLabelStyle(pal)}>ALBUM ARTIST</div>
              <input value={albumArtist} onChange={(e) => setAlbumArtist(e.target.value)} placeholder="Unchanged" style={inputStyle(pal)} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ ...fieldLabelStyle(pal), marginBottom: 6 }}>GENRE — add to all selected</div>
          <GenreEditor pal={pal} genres={genres} onAdd={(g) => setGenres([...genres, g])} onRemove={(g) => setGenres(genres.filter((x) => x !== g))} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={fieldLabelStyle(pal)}>COMMENTS</div>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Unchanged"
            rows={2}
            style={{ ...inputStyle(pal), resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div onClick={onClose} style={{ flex: 1, textAlign: 'center', padding: 9, borderRadius: 7, fontSize: 13, cursor: 'pointer', border: `1px solid ${pal.inputBorder}`, color: pal.textSecondary }}>
            Cancel
          </div>
          <div
            onClick={applying ? undefined : handleApply}
            style={{
              flex: 1, textAlign: 'center', padding: 9, borderRadius: 7, fontSize: 13, cursor: applying ? 'default' : 'pointer',
              background: accent, color: ACTIVE_TEXT_ON_ACCENT, fontWeight: 600, opacity: applying ? 0.7 : 1,
            }}
          >
            {applying ? 'Applying…' : `Apply to ${ids.length}`}
          </div>
        </div>
      </div>
    </>
  )
}
