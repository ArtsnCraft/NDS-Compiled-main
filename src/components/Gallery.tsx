import React from 'react'
import { MediaItem } from '@/lib/supabase'
import { useGalleryStore } from '@/stores/galleryStore'
import { GalleryItem } from './GalleryItem'

interface GalleryProps {
  onEdit: (item: MediaItem) => void
  onDelete: (id: string) => void
  onView: (item: MediaItem) => void
}

export const Gallery: React.FC<GalleryProps> = ({ onEdit, onDelete, onView }) => {
  const {
    filteredItems,
    selectedItems,
    selectedCount,
    selectAllItems,
    clearSelection,
    deleteMediaItem,
    isLoading,
  } = useGalleryStore()

  const handleBatchDelete = () => {
    if (confirm(`Delete ${selectedCount()} items?`)) {
      selectedItems.forEach(id => deleteMediaItem(id))
      clearSelection()
    }
  }

  const handleBatchDownload = () => {
    // placeholder — wire up real download when Supabase is connected
    console.log('Batch download:', selectedItems)
  }

  const items = filteredItems()

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>

      {/* ── Batch toolbar ── */}
      {selectedCount() > 0 && (
        <div
          style={{
            position: 'sticky', top: '90px',
            zIndex: 50, marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 20px',
            background: 'rgba(13,10,30,0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(167,139,250,0.4)',
            borderRadius: 'var(--r-lg)',
            boxShadow: '0 0 0 1px rgba(167,139,250,0.15), var(--shadow)',
            animation: 'modalSlide 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <i className="fas fa-check-circle" style={{ color: 'var(--primary)', fontSize: '1rem' }} />
          <span style={{ color: 'var(--text)', fontWeight: 500, fontSize: '0.9rem', flex: 1 }}>
            {selectedCount()} item{selectedCount() !== 1 ? 's' : ''} selected
          </span>

          <button
            className="pill-btn pill-btn--ghost"
            onClick={clearSelection}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            <i className="fas fa-times" />
            <span>Clear</span>
          </button>

          <button
            className="pill-btn pill-btn--ghost"
            onClick={handleBatchDownload}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            <i className="fas fa-download" />
            <span>Download</span>
          </button>

          <button
            onClick={handleBatchDelete}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '6px 14px', borderRadius: 'var(--r-pill)',
              border: '1px solid rgba(239,68,68,0.4)',
              background: 'rgba(239,68,68,0.15)', color: 'var(--error)',
              fontSize: '0.82rem', fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
              transition: 'var(--t)', cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
          >
            <i className="fas fa-trash-alt" />
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {isLoading && (
        <div className="gallery-masonry">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="gallery-item"
              style={{
                height: [180, 240, 160, 220, 200][i % 5],
                background: 'linear-gradient(90deg, var(--surface) 25%, var(--surface-hover) 50%, var(--surface) 75%)',
                backgroundSize: '200% 100%',
                animation: `shimmer 1.5s infinite ${i * 0.1}s`,
              }}
            />
          ))}
          <style>{`
            @keyframes shimmer {
              0%   { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && items.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-photo-film" />
          </div>
          <h3>No results found</h3>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* ── Masonry gallery ── */}
      {!isLoading && items.length > 0 && (
        <>
          <div className="gallery-masonry" id="gallery">
            {items.map(item => (
              <GalleryItem
                key={item.id}
                item={item}
                onEdit={onEdit}
                onDelete={onDelete}
                onView={onView}
              />
            ))}
          </div>

          {/* Select-all hint */}
          {selectedCount() === 0 && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button
                onClick={selectAllItems}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--text-3)', fontSize: '0.8rem',
                  cursor: 'pointer', transition: 'color var(--t)',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
              >
                Select all {items.length} items
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
