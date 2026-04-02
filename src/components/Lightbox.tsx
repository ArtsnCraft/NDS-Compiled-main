import React, { useEffect, useState, useRef } from 'react'
import { MediaItem } from '@/lib/supabase'
import { useGalleryStore } from '@/stores/galleryStore'

interface LightboxProps {
  isOpen: boolean
  onClose: () => void
  currentItem: MediaItem | null
}

export const Lightbox: React.FC<LightboxProps> = ({ isOpen, onClose, currentItem }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [infoOpen, setInfoOpen] = useState(false)
  const [imgLoading, setImgLoading] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { filteredItems } = useGalleryStore()

  const items = filteredItems()

  useEffect(() => {
    if (currentItem) {
      const idx = items.findIndex(i => i.id === currentItem.id)
      setCurrentIndex(idx >= 0 ? idx : 0)
    }
  }, [currentItem])

  // Reset transform on item change
  useEffect(() => {
    setZoom(1); setRotation(0); setInfoOpen(false)
  }, [currentIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isOpen) return
      switch (e.key) {
        case 'Escape':    onClose(); break
        case 'ArrowLeft': navigate(-1); break
        case 'ArrowRight':navigate(1); break
        case 'f': case 'F': break // favourite placeholder
        case 'r': case 'R': handleRotate(); break
        case '+':           handleZoomIn(); break
        case '-':           handleZoomOut(); break
        case '0':           handleZoomReset(); break
        case 'i': case 'I': setInfoOpen(v => !v); break
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, currentIndex, zoom, rotation])

  const navigate = (dir: number) => {
    if (!items.length) return
    setCurrentIndex(i => (i + dir + items.length) % items.length)
  }

  const handleRotate   = () => setRotation(r => (r + 90) % 360)
  const handleZoomIn   = () => setZoom(z => Math.min(3, +(z * 1.25).toFixed(2)))
  const handleZoomOut  = () => setZoom(z => Math.max(0.5, +(z * 0.8).toFixed(2)))
  const handleZoomReset = () => { setZoom(1); setRotation(0) }

  const handleDownload = () => {
    const item = items[currentIndex]
    if (!item) return
    const a = document.createElement('a')
    a.href = item.url; a.download = item.filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  const handleShare = async () => {
    const item = items[currentIndex]
    if (!item) return
    if (navigator.share) {
      try { await navigator.share({ title: item.title, url: item.url }); return } catch {}
    }
    try { await navigator.clipboard.writeText(item.url) } catch {}
  }

  if (!isOpen) return null
  const item = items[currentIndex]
  if (!item) return null

  const transform = `scale(${zoom}) rotate(${rotation}deg)`
  const filename = item.url?.split('/').pop() || 'unknown'

  return (
    <div className="lightbox active" id="lightbox" role="dialog" aria-modal="true" aria-label="Media viewer">

      {/* Backdrop */}
      <div className="lightbox-backdrop" onClick={onClose} />

      {/* ── Single top bar: [toolbar] [counter (centred)] [close] ── */}
      <div className="lightbox-topbar">

        {/* Left: tool buttons */}
        <div className="lb-toolbar" role="toolbar">
          <button className="lb-tool-btn" aria-label="Favourite" title="Favourite [F]">
            <i className="fas fa-star" />
          </button>

          <div className="lb-toolbar-sep" />

          <button
            className={`lb-tool-btn${infoOpen ? ' active' : ''}`}
            aria-label="Info" title="Info [I]"
            onClick={() => setInfoOpen(v => !v)}
          >
            <i className="fas fa-circle-info" />
          </button>

          <div className="lb-toolbar-sep" />

          <button className="lb-tool-btn" aria-label="Rotate" title="Rotate [R]" onClick={handleRotate}>
            <i className="fas fa-rotate-right" />
          </button>
          <button className="lb-tool-btn" aria-label="Zoom in" title="Zoom in [+]" onClick={handleZoomIn}>
            <i className="fas fa-magnifying-glass-plus" />
          </button>
          <button className="lb-tool-btn" aria-label="Zoom out" title="Zoom out [−]" onClick={handleZoomOut}>
            <i className="fas fa-magnifying-glass-minus" />
          </button>
          <button className="lb-tool-btn" aria-label="Reset view" title="Reset [0]" onClick={handleZoomReset}>
            <i className="fas fa-expand" />
          </button>

          <div className="lb-toolbar-sep" />

          <button className="lb-tool-btn" aria-label="Download" title="Download" onClick={handleDownload}>
            <i className="fas fa-download" />
          </button>
          <button className="lb-tool-btn" aria-label="Share" title="Share" onClick={handleShare}>
            <i className="fas fa-share-nodes" />
          </button>
        </div>

        {/* Centre: counter */}
        <div className="lightbox-counter" aria-live="polite">
          {currentIndex + 1} / {items.length}
        </div>

        {/* Right: close */}
        <button className="lightbox-close-btn" onClick={onClose} aria-label="Close viewer">
          <i className="fas fa-times" />
        </button>

      </div>

      {/* ── Media stage ── */}
      <div className="lightbox-stage">
        {imgLoading && (
          <div className="lightbox-spinner show">
            <div className="spinner" />
          </div>
        )}

        {item.type === 'image' ? (
          <img
            ref={imgRef}
            id="lightboxImage"
            className="active"
            src={item.url}
            alt={item.title}
            style={{ transform, cursor: zoom > 1 ? 'grab' : 'default' }}
            onLoadStart={() => setImgLoading(true)}
            onLoad={() => setImgLoading(false)}
          />
        ) : (
          <video
            ref={videoRef}
            id="lightboxVideo"
            className="active"
            src={item.url}
            controls
            autoPlay
            style={{ transform }}
          />
        )}
      </div>

      {/* ── Nav arrows ── */}
      {items.length > 1 && (
        <>
          <button className="lb-nav lb-nav--prev" onClick={() => navigate(-1)} aria-label="Previous">
            <i className="fas fa-chevron-left" />
          </button>
          <button className="lb-nav lb-nav--next" onClick={() => navigate(1)} aria-label="Next">
            <i className="fas fa-chevron-right" />
          </button>
        </>
      )}

      {/* ── Caption ── */}
      <div className="lightbox-caption">
        <div className="lightbox-title">{item.title}</div>
        <div className="lightbox-description">{item.description}</div>
      </div>

      {/* ── Filmstrip ── */}
      <div className="lightbox-filmstrip" id="lightboxFilmstrip">
        {items.slice(Math.max(0, currentIndex - 5), currentIndex + 6).map((thumb, i) => {
          const absIdx = Math.max(0, currentIndex - 5) + i
          return (
            <div
              key={thumb.id}
              className={`filmstrip-thumb${absIdx === currentIndex ? ' active' : ''}`}
              onClick={() => setCurrentIndex(absIdx)}
            >
              {thumb.type === 'image'
                ? <img src={thumb.url} alt="" />
                : <video src={thumb.url} muted playsInline />
              }
            </div>
          )
        })}
      </div>

      {/* ── Info panel ── */}
      <div className={`lb-info-panel${infoOpen ? ' open' : ''}`} id="lbInfoPanel">
        <div className="lb-info-header">
          <h4><i className="fas fa-circle-info" /> &nbsp; Media Info</h4>
          <button
            style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '1px solid var(--glass-border)', background: 'var(--surface)',
              color: 'var(--text-2)', fontSize: '0.72rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
            onClick={() => setInfoOpen(false)}
            aria-label="Close info"
          >
            <i className="fas fa-times" />
          </button>
        </div>
        <div
          style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px',
          }}
        >
          {[
            ['Filename', filename],
            ['Type', `${item.type}`],
            ['Category', item.category || '—'],
            ['Dimensions', imgRef.current?.naturalWidth ? `${imgRef.current.naturalWidth} × ${imgRef.current.naturalHeight} px` : '—'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{label}</span>
              <span style={{ fontSize: '0.84rem', color: 'var(--text)' }}>{value}</span>
            </div>
          ))}
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Path</span>
            <span style={{ fontSize: '0.76rem', fontFamily: 'monospace', color: 'var(--primary)', opacity: 0.85, wordBreak: 'break-word' }}>{item.url}</span>
          </div>
        </div>
      </div>

      {/* ── Keyboard hint ── */}
      <div className="lb-key-hint" aria-hidden="true">
        ESC close &nbsp;·&nbsp; ← → navigate &nbsp;·&nbsp; F favourite &nbsp;·&nbsp;
        R rotate &nbsp;·&nbsp; + / − zoom &nbsp;·&nbsp; 0 reset &nbsp;·&nbsp; I info
      </div>

    </div>
  )
}
