import React, { useState, useEffect, useRef } from 'react'
import { Header } from './components/Header'
import { Gallery } from './components/Gallery'
import { UploadModal } from './components/UploadModal'
import { Lightbox } from './components/Lightbox'
import { MediaItem } from './lib/supabase'
import { useGalleryStore } from './stores/galleryStore'

// ── Tiny toast helper (imperative, no external lib needed) ────────────────────
function toast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration = 4000) {
  const stack = document.getElementById('toastStack')
  if (!stack) return

  const icons: Record<string, string> = {
    success: 'fa-check', error: 'fa-exclamation',
    warning: 'fa-triangle-exclamation', info: 'fa-circle-info',
  }

  const el = document.createElement('div')
  el.className = `toast ${type}`
  el.innerHTML = `
    <div class="toast-icon-wrap"><i class="fas ${icons[type]}"></i></div>
    <div class="toast-msg">${message}</div>
    <button class="toast-close" aria-label="Dismiss"><i class="fas fa-times"></i></button>
  `

  const dismiss = () => {
    el.classList.add('dismissing')
    setTimeout(() => el.remove(), 300)
  }
  el.querySelector('.toast-close')!.addEventListener('click', dismiss)
  stack.appendChild(el)
  setTimeout(dismiss, duration)
}

// ── Splash component ───────────────────────────────────────────────────────────
const Splash: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [fill, setFill] = useState(0)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    // Simulate a load progress
    let v = 0
    const id = setInterval(() => {
      v += Math.random() * 18
      if (v >= 100) { v = 100; clearInterval(id); setTimeout(() => { setHidden(true); onDone() }, 320) }
      setFill(Math.min(v, 100))
    }, 160)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={`splash${hidden ? ' hidden' : ''}`} id="splash" aria-hidden="true">
      <div className="splash-inner">
        <div className="splash-logo-wrap">
          <div className="splash-icon"><i className="fas fa-images" /></div>
          <div className="splash-rings">
            <div className="splash-ring r1" />
            <div className="splash-ring r2" />
            <div className="splash-ring r3" />
          </div>
        </div>
        <p className="splash-name">NDS Archives</p>
        <p className="splash-tagline">Private Media Vault</p>
        <p className="splash-loading-msg">Please wait as we load your gallery…</p>
        <div className="splash-progress">
          <div className="splash-progress-fill" style={{ width: `${fill}%` }} />
        </div>
      </div>
    </div>
  )
}

// ── FAB component ─────────────────────────────────────────────────────────────
const Fab: React.FC<{ onUpload: () => void }> = ({ onUpload }) => {
  const [open, setOpen] = useState(false)

  return (
    <div className="fab-container" id="fabContainer">
      {open && (
        <div className="fab-secondary-group visible">
          <div className="fab-secondary-item">
            <span className="fab-label">Filter</span>
            <button
              className="fab-sm"
              aria-label="Filter"
              onClick={() => {
                document.querySelector('.category-filters')?.scrollIntoView({ behavior: 'smooth' })
                setOpen(false)
              }}
            >
              <i className="fas fa-filter" />
            </button>
          </div>
          <div className="fab-secondary-item">
            <span className="fab-label">Top</span>
            <button
              className="fab-sm"
              aria-label="Scroll to top"
              onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setOpen(false) }}
            >
              <i className="fas fa-arrow-up" />
            </button>
          </div>
        </div>
      )}
      <button
        className={`fab-main${open ? ' open' : ''}`}
        aria-label="Upload new files"
        onClick={() => {
          if (open) { onUpload(); setOpen(false) } else setOpen(true)
        }}
      >
        <i className="fas fa-plus" />
      </button>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [splashDone, setSplashDone] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentLightboxItem, setCurrentLightboxItem] = useState<MediaItem | null>(null)

  const { setMediaItems, setCategories, setLoading, setError } = useGalleryStore()

  useEffect(() => {
    loadInitialData()
    // Online/offline detection
    window.addEventListener('online',  () => toast('Back online!', 'success', 3000))
    window.addEventListener('offline', () => toast('You are offline', 'warning', 5000))
    // Pause videos when tab is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) document.querySelectorAll('video').forEach(v => { if (!v.paused) v.pause() })
    })
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/galleryData.json')
      const data = await res.json()

      const transformed = data.map((item: any) => ({
        ...item,
        id: item.filename,
        url: `/created/${item.filename}`,
        file_size: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      setMediaItems(transformed)
      setCategories([
        { id: '1', name: 'Landscape',     color: '#3B82F6', created_at: new Date().toISOString() },
        { id: '2', name: 'Night',         color: '#1F2937', created_at: new Date().toISOString() },
        { id: '3', name: 'Video',         color: '#EF4444', created_at: new Date().toISOString() },
        { id: '4', name: 'Uncategorized', color: '#6B7280', created_at: new Date().toISOString() },
      ])
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load gallery data')
      toast('Failed to load gallery data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleView = (item: MediaItem) => {
    setCurrentLightboxItem(item)
    setLightboxOpen(true)
  }

  const handleEdit   = (item: MediaItem) => console.log('Edit:', item)
  const handleDelete = (id: string) => console.log('Delete:', id)

  const handleSplashDone = () => {
    setSplashDone(true)
    setTimeout(() => toast('Welcome to NDS Archives! Tap any item to view it.', 'info'), 400)
  }

  return (
    <>
      {/* Splash */}
      <Splash onDone={handleSplashDone} />

      {/* Animated background */}
      <div className="bg-mesh" aria-hidden="true">
        <div className="mesh-orb orb-1" />
        <div className="mesh-orb orb-2" />
        <div className="mesh-orb orb-3" />
      </div>
      <div className="bg-grain" aria-hidden="true" />

      {/* Header */}
      <Header
        onUploadClick={() => setUploadModalOpen(true)}
        onSettingsClick={() => {}}
      />

      {/* Main gallery */}
      <main id="main-content">
        <Gallery
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
        />
      </main>

      {/* FAB */}
      <Fab onUpload={() => setUploadModalOpen(true)} />

      {/* Upload modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />

      {/* Lightbox */}
      <Lightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        currentItem={currentLightboxItem}
      />

      {/* Toast stack */}
      <div id="toastStack" className="toast-stack" aria-live="polite" aria-atomic="false" />
    </>
  )
}

export default App
