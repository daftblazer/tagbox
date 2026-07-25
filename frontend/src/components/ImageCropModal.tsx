import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ACTIVE_TEXT_ON_ACCENT, type Palette } from '../theme'

interface Props {
  file: File
  pal: Palette
  accent: string
  onCancel: () => void
  onCropped: (file: File) => void
}

const VIEWPORT = 340
const OUTPUT_SIZE = 800
const MAX_ZOOM = 3

interface Offset {
  x: number
  y: number
}

function baseScale(w: number, h: number): number {
  return VIEWPORT / Math.min(w, h)
}

function clampOffset(o: Offset, w: number, h: number, zoom: number): Offset {
  const scale = baseScale(w, h) * zoom
  const displayW = w * scale
  const displayH = h * scale
  const minX = Math.min(0, VIEWPORT - displayW)
  const minY = Math.min(0, VIEWPORT - displayH)
  return { x: Math.min(0, Math.max(minX, o.x)), y: Math.min(0, Math.max(minY, o.y)) }
}

/** Renders a portal-mounted crop dialog so it always centers on the viewport,
 * regardless of the transformed/positioned ancestors it's triggered from
 * (the album editor and bulk-edit modals both use a centering transform,
 * which would otherwise re-scope a nested `position: fixed` element). */
export function ImageCropModal({ file, pal, accent, onCancel, onCropped }: Props) {
  // The object URL is created (and revoked) inside the effect itself, rather
  // than via a useState lazy initializer, so React 18 Strict Mode's
  // mount→cleanup→mount dev cycle can't revoke a URL the rendered <img> still
  // needs — a mismatched create/cleanup pairing across the two would leave
  // the img pointing at an already-revoked blob: URL.
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  const dragState = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function handleImageLoad() {
    const img = imgRef.current
    if (!img) return
    const w = img.naturalWidth
    const h = img.naturalHeight
    setNaturalSize({ w, h })
    const scale = baseScale(w, h)
    setOffset({ x: (VIEWPORT - w * scale) / 2, y: (VIEWPORT - h * scale) / 2 })
    setZoom(1)
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    dragState.current = { startX: e.clientX, startY: e.clientY, offsetX: offset.x, offsetY: offset.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current || !naturalSize) return
    const dx = e.clientX - dragState.current.startX
    const dy = e.clientY - dragState.current.startY
    const next = { x: dragState.current.offsetX + dx, y: dragState.current.offsetY + dy }
    setOffset(clampOffset(next, naturalSize.w, naturalSize.h, zoom))
  }

  function handlePointerUp() {
    dragState.current = null
  }

  function handleZoomChange(nextZoom: number) {
    if (!naturalSize) {
      setZoom(nextZoom)
      return
    }
    // Keep whatever's currently centered in the viewport centered after the zoom changes.
    const oldScale = baseScale(naturalSize.w, naturalSize.h) * zoom
    const centerImgX = (VIEWPORT / 2 - offset.x) / oldScale
    const centerImgY = (VIEWPORT / 2 - offset.y) / oldScale
    const newScale = baseScale(naturalSize.w, naturalSize.h) * nextZoom
    const next = { x: VIEWPORT / 2 - centerImgX * newScale, y: VIEWPORT / 2 - centerImgY * newScale }
    setZoom(nextZoom)
    setOffset(clampOffset(next, naturalSize.w, naturalSize.h, nextZoom))
  }

  function handleApply() {
    const img = imgRef.current
    if (!img || !naturalSize) return
    setExporting(true)
    const scale = baseScale(naturalSize.w, naturalSize.h) * zoom
    const sourceX = -offset.x / scale
    const sourceY = -offset.y / scale
    const sourceSize = VIEWPORT / scale

    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setExporting(false)
      return
    }
    ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
    canvas.toBlob(
      (blob) => {
        setExporting(false)
        if (!blob) return
        const croppedName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
        onCropped(new File([blob], croppedName, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.92,
    )
  }

  const displayW = naturalSize ? naturalSize.w * baseScale(naturalSize.w, naturalSize.h) * zoom : undefined
  const displayH = naturalSize ? naturalSize.h * baseScale(naturalSize.w, naturalSize.h) * zoom : undefined

  const modal = (
    // React portals still bubble synthetic events up the React tree (not the DOM
    // tree), so without stopping propagation here, any click inside this portal
    // (pan, buttons, slider) would bubble to CoverImage's own onClick and
    // reopen the file picker.
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: pal.overlayBg }} />
      <div
        style={{
          position: 'relative', width: VIEWPORT + 40, background: pal.drawerBg, border: `1px solid ${pal.drawerBorder}`,
          borderRadius: 12, boxShadow: `0 20px 60px ${pal.shadow}`, padding: 20,
        }}
      >
        <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>Crop cover art</div>
        <div style={{ fontSize: 11.5, color: pal.textFaint, marginBottom: 14 }}>Drag to reposition, use the slider to zoom.</div>

        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            width: VIEWPORT, height: VIEWPORT, overflow: 'hidden', borderRadius: 8, position: 'relative',
            background: pal.nestedPanelBg, cursor: 'grab', touchAction: 'none', margin: '0 auto',
          }}
        >
          {imgUrl && (
          <img
            ref={imgRef}
            src={imgUrl}
            onLoad={handleImageLoad}
            draggable={false}
            alt="Crop preview"
            style={{
              position: 'absolute', left: 0, top: 0, userSelect: 'none', pointerEvents: 'none',
              width: displayW, height: displayH,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
          />
          )}
        </div>

        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
          style={{ width: '100%', marginTop: 14 }}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <div
            onClick={onCancel}
            style={{
              flex: 1, textAlign: 'center', padding: 9, borderRadius: 7, fontSize: 13, cursor: 'pointer',
              border: `1px solid ${pal.inputBorder}`, color: pal.textSecondary,
            }}
          >
            Cancel
          </div>
          <div
            onClick={exporting ? undefined : handleApply}
            style={{
              flex: 1, textAlign: 'center', padding: 9, borderRadius: 7, fontSize: 13, cursor: exporting ? 'default' : 'pointer',
              background: accent, color: ACTIVE_TEXT_ON_ACCENT, fontWeight: 600, opacity: exporting ? 0.7 : 1,
            }}
          >
            {exporting ? 'Applying…' : 'Apply crop'}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
