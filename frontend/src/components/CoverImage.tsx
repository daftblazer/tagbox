import { useRef, useState } from 'react'
import { api } from '../api'
import type { Palette } from '../theme'

interface Props {
  coverId?: string | null
  overrideUrl?: string | null
  placeholder: string
  pal: Palette
  radius?: number
  editable?: boolean
  onUpload?: (file: File) => void | Promise<void>
}

function initialsOf(text: string): string {
  return text
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function CoverImage({ coverId, overrideUrl, placeholder, pal, radius = 0, editable, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const url = overrideUrl ?? api.coverUrl(coverId)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !onUpload) return
    setUploading(true)
    try {
      await onUpload(file)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className="cover-slot"
      onClick={() => editable && inputRef.current?.click()}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: radius,
        overflow: 'hidden',
        position: 'relative',
        background: pal.nestedPanelBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: editable ? 'pointer' : 'default',
        flex: 'none',
      }}
      title={editable ? 'Click to change cover' : undefined}
    >
      {url ? (
        <img src={url} alt={placeholder} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: 13, fontWeight: 700, color: pal.textFaint, letterSpacing: '0.02em' }}>
          {initialsOf(placeholder) || '?'}
        </span>
      )}
      {editable && (
        <div className={`cover-hover-overlay${uploading ? ' visible' : ''}`}>{uploading ? 'Uploading…' : 'Change cover'}</div>
      )}
      {editable && (
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      )}
    </div>
  )
}
