import React, { useRef } from 'react'
import { MediaItem } from '@/lib/supabase'
import { useGalleryStore } from '@/stores/galleryStore'

interface GalleryItemProps {
  item: MediaItem
  onDelete: (id: string) => void
  onView: (item: MediaItem) => void
}

export const GalleryItem: React.FC<GalleryItemProps> = ({ item, onDelete, onView }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { selectedItems, toggleItemSelection } = useGalleryStore()
  const isSelected = selectedItems.includes(item.id)
  const isVideo = item.type === 'video'

  // Video hover play/pause
  const handleMouseEnter = () => {
    if (videoRef.current) videoRef.current.play().catch(() => {})
  }
  const handleMouseLeave = () => {
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0 }
  }

  const handleWrapperClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onView(item)
  }

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleItemSelection(item.id)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this item?')) onDelete(item.id)
  }

  return (
    <div
      className={`gallery-item${isSelected ? ' selected' : ''}`}
      data-category={item.category?.toLowerCase() || 'uncategorized'}
      data-title={item.title}
      data-description={item.description}
      onMouseEnter={isVideo ? handleMouseEnter : undefined}
      onMouseLeave={isVideo ? handleMouseLeave : undefined}
    >
      {/* Selection checkbox */}
      <div
        style={{
          position: 'absolute', top: 10, left: 10, zIndex: 4,
          opacity: isSelected ? 1 : 0, transition: 'opacity 0.2s',
        }}
        className="card-checkbox-wrap"
      >
        <button
          onClick={handleCheckboxClick}
          style={{
            width: 22, height: 22, borderRadius: 6,
            border: isSelected ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.35)',
            background: isSelected ? 'var(--primary-deep)' : 'rgba(7,5,15,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(10px)', cursor: 'pointer',
          }}
          aria-label="Select item"
        >
          {isSelected && <i className="fas fa-check" style={{ color: '#fff', fontSize: '0.65rem' }} />}
        </button>
      </div>

      {/* Media */}
      <div className="image-wrapper" onClick={handleWrapperClick} style={{ cursor: 'zoom-in' }}>
        {isVideo ? (
          <video
            ref={videoRef}
            src={item.url}
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          <img
            src={item.url}
            alt={item.title}
            loading="lazy"
          />
        )}

        {/* Media type badge */}
        {isVideo && (
          <div className="media-badge">
            <i className="fas fa-play" style={{ marginRight: 4, fontSize: '0.6rem' }} />
            VIDEO
          </div>
        )}

        {/* Zoom hint */}
        <div className="zoom-hint">
          <i className="fas fa-expand" />
        </div>

        {/* Category badge */}
        <div className="card-category-badge">
          {item.category || 'uncategorized'}
        </div>

        {/* Favourite button */}
        <button
          className="card-fav-btn"
          title="Toggle favourite"
          aria-label="Toggle favourite"
          onClick={(e) => e.stopPropagation()}
        >
          <i className="fas fa-star" />
        </button>
      </div>

      {/* Card footer */}
      <div className="card-content">
        <h3 title={item.title}>{item.title}</h3>
        <p title={item.description}>{item.description}</p>
      </div>

      {/* Show checkbox on hover via CSS — inject the group hover trick */}
      <style>{`
        .gallery-item:hover .card-checkbox-wrap { opacity: 1 !important; }
        .gallery-item.selected .card-checkbox-wrap { opacity: 1 !important; }
      `}</style>
    </div>
  )
}
