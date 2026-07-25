import { useEffect, useState } from 'react'
import { api } from '../api'
import { fieldLabelStyle, inputStyle, smallNumberInputStyle } from '../styles'
import { ACTIVE_TEXT_ON_ACCENT, type Palette } from '../theme'
import type { AlbumDetail } from '../types'
import { ArtistCombobox } from './ArtistCombobox'
import { CoverImage } from './CoverImage'
import { GenreEditor } from './GenreEditor'

interface Props {
  albumId: string
  pal: Palette
  accent: string
  artistSuggestions: string[]
  onClose: () => void
  onSaved: () => void
}

interface TrackDraft {
  id: string
  disc_num: number
  track_num: number
  title: string
}

interface Draft {
  title: string
  artist: string
  album_artist: string
  year: string
  compilation: boolean
  comments: string
  genres: string[]
  tracks: TrackDraft[]
}

function draftFrom(album: AlbumDetail): Draft {
  return {
    title: album.title,
    artist: album.artist,
    album_artist: album.album_artist,
    year: album.year,
    compilation: album.compilation,
    comments: album.comments,
    genres: [...album.genres],
    tracks: album.tracks.map((t) => ({ id: t.id, disc_num: t.disc_num, track_num: t.track_num, title: t.title })),
  }
}

export function EditorDrawer({ albumId, pal, accent, artistSuggestions, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [coverId, setCoverId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .album(albumId)
      .then((album) => {
        if (cancelled) return
        setDraft(draftFrom(album))
        setCoverId(album.cover_id)
      })
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [albumId])

  async function handleCoverUpload(file: File) {
    const updated = await api.uploadCover(albumId, file)
    setCoverId(updated.cover_id)
  }

  async function handleSave() {
    if (!draft) return
    setSaving(true)
    setError(null)
    try {
      await api.updateAlbum(albumId, {
        title: draft.title,
        artist: draft.artist,
        album_artist: draft.album_artist,
        year: draft.year,
        compilation: draft.compilation,
        comments: draft.comments,
        genres: draft.genres,
        tracks: draft.tracks.map((t) => ({ id: t.id, title: t.title, disc_num: t.disc_num, track_num: t.track_num })),
      })
      onSaved()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: pal.overlayBg, zIndex: 10 }} />
      <div
        style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 560, maxWidth: '90vw', maxHeight: '85vh', background: pal.drawerBg,
          border: `1px solid ${pal.drawerBorder}`, borderRadius: 12, boxShadow: `0 20px 60px ${pal.shadow}`,
          zIndex: 11, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${pal.headerBorder}` }}>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>Edit album tags</div>
          <div style={{ flex: 1 }} />
          <div onClick={onClose} style={{ cursor: 'pointer', color: pal.textMuted, fontSize: 18, lineHeight: 1 }}>×</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {loading && <div style={{ fontSize: 13, color: pal.textFaint }}>Loading…</div>}
          {error && <div style={{ fontSize: 12.5, color: 'oklch(65% 0.19 25)', marginBottom: 12 }}>{error}</div>}

          {draft && (
            <>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{ width: 120, height: 120, flex: 'none' }}>
                  <CoverImage coverId={coverId} placeholder={draft.title} pal={pal} radius={8} editable onUpload={handleCoverUpload} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                  <div>
                    <div style={fieldLabelStyle(pal)}>ALBUM TITLE</div>
                    <input
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      style={inputStyle(pal)}
                    />
                  </div>
                  <div>
                    <div style={fieldLabelStyle(pal)}>YEAR</div>
                    <input
                      value={draft.year}
                      onChange={(e) => setDraft({ ...draft, year: e.target.value })}
                      style={{ ...inputStyle(pal), width: 100 }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={fieldLabelStyle(pal)}>ARTIST</div>
                  <ArtistCombobox
                    value={draft.artist}
                    onChange={(v) => setDraft({ ...draft, artist: v })}
                    suggestions={artistSuggestions}
                    pal={pal}
                  />
                </div>
                <div>
                  <div style={fieldLabelStyle(pal)}>ALBUM ARTIST</div>
                  <ArtistCombobox
                    value={draft.album_artist}
                    onChange={(v) => setDraft({ ...draft, album_artist: v })}
                    suggestions={artistSuggestions}
                    pal={pal}
                  />
                </div>
              </div>

              <div
                onClick={() => setDraft({ ...draft, compilation: !draft.compilation })}
                style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18, cursor: 'pointer' }}
              >
                <div
                  style={{
                    width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${pal.checkboxBorderDefault}`,
                    background: draft.compilation ? accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {draft.compilation && <div style={{ color: '#fff', fontSize: 10.5, fontWeight: 700 }}>✓</div>}
                </div>
                <div style={{ fontSize: 12.5, color: pal.textSecondary }}>This is a compilation album</div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ ...fieldLabelStyle(pal), marginBottom: 6 }}>GENRE</div>
                <GenreEditor
                  pal={pal}
                  genres={draft.genres}
                  onAdd={(g) => setDraft({ ...draft, genres: [...draft.genres, g] })}
                  onRemove={(g) => setDraft({ ...draft, genres: draft.genres.filter((x) => x !== g) })}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={fieldLabelStyle(pal)}>COMMENTS</div>
                <textarea
                  value={draft.comments}
                  onChange={(e) => setDraft({ ...draft, comments: e.target.value })}
                  rows={2}
                  style={{ ...inputStyle(pal), resize: 'vertical' }}
                />
              </div>

              <div style={fieldLabelStyle(pal)}>TRACKS</div>
              <div style={{ display: 'flex', gap: 8, padding: '0 10px 5px', alignItems: 'center' }}>
                <div style={{ width: 40, fontSize: 9.5, fontWeight: 600, letterSpacing: '.05em', color: pal.textFaint, textAlign: 'center' }}>
                  DISC
                </div>
                <div style={{ width: 40, fontSize: 9.5, fontWeight: 600, letterSpacing: '.05em', color: pal.textFaint, textAlign: 'center' }}>
                  #
                </div>
                <div style={{ flex: 1, fontSize: 9.5, fontWeight: 600, letterSpacing: '.05em', color: pal.textFaint }}>TITLE</div>
              </div>
              <div style={{ border: `1px solid ${pal.cardBorder}`, borderRadius: 8, overflow: 'hidden' }}>
                {draft.tracks.map((t, i) => {
                  function updateTrack(fields: Partial<TrackDraft>) {
                    const tracks = draft!.tracks.map((tr, idx) => (idx === i ? { ...tr, ...fields } : tr))
                    setDraft({ ...draft!, tracks })
                  }
                  return (
                    <div
                      key={t.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderBottom: `1px solid ${pal.divider}` }}
                    >
                      <input
                        type="number"
                        min={1}
                        value={t.disc_num}
                        onChange={(e) => updateTrack({ disc_num: parseInt(e.target.value, 10) || 1 })}
                        style={smallNumberInputStyle(pal)}
                      />
                      <input
                        type="number"
                        min={0}
                        value={t.track_num}
                        onChange={(e) => updateTrack({ track_num: parseInt(e.target.value, 10) || 0 })}
                        style={smallNumberInputStyle(pal)}
                      />
                      <input
                        value={t.title}
                        onChange={(e) => updateTrack({ title: e.target.value })}
                        style={{ flex: 1, background: 'transparent', border: 'none', fontSize: 12.5, color: 'inherit', outline: 'none', padding: '3px 4px', borderRadius: 4 }}
                      />
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div style={{ flex: 'none', display: 'flex', gap: 10, padding: '16px 20px', borderTop: `1px solid ${pal.headerBorder}` }}>
          <div onClick={onClose} style={{ flex: 1, textAlign: 'center', padding: 9, borderRadius: 7, fontSize: 13, cursor: 'pointer', border: `1px solid ${pal.inputBorder}`, color: pal.textSecondary }}>
            Cancel
          </div>
          <div
            onClick={saving ? undefined : handleSave}
            style={{
              flex: 1, textAlign: 'center', padding: 9, borderRadius: 7, fontSize: 13, cursor: saving ? 'default' : 'pointer',
              background: accent, color: ACTIVE_TEXT_ON_ACCENT, fontWeight: 600, opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </div>
        </div>
      </div>
    </>
  )
}
